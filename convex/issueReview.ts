'use node';

import { GoogleGenAI } from '@google/genai';
import { v } from 'convex/values';
import { action } from './_generated/server';

const reviewIssueArgs = {
  mode: v.union(v.literal('scan'), v.literal('suggest')),

  suggestionType: v.optional(
    v.union(v.literal('verify'), v.literal('reject'))
  ),

  suggestionSubType: v.optional(v.string()),

  unitOfficerDepartment: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.string(),

  subcategory: v.optional(v.string()),
  location: v.optional(v.string()),

  images: v.optional(v.array(v.string())),

  // You can replace v.any() later with a strict duplicate-flags validator.
  duplicateFlags: v.optional(v.any()),
};

type ImageData = {
  data: string;
  mimeType: string;
};

/**
 * Downloads a remotely accessible image and converts it to base64.
 *
 * Important:
 * - Convex must be able to access the image URL.
 * - Local file:// and temporary blob: URLs will not work.
 */
async function imageUrlToBase64(url: string): Promise<ImageData | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;,]+);base64,(.+)$/);

      if (!match) {
        console.warn('Invalid base64 data URL received');
        return null;
      }

      return {
        mimeType: match[1] || 'image/jpeg',
        data: match[2],
      };
    }

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      console.warn(`Unsupported image URL protocol: ${url}`);
      return null;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch image: ${url}. Status: ${response.status}`
      );
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.startsWith('image/')) {
      console.warn(
        `Rejected non-image response from ${url}: ${contentType}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    // Prevent unexpectedly large Gemini payloads.
    const maxImageSizeBytes = 8 * 1024 * 1024;

    if (arrayBuffer.byteLength > maxImageSizeBytes) {
      console.warn(`Image exceeds 8 MB limit: ${url}`);
      return null;
    }

    return {
      data: Buffer.from(arrayBuffer).toString('base64'),
      mimeType: contentType.split(';')[0] || 'image/jpeg',
    };
  } catch (error) {
    console.error(`Unable to process image URL ${url}:`, error);
    return null;
  }
}

function createDuplicateSummary(duplicateFlags: any): string {
  if (!duplicateFlags?.hasDuplicateFlags) {
    return '';
  }

  let summary = `
[POTENTIAL DUPLICATE DETECTION WARNING]

This issue has potential duplicate reports submitted by the same citizen.

Number of duplicate reports: ${duplicateFlags.duplicateIssueCount ?? 0}
Duplicate groups: ${duplicateFlags.duplicateGroupCount ?? 0}

Similar issue groups:
`;

  for (const group of duplicateFlags.groups ?? []) {
    summary += `
- Group ${group.groupId ?? 'Unknown'}
  Duplicate level: ${group.metrics?.duplicateLevel ?? 'Possible'}
  Best duplicate score: ${group.metrics?.bestDuplicateScore ?? 0}%
  Minimum distance: ${group.metrics?.minimumDistanceMeters ?? 0} metres
  Current issue ID: ${group.currentIssue?.id ?? 'Current issue'}
  Similar issues:
`;

    for (const duplicateIssue of group.duplicateIssues ?? []) {
      summary += `    * Issue ID: ${
        duplicateIssue.id ?? 'Unknown'
      }, Title: "${duplicateIssue.title ?? 'Untitled'}", Category: "${
        duplicateIssue.category ?? 'Unknown'
      }", Status: "${
        duplicateIssue.status ?? 'Unknown'
      }"\n`;
    }
  }

  return summary;
}

function createScanPrompt(args: {
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
  duplicateSummary: string;
  hasImages: boolean;
}): string {
  return `
You are the CityCare AI Issue Reviewer, an assistant that supports municipal Unit Officers.

Your response is advisory only. Do not claim that an issue has been officially verified, rejected, reassigned, merged, or resolved. The Unit Officer must make the final decision.

UNIT OFFICER
Department: ${args.unitOfficerDepartment}

CITIZEN ISSUE
Title: ${args.title}
Description: ${args.description}
Current category: ${args.category}
Current subcategory: ${args.subcategory || 'Not provided'}
Reported location: ${args.location || 'Not provided'}
Citizen images included: ${args.hasImages ? 'Yes' : 'No'}

${args.duplicateSummary}

REVIEW REQUIREMENTS

1. Department and scope review
Determine whether the reported issue falls within the Unit Officer's department and operational scope.

2. Category review
Determine whether the current category and subcategory appropriately describe the issue.
Use one of these CityCare categories when suggesting a category:
- road
- electricity
- water
- sanitation
- drainage
- solid_waste
- public_health
- other

3. Priority review
Estimate operational priority using only:
- low
- medium
- high
- critical

Consider urgency, public disruption, affected population, infrastructure impact, and time sensitivity.

4. Safety review
Estimate safety risk using only:
- low
- medium
- high
- critical

5. Duplicate review
When duplicate information is supplied:
- assess whether the reports likely concern the same physical issue;
- recommend manual comparison or merging where appropriate;
- never state that merging has already happened;
- do not reject an issue solely because the similarity score is present.

6. Image review
When images are supplied:
- check whether they visually support the title and description;
- check whether the scene appears relevant to the stated civic category;
- identify obvious screenshots, unrelated uploads, stock-style images, severe manipulation, or visible inconsistencies;
- do not claim forensic certainty;
- describe the result as a visual consistency assessment, not definitive proof of authenticity.

When no images are supplied:
- set imageAuthentic to true;
- set imageAuthenticityReason to:
  "No citizen images were provided for visual consistency assessment."

7. Confidence
Return an integer from 0 to 100.
Lower confidence when details, images, location, or evidence are insufficient.

Return only one valid JSON object. Do not use Markdown, code fences, commentary, or text outside the JSON.

Required JSON structure:
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
  "reason": "Concise explanation based on the supplied report.",
  "actionRecommendation": "Recommended next step for the Unit Officer.",
  "imageAuthentic": true,
  "imageAuthenticityReason": "Visual consistency assessment and its limitations."
}
`.trim();
}

function createVerificationPrompt(args: {
  suggestionSubType?: string;
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
}): string {
  let instructions: string;

  switch (args.suggestionSubType) {
    case 'detailed':
      instructions = `
Write a detailed technical verification note of at least 25 words.
Mention relevant inspection observations, location checks, visible condition,
public-safety considerations, or operational parameters.
Do not invent an inspection result that was not supplied.
Phrase uncertain details as items for the officer to confirm.
`;
      break;

    case 'quick':
      instructions = `
Write a concise verification note containing 10 to 15 words.
Do not invent an on-site inspection or claim that work has already occurred.
`;
      break;

    default:
      instructions = `
Write a natural verification note containing approximately 15 to 20 words.
Do not invent an on-site inspection or unsupported evidence.
`;
      break;
  }

  return `
You are the CityCare AI Issue Reviewer.

Prepare a draft field note for a Unit Officer. This is editable suggested text and must not falsely claim that an inspection occurred.

UNIT OFFICER DEPARTMENT
${args.unitOfficerDepartment}

ISSUE
Title: ${args.title}
Description: ${args.description}
Category: ${args.category}
Subcategory: ${args.subcategory || 'Not provided'}
Location: ${args.location || 'Not provided'}

INSTRUCTIONS
${instructions}

Return only one valid JSON object:
{
  "suggestedVerificationComment": "Draft verification field note"
}
`.trim();
}

function getRejectionConfiguration(suggestionSubType?: string): {
  rejectionType: string;
  instructions: string;
} {
  switch (suggestionSubType) {
    case 'duplicate':
      return {
        rejectionType: 'Duplicate',
        instructions: `
Explain politely that the report appears to match an existing report.
Mention an existing ticket only when its identifier appears in the duplicate data.
Recommend linking or merging the report rather than claiming that it has already been merged.
`,
      };

    case 'spam':
      return {
        rejectionType: 'Spam / Fake',
        instructions: `
Explain that the supplied content appears irrelevant, fabricated, abusive, or unrelated to a valid civic issue.
Avoid accusing the citizen of intentional misconduct unless the evidence clearly supports it.
`,
      };

    case 'outside_jurisdiction':
      return {
        rejectionType: 'Outside Jurisdiction',
        instructions: `
Explain that the reported matter appears outside the department's or city's operational jurisdiction.
Politely recommend contacting the relevant authority without inventing a department name.
`,
      };

    case 'insufficient_evidence':
      return {
        rejectionType: 'Insufficient Evidence',
        instructions: `
Explain which information is insufficient and ask for a clearer description,
recognisable photographs, landmarks, or other relevant evidence.
`,
      };

    case 'invalid_location':
      return {
        rejectionType: 'Invalid Location',
        instructions: `
Explain that the submitted address or coordinates could not be reliably identified.
Ask the citizen to provide an accurate address, nearby landmark, or updated GPS position.
`,
      };

    default:
      return {
        rejectionType: 'Other',
        instructions: `
Explain clearly and respectfully why the report does not currently satisfy the review criteria.
Do not invent missing facts.
`,
      };
  }
}

function createRejectionPrompt(args: {
  suggestionSubType?: string;
  unitOfficerDepartment: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location?: string;
  duplicateSummary: string;
}): string {
  const configuration = getRejectionConfiguration(args.suggestionSubType);

  return `
You are the CityCare AI Issue Reviewer.

Prepare an editable rejection recommendation for a Unit Officer.
The recommendation must remain respectful, factual, specific, and understandable to a citizen.

UNIT OFFICER DEPARTMENT
${args.unitOfficerDepartment}

ISSUE
Title: ${args.title}
Description: ${args.description}
Category: ${args.category}
Subcategory: ${args.subcategory || 'Not provided'}
Location: ${args.location || 'Not provided'}

${args.duplicateSummary}

REJECTION TYPE
You must return exactly this value for suggestedRejectionType:
"${configuration.rejectionType}"

COMMENT REQUIREMENTS
- Write at least 12 words.
- Explain the reason clearly.
- State what the citizen can correct or do next when applicable.
- Do not claim that an administrative action has already occurred.
- Do not include information that was not provided.

Specific instructions:
${configuration.instructions}

Return only one valid JSON object:
{
  "suggestedRejectionType": "${configuration.rejectionType}",
  "suggestedRejectionComment": "Clear citizen-facing rejection draft"
}
`.trim();
}

function safelyParseGeminiJson(text: string): any {
  const cleanedText = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleanedText);
  } catch {
    console.error('Invalid Gemini JSON response:', cleanedText);
    throw new Error('Gemini returned an invalid JSON response.');
  }
}

export const reviewIssueWithGemini = action({
  args: reviewIssueArgs,

  handler: async (_ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured in the Convex environment.'
      );
    }

    if (args.mode === 'suggest' && !args.suggestionType) {
      throw new Error(
        'suggestionType is required when mode is "suggest".'
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const duplicateSummary = createDuplicateSummary(args.duplicateFlags);

    let prompt: string;

    if (args.mode === 'scan') {
      prompt = createScanPrompt({
        unitOfficerDepartment: args.unitOfficerDepartment,
        title: args.title,
        description: args.description,
        category: args.category,
        subcategory: args.subcategory,
        location: args.location,
        duplicateSummary,
        hasImages: Boolean(args.images?.length),
      });
    } else if (args.suggestionType === 'verify') {
      prompt = createVerificationPrompt({
        suggestionSubType: args.suggestionSubType,
        unitOfficerDepartment: args.unitOfficerDepartment,
        title: args.title,
        description: args.description,
        category: args.category,
        subcategory: args.subcategory,
        location: args.location,
      });
    } else {
      prompt = createRejectionPrompt({
        suggestionSubType: args.suggestionSubType,
        unitOfficerDepartment: args.unitOfficerDepartment,
        title: args.title,
        description: args.description,
        category: args.category,
        subcategory: args.subcategory,
        location: args.location,
        duplicateSummary,
      });
    }

    const contents: any[] = [prompt];

    // Images are required only for the full scan.
    // Verification/rejection drafts do not need to resend image payloads.
    if (args.mode === 'scan') {
      const imageUrls = (args.images ?? []).filter(Boolean).slice(0, 4);

      const processedImages = await Promise.all(
        imageUrls.map(imageUrlToBase64)
      );

      for (const image of processedImages) {
        if (!image) continue;

        contents.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType,
          },
        });
      }
    }

    try {
      const response = await ai.models.generateContent({
        // Keep this configurable because available model identifiers can change.
        model: process.env.GEMINI_REVIEW_MODEL || 'gemini-2.5-flash',
        contents,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error('Gemini returned an empty response.');
      }

      return safelyParseGeminiJson(responseText);
    } catch (error) {
      console.error('Gemini issue review failed:', error);

      if (error instanceof Error) {
        throw new Error(`Gemini review failed: ${error.message}`);
      }

      throw new Error('Gemini review failed for an unknown reason.');
    }
  },
});
