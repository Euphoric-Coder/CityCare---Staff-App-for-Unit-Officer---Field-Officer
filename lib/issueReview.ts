// 'use node';

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
});

export async function reviewIssueWithGemini({
  unitOfficerDepartment,
  title,
  description,
  category,
  subcategory,
  location,
}: {
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
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

Review if this issue belongs to the Unit Officer department.

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
  "actionRecommendation": "Recommended next step for Unit Officer"
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
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
