import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
});

async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length > 1) {
        const mimeType = parts[0].split(';')[0].split(':')[1] || 'image/jpeg';
        return { data: parts[1], mimeType };
      }
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image from URL: ${url}, status: ${response.status}`);
      return null;
    }
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('Empty result from FileReader'));
          return;
        }
        const parts = result.split(',');
        if (parts.length > 1) {
          resolve(parts[1]);
        } else {
          resolve(result);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });

    return {
      data: base64Data,
      mimeType,
    };
  } catch (error) {
    console.error(`Error converting image URL ${url} to base64:`, error);
    return null;
  }
}

export async function reviewIssueWithGemini({
  unitOfficerDepartment,
  title,
  description,
  category,
  subcategory,
  location,
  images = [],
}: {
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
  images?: string[];
}) {
  const prompt = `
You are CityCare AI Issue Reviewer.

Unit Officer Department: ${unitOfficerDepartment}

Issue Details:
Title: ${title}
Description: ${description}
Category: ${category}
Subcategory: ${subcategory ?? 'Not provided'}
Location: ${location ?? 'Not provided'}

Tasks:
1. Review if this issue belongs to the Unit Officer department.
2. Check if the current category is correct or if another category is more appropriate.
3. Review the attached images (if any) and verify if they are authentic and consistent with the issue title, description, and location details.
   - Look for visual evidence of the described problem (e.g., potholes, trash, broken streetlights).
   - Verify if they look like real, authentic photos taken by citizens in a physical environment, rather than generic stock photos, unrelated screenshots, AI-generated images, or completely irrelevant uploads.
   - If no images are provided, set imageAuthentic to true and imageAuthenticityReason to 'No citizen images provided for verification'.

Return ONLY valid JSON:
{
  "departmentMatch": true,
  "categoryMatch": true,
  "withinOfficerScope": true,
  "detectedCategory": "road",
  "suggestedCategory": "road",
  "suggestedSubcategory": "Pothole Repair",
  "priority": "high",
  "safetyRisk": "medium",
  "confidenceScore": 92,
  "reason": "Short explanation",
  "actionRecommendation": "Recommended next step for Unit Officer",
  "imageAuthentic": true,
  "imageAuthenticityReason": "Detailed analysis of image authenticity and visual evidence matching the description"
}
`;

  const contents: any[] = [prompt];

  // Limit to at most 4 images to avoid exceeding payload / memory limits
  const imagesToProcess = images.slice(0, 4);

  if (imagesToProcess && imagesToProcess.length > 0) {
    for (const imgUrl of imagesToProcess) {
      if (!imgUrl) continue;
      const parsedImage = await imageUrlToBase64(imgUrl);
      if (parsedImage) {
        contents.push({
          inlineData: {
            data: parsedImage.data,
            mimeType: parsedImage.mimeType,
          },
        });
      }
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: contents,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return JSON.parse(text);
}

