/**
 * Secure Google Gemini AI Integration for CityCare Mobile
 * 
 * Note: Direct client-side GoogleGenAI execution and environment-variable API keys
 * have been migrated to the secure Convex backend Node.js Action to prevent API key exposure.
 * 
 * Do NOT import GoogleGenAI or reference process.env.EXPO_PUBLIC_GEMINI_API_KEY on the client.
 * 
 * Components should consume the backend review service using:
 * ```ts
 * import { useAction } from 'convex/react';
 * import { api } from '../../convex/_generated/api';
 * 
 * const reviewIssueWithGemini = useAction(api.issueReview.reviewIssueWithGemini);
 * 
 * // Calling Scan Mode
 * const scanResult = await reviewIssueWithGemini({
 *   mode: 'scan',
 *   unitOfficerDepartment,
 *   title: issue.title,
 *   description: issue.description,
 *   category: issue.category,
 *   subcategory: issue.subcategory,
 *   location: issue.location,
 *   images: issue.images,
 *   duplicateFlags: duplicateFlags,
 * });
 * ```
 */
export const reviewIssueWithGemini = () => {
  throw new Error(
    'Direct client-side Gemini reviews are deprecated. Please use useAction(api.issueReview.reviewIssueWithGemini) instead.'
  );
};
