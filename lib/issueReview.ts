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
  mode,
  suggestionType,
  suggestionSubType,
  unitOfficerDepartment,
  title,
  description,
  category,
  subcategory,
  location,
  images = [],
  duplicateFlags,
}: {
  mode: 'scan' | 'suggest';
  suggestionType?: 'verify' | 'reject';
  suggestionSubType?: string;
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
  images?: string[];
  duplicateFlags?: any;
}) {
  let duplicateSummary = '';
  if (duplicateFlags && duplicateFlags.hasDuplicateFlags) {
    duplicateSummary = `
[POTENTIAL DUPLICATE DETECTION WARNING]:
This issue has potential duplicate reports submitted by the same citizen!
Number of duplicate reports: ${duplicateFlags.duplicateIssueCount || 0}
Duplicate groups: ${duplicateFlags.duplicateGroupCount || 0}
Here is a list of similar issues:
`;
    (duplicateFlags.groups || []).forEach((group: any) => {
      duplicateSummary += `- Group ${group.groupId} (Similarity: ${group.metrics?.duplicateLevel || 'Possible'}, best score: ${group.metrics?.bestDuplicateScore || 0}%):
  Current Issue ID: ${group.currentIssue?.id || 'This issue'}
  Similar Issues in this group:
`;
      (group.duplicateIssues || []).forEach((dup: any) => {
        duplicateSummary += `    * Issue ID: ${dup.id}, Title: "${dup.title}", Category: "${dup.category}", Status: "${dup.status}", Distance: ${group.metrics?.minimumDistanceMeters || 0}m away\n`;
      });
    });
  }

  let prompt = '';

  if (mode === 'scan') {
    prompt = `
You are CityCare AI Issue Reviewer.

Unit Officer Department: ${unitOfficerDepartment}

Issue Details:
Title: ${title}
Description: ${description}
Category: ${category}
Subcategory: ${subcategory ?? 'Not provided'}
Location: ${location ?? 'Not provided'}
${duplicateSummary}

Tasks:
1. Review if this issue belongs to the Unit Officer department.
2. Check if the current category is correct or if another category is more appropriate.
3. Review the duplicate warnings if present. If there are duplicates, recommend merging them or addressing the duplicate status in the action recommendation.
4. Review the attached images (if any) and verify if they are authentic and consistent with the issue title, description, and location details.
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
  } else {
    // Mode is suggest
    if (suggestionType === 'verify') {
      let subtypeInstructions = '';
      if (suggestionSubType === 'detailed') {
        subtypeInstructions = 'Write a detailed technical verification comment (at least 25 words) that notes specific site checklists, inspection parameters, or safety verifications.';
      } else if (suggestionSubType === 'quick') {
        subtypeInstructions = 'Write a very brief and concise verification note (10 to 15 words max) confirming the issue status and location inspection.';
      } else {
        subtypeInstructions = 'Write a standard, natural verification comment (15 to 20 words) explaining that the issue has been successfully verified upon checking the site location and details.';
      }

      prompt = `
You are CityCare AI Issue Reviewer.

Unit Officer Department: ${unitOfficerDepartment}

Issue Details:
Title: ${title}
Description: ${description}
Category: ${category}
Subcategory: ${subcategory ?? 'Not provided'}
Location: ${location ?? 'Not provided'}

Tasks:
Provide a suggested verification comment (Field Notes) conforming to the following guideline:
${subtypeInstructions}

Return ONLY valid JSON:
{
  "suggestedVerificationComment": "Draft field notes for verification here"
}
`;
    } else {
      // Rejection
      let reasonType = 'Spam / Fake';
      let subtypeInstructions = '';
      
      if (suggestionSubType === 'duplicate') {
        reasonType = 'Duplicate';
        subtypeInstructions = `This report has been identified as a duplicate. Use the duplicate detection summary to draft a polite message explaining that another report is already open for this issue, referencing the previous ticket if available (e.g. 'This issue is already reported in ticket #X, merging it...').`;
      } else if (suggestionSubType === 'spam') {
        reasonType = 'Spam / Fake';
        subtypeInstructions = 'This report contains fake, irrelevant, or spam information. Draft a warning comment explaining that false reports are not accepted.';
      } else if (suggestionSubType === 'outside_jurisdiction') {
        reasonType = 'Outside Jurisdiction';
        subtypeInstructions = 'This report is outside the jurisdiction/scope of our city services or department. Draft a comment politely directing the citizen to the correct channel.';
      } else if (suggestionSubType === 'insufficient_evidence') {
        reasonType = 'Insufficient Evidence';
        subtypeInstructions = 'The report has insufficient photos or descriptive details. Draft a comment asking the citizen to re-submit with clear photos showing the issue.';
      } else if (suggestionSubType === 'invalid_location') {
        reasonType = 'Invalid Location';
        subtypeInstructions = 'The GPS coordinates or address are invalid or unverifiable. Draft a comment asking the citizen to re-submit with accurate GPS location details.';
      } else {
        reasonType = 'Other';
        subtypeInstructions = 'Draft a general rejection comment explaining the issue details do not meet criteria.';
      }

      prompt = `
You are CityCare AI Issue Reviewer.

Unit Officer Department: ${unitOfficerDepartment}

Issue Details:
Title: ${title}
Description: ${description}
Category: ${category}
Subcategory: ${subcategory ?? 'Not provided'}
Location: ${location ?? 'Not provided'}
${duplicateSummary}

Tasks:
1. Rejection Recommendation: You MUST output exactly "${reasonType}" for suggestedRejectionType.
2. Rejection Draft: Write a clear rejection draft comment of at least 12 words explaining the rationale to the citizen:
   - Specific guideline: ${subtypeInstructions}

Return ONLY valid JSON:
{
  "suggestedRejectionType": "${reasonType}",
  "suggestedRejectionComment": "Detailed draft comment explaining rejection here"
}
`;
    }
  }

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

