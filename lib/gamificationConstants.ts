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

export type BadgeCategory =
  | "reporting"
  | "resolution"
  | "community"
  | "streak"
  | "quality"
  | "special";

export type BadgeCriteriaType =
  | "reports_submitted"
  | "video_evidence_added"
  | "reports_verified"
  | "reports_resolved"
  | "comments_added"
  | "upvotes_received"
  | "current_streak"
  | "longest_streak"
  | "points_reached"
  | "manual";

export const CITIZEN_LEVELS = [
  { level: 1, title: "New Citizen", min: 0 },
  { level: 2, title: "Civic Starter", min: 50 },
  { level: 3, title: "Local Reporter", min: 150 },
  { level: 4, title: "Civic Contributor", min: 300 },
  { level: 5, title: "Community Guardian", min: 600 },
  { level: 6, title: "City Helper", min: 1000 },
  { level: 7, title: "Civic Supporter", min: 1500 },
  { level: 8, title: "Neighborhood Watcher", min: 2200 },
  { level: 9, title: "Ward Contributor", min: 3000 },
  { level: 10, title: "City Reporter", min: 4000 },

  { level: 11, title: "Trusted Citizen", min: 5200 },
  { level: 12, title: "Verified Contributor", min: 6600 },
  { level: 13, title: "Civic Messenger", min: 8200 },
  { level: 14, title: "Public Helper", min: 10000 },
  { level: 15, title: "Community Builder", min: 12000 },
  { level: 16, title: "Issue Resolver", min: 14500 },
  { level: 17, title: "Civic Advocate", min: 17200 },
  { level: 18, title: "Urban Volunteer", min: 20200 },
  { level: 19, title: "Local Guardian", min: 23500 },
  { level: 20, title: "Ward Champion", min: 27000 },

  { level: 21, title: "Civic Leader", min: 31000 },
  { level: 22, title: "Public Voice", min: 35500 },
  { level: 23, title: "City Watch Leader", min: 40500 },
  { level: 24, title: "Urban Protector", min: 46000 },
  { level: 25, title: "Community Hero", min: 52000 },
  { level: 26, title: "Citizen Mentor", min: 58500 },
  { level: 27, title: "Civic Strategist", min: 65500 },
  { level: 28, title: "Resolution Partner", min: 73000 },
  { level: 29, title: "Public Welfare Ally", min: 81000 },
  { level: 30, title: "City Hero", min: 90000 },

  { level: 31, title: "Civic Guardian", min: 100000 },
  { level: 32, title: "Urban Excellence Leader", min: 111000 },
  { level: 33, title: "Community Sentinel", min: 123000 },
  { level: 34, title: "Public Impact Leader", min: 136000 },
  { level: 35, title: "City Transformation Ally", min: 150000 },
  { level: 36, title: "Civic Excellence Champion", min: 165000 },
  { level: 37, title: "Urban Change Maker", min: 181000 },
  { level: 38, title: "Public Trust Champion", min: 198000 },
  { level: 39, title: "Civic Impact Champion", min: 216000 },
  { level: 40, title: "City Champion", min: 235000 },

  { level: 41, title: "Urban Legend", min: 255000 },
  { level: 42, title: "Civic Master", min: 277000 },
  { level: 43, title: "Public Service Icon", min: 301000 },
  { level: 44, title: "CityCare Elite", min: 327000 },
  { level: 45, title: "Civic Pillar", min: 355000 },
  { level: 46, title: "Urban Visionary", min: 385000 },
  { level: 47, title: "People's Champion", min: 418000 },
  { level: 48, title: "CityCare Legend", min: 454000 },
  { level: 49, title: "Civic Icon", min: 493000 },
  { level: 50, title: "Urban Leader Supreme", min: 535000 },

  { level: 51, title: "Civic Pathfinder", min: 580000 },
  { level: 52, title: "Urban Reform Ally", min: 628000 },
  { level: 53, title: "Community Excellence Guide", min: 680000 },
  { level: 54, title: "City Improvement Leader", min: 735000 },
  { level: 55, title: "Public Service Champion", min: 795000 },
  { level: 56, title: "Civic Mission Leader", min: 859000 },
  { level: 57, title: "Urban Progress Partner", min: 928000 },
  { level: 58, title: "Community Impact Hero", min: 1002000 },
  { level: 59, title: "CityCare Vanguard", min: 1081000 },
  { level: 60, title: "Civic Excellence Hero", min: 1165000 },

  { level: 61, title: "Public Trust Leader", min: 1255000 },
  { level: 62, title: "Urban Progress Champion", min: 1351000 },
  { level: 63, title: "Citizen Excellence Mentor", min: 1453000 },
  { level: 64, title: "Civic Transformation Leader", min: 1561000 },
  { level: 65, title: "Community Legacy Builder", min: 1676000 },
  { level: 66, title: "CityCare Honor Leader", min: 1798000 },
  { level: 67, title: "Urban Trust Guardian", min: 1927000 },
  { level: 68, title: "Public Welfare Champion", min: 2064000 },
  { level: 69, title: "Civic Legacy Guardian", min: 2209000 },
  { level: 70, title: "CityCare Grand Champion", min: 2362000 },

  { level: 71, title: "Urban Service Master", min: 2524000 },
  { level: 72, title: "Civic Honor Champion", min: 2695000 },
  { level: 73, title: "Community Trust Icon", min: 2875000 },
  { level: 74, title: "Public Impact Master", min: 3065000 },
  { level: 75, title: "CityCare Luminary", min: 3265000 },
  { level: 76, title: "Urban Governance Ally", min: 3476000 },
  { level: 77, title: "Civic Service Legend", min: 3698000 },
  { level: 78, title: "People's Welfare Icon", min: 3932000 },
  { level: 79, title: "Community Legacy Icon", min: 4179000 },
  { level: 80, title: "Urban Excellence Legend", min: 4439000 },

  { level: 81, title: "Civic Supreme Guardian", min: 4713000 },
  { level: 82, title: "CityCare Mastermind", min: 5002000 },
  { level: 83, title: "Public Service Legend", min: 5307000 },
  { level: 84, title: "Urban Impact Icon", min: 5629000 },
  { level: 85, title: "Community Supreme Leader", min: 5969000 },
  { level: 86, title: "Civic Nation Builder", min: 6328000 },
  { level: 87, title: "CityCare Supreme Champion", min: 6707000 },
  { level: 88, title: "Urban Transformation Icon", min: 7107000 },
  { level: 89, title: "Public Trust Legend", min: 7529000 },
  { level: 90, title: "Civic Grandmaster", min: 7974000 },

  { level: 91, title: "CityCare Eternal Guardian", min: 8444000 },
  { level: 92, title: "Urban Legacy Master", min: 8940000 },
  { level: 93, title: "Community Supreme Icon", min: 9463000 },
  { level: 94, title: "Civic Impact Grandmaster", min: 10015000 },
  { level: 95, title: "Public Service Supreme", min: 10597000 },
  { level: 96, title: "CityCare Immortal Champion", min: 11211000 },
  { level: 97, title: "Urban Welfare Supreme", min: 11859000 },
  { level: 98, title: "Civic Legacy Supreme", min: 12543000 },
  { level: 99, title: "CityCare Mythic Icon", min: 13265000 },
  { level: 100, title: "Supreme Civic Legend", min: 14026000 },
] as const;

type CitizenLevel = (typeof CITIZEN_LEVELS)[number];

export function calculateCitizenLevel(points: number) {
  const safePoints = Math.max(0, points);

  let currentLevel: CitizenLevel = CITIZEN_LEVELS[0];

  for (const level of CITIZEN_LEVELS) {
    if (safePoints >= level.min) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const nextLevel = CITIZEN_LEVELS.find(
    (level) => level.level === currentLevel.level + 1
  );

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentLevelMin: currentLevel.min,
    nextLevelMin: nextLevel ? nextLevel.min : null,
    pointsToNextLevel: nextLevel ? nextLevel.min - safePoints : 0,
    progressPercentage: nextLevel
      ? Math.min(
          100,
          Math.round(
            ((safePoints - currentLevel.min) /
              (nextLevel.min - currentLevel.min)) *
              100
          )
        )
      : 100,
  };
}