export const POINT_RULES = {
  issue_submitted: 5,
  video_evidence_added: 5,

  issue_verified: 20,
  issue_assigned: 5,
  issue_resolved: 40,
  issue_closed: 20,

  comment_added: 2,
  comment_liked: 1,
  report_upvoted: 2,

  streak_bonus: 10,
  badge_bonus: 25,

  duplicate_report: -5,
  issue_rejected: -15,
  issue_withdrawn: -5,
  manual_adjustment: 0,
} as const;

export type PointTransactionType = keyof typeof POINT_RULES;

export function calculateCitizenLevel(points: number) {
  if (points >= 2500) {
    return {
      level: 8,
      title: "Urban Leader",
      currentLevelMin: 2500,
      nextLevelMin: null,
    };
  }

  if (points >= 1500) {
    return {
      level: 7,
      title: "Civic Champion",
      currentLevelMin: 1500,
      nextLevelMin: 2500,
    };
  }

  if (points >= 1000) {
    return {
      level: 6,
      title: "City Hero",
      currentLevelMin: 1000,
      nextLevelMin: 1500,
    };
  }

  if (points >= 600) {
    return {
      level: 5,
      title: "Community Guardian",
      currentLevelMin: 600,
      nextLevelMin: 1000,
    };
  }

  if (points >= 300) {
    return {
      level: 4,
      title: "Civic Contributor",
      currentLevelMin: 300,
      nextLevelMin: 600,
    };
  }

  if (points >= 150) {
    return {
      level: 3,
      title: "Local Reporter",
      currentLevelMin: 150,
      nextLevelMin: 300,
    };
  }

  if (points >= 50) {
    return {
      level: 2,
      title: "Civic Starter",
      currentLevelMin: 50,
      nextLevelMin: 150,
    };
  }

  return {
    level: 1,
    title: "New Citizen",
    currentLevelMin: 0,
    nextLevelMin: 50,
  };
}