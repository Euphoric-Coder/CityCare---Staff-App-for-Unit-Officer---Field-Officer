import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export function isDemoSeedEmail(email?: string | null): boolean {
  const value = String(email || "").trim().toLowerCase();
  return (
    value === "system.admin.demo@citycare.local" ||
    value.endsWith(".demo@citycare.local")
  );
}

export const getDemoUsersForPasswordRepair = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((user) => isDemoSeedEmail(user.email))
      .map((user) => ({
        _id: user._id,
        email: user.email,
        password: user.password,
      }));
  },
});

export const applyDemoPasswordRepair = internalMutation({
  args: {
    userIds: v.array(v.id("users")),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    let repaired = 0;
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user || !isDemoSeedEmail(user.email)) {
        continue;
      }
      await ctx.db.patch(userId, {
        password: args.passwordHash,
      });
      repaired++;
    }
    return {
      success: true,
      repaired,
    };
  },
});

interface CityConfig {
  city: string;
  state: string;
  district: string;
  postal: string;
  center: { latitude: number; longitude: number };
  areas: string[];
}

const DEMO_CITIES: Record<string, CityConfig> = {
  varanasi: {
    city: "Varanasi",
    state: "Uttar Pradesh",
    district: "Varanasi",
    postal: "221001",
    center: { latitude: 25.3176, longitude: 82.9739 },
    areas: ["Lanka", "Sigra", "Bhelupur", "Godowlia", "Cantonment", "Shivpur", "Mahmoorganj", "Assi"],
  },
  mumbai: {
    city: "Mumbai",
    state: "Maharashtra",
    district: "Mumbai",
    postal: "400001",
    center: { latitude: 19.0760, longitude: 72.8777 },
    areas: ["Andheri", "Bandra", "Dadar", "Powai", "Kurla", "Colaba", "Borivali", "Goregaon"],
  },
};

const DEPARTMENTS = [
  "road",
  "electricity",
  "water",
  "sanitation",
  "drainage",
  "solid_waste",
  "public_health",
  "other",
];

const DEPARTMENT_LABELS: Record<string, string> = {
  road: "Road & Infrastructure",
  electricity: "Electricity & Lighting",
  water: "Water Supply",
  sanitation: "Public Sanitation",
  drainage: "Drainage & Sewerage",
  solid_waste: "Solid Waste Management",
  public_health: "Public Health",
  other: "General Civic Maintenance",
};

const DEPARTMENT_PREFIXES: Record<string, string> = {
  road: "RD",
  electricity: "EL",
  water: "WT",
  sanitation: "SN",
  drainage: "DR",
  solid_waste: "SW",
  public_health: "PH",
  other: "OT",
};

const SPECIALISATIONS: Record<string, string[]> = {
  road: ["Pothole Repair", "Road Surface Repair", "Footpath Maintenance"],
  electricity: ["Street Lighting", "Electrical Faults", "Public Lighting"],
  water: ["Water Leakage", "Pipeline Repair", "Water Supply"],
  sanitation: ["Public Sanitation", "Drain Cleaning", "Hygiene"],
  drainage: ["Storm Drainage", "Sewer Blockage", "Waterlogging"],
  solid_waste: ["Waste Collection", "Garbage Removal", "Dumping Cleanup"],
  public_health: ["Public Health Hazard", "Vector Control", "Community Health"],
  other: ["General Civic Maintenance"],
};

const ISSUE_TEMPLATES: Record<string, string[]> = {
  road: [
    "Large pothole causing traffic disruption",
    "Damaged road surface near junction",
    "Broken footpath requiring repair",
    "Uneven asphalt on main road",
  ],
  electricity: [
    "Streetlight not functioning",
    "Exposed electrical wiring on pole",
    "Repeated lighting failure in residential area",
    "Flickering street lamps near crossing",
  ],
  water: [
    "Water pipeline leakage causing waste",
    "Irregular water supply reported",
    "Public water tap connection damaged",
    "Contaminated water supply issue",
  ],
  sanitation: [
    "Public toilet requires urgent sanitation",
    "Drain-side hygiene issue reported",
    "Unsanitary public market area",
    "Lack of public cleaning in commercial zone",
  ],
  drainage: [
    "Blocked storm drain causing overflow",
    "Waterlogging near main junction",
    "Sewer overflow reported in residential alley",
    "Choked drainage line requiring desilting",
  ],
  solid_waste: [
    "Garbage accumulation at roadside corner",
    "Missed waste collection for 3 days",
    "Illegal waste dumping near public park",
    "Overflowing community garbage bin",
  ],
  public_health: [
    "Mosquito breeding hotspot in stagnant water",
    "Public health hazard near open drain",
    "Stagnant water health concern",
    "Unclean public dumping area health risk",
  ],
  other: [
    "Damaged civic infrastructure fence",
    "Public facility maintenance required",
    "Broken boundary wall near public space",
    "Signage board damaged on main avenue",
  ],
};

function offsetCoordinates(baseLat: number, baseLng: number, index: number) {
  const offsets = [
    [0.002, 0.001],
    [-0.003, 0.002],
    [0.004, -0.002],
    [-0.002, -0.003],
    [0.005, 0.003],
    [-0.004, 0.004],
    [0.001, -0.004],
    [-0.005, 0.001],
  ];
  const [latOffset, lngOffset] = offsets[index % offsets.length];
  return {
    latitude: Number((baseLat + latOffset).toFixed(6)),
    longitude: Number((baseLng + lngOffset).toFixed(6)),
  };
}

export const seedDemoDataOnce = internalMutation({
  args: {
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    let systemAdminCreated = false;
    let systemAdminUserId: Id<"users">;

    // 1. Ensure System Admin
    const existingAdminUser = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdminUser) {
      systemAdminUserId = existingAdminUser._id;
    } else {
      const adminEmail = "system.admin.demo@citycare.local";
      const existingEmailUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", adminEmail))
        .first();

      if (existingEmailUser) {
        systemAdminUserId = existingEmailUser._id;
      } else {
        systemAdminUserId = await ctx.db.insert("users", {
          fullName: "CityCare Demo System Admin",
          email: adminEmail,
          password: args.passwordHash,
          role: "admin",
          createdAt: new Date(now).toISOString(),
        });
        systemAdminCreated = true;
      }
    }

    const citySummaryResults: Record<string, any> = {};
    let totalCreatedAcrossAllCities = 0;

    // 2. Seed City Data (Varanasi & Mumbai)
    for (const [cityKey, cityConfig] of Object.entries(DEMO_CITIES)) {
      const city = cityConfig.city;

      // Check existing city baseline
      const existingUOs = await ctx.db
        .query("unitOfficers")
        .withIndex("by_city", (q) => q.eq("city", city))
        .collect();

      const existingFOs = await ctx.db
        .query("fieldOfficers")
        .withIndex("by_city", (q) => q.eq("city", city))
        .collect();

      const existingCityAdmin = await ctx.db
        .query("cityAdmins")
        .withIndex("by_city", (q) => q.eq("city", city))
        .first();

      const existingIssues = await ctx.db
        .query("issues")
        .withIndex("by_city", (q) => q.eq("city", city))
        .collect();

      let cityAdminCreated = false;
      let unitOfficersCreated = 0;
      let fieldOfficersCreated = 0;
      let citizensCreated = 0;
      let issuesCreated = 0;

      // --- A. City Admin ---
      let cityAdminUserId: Id<"users">;
      let cityAdminProfileId: Id<"cityAdmins"> | null = existingCityAdmin ? existingCityAdmin._id : null;

      const caEmail = `cityadmin.${cityKey}.demo@citycare.local`;
      let caUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", caEmail))
        .first();

      if (!caUser) {
        cityAdminUserId = await ctx.db.insert("users", {
          fullName: `Demo City Admin - ${city}`,
          email: caEmail,
          password: args.passwordHash,
          role: "city_admin",
          createdAt: new Date(now).toISOString(),
        });
      } else {
        cityAdminUserId = caUser._id;
      }

      if (!existingCityAdmin) {
        cityAdminProfileId = await ctx.db.insert("cityAdmins", {
          userId: cityAdminUserId,
          fullName: `Demo City Admin - ${city}`,
          email: caEmail,
          phone: `+9198765${cityKey === "varanasi" ? "00001" : "00002"}`,
          state: cityConfig.state,
          city: cityConfig.city,
          managedUnitOfficers: [],
          managedFieldOfficers: [],
          mustChangePassword: false,
          totalIssuesInCity: 0,
          issuesResolved: 0,
          issuesPending: 0,
          avgResolutionTime: 0,
          slaComplianceRate: 0,
          createdAt: now,
          createdBy: systemAdminUserId,
          notes: "Automatically created CityCare demo account.",
        });
        cityAdminCreated = true;
      }

      // --- B. Unit Officers (1 per department) ---
      const uoProfileMap = new Map<string, { profileId: Id<"unitOfficers">; userId: Id<"users"> }>();

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const uoEmail = `uo.${dept}.${cityKey}.demo@citycare.local`;

        let uoUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", uoEmail))
          .first();

        let uoUserId: Id<"users">;
        if (!uoUser) {
          uoUserId = await ctx.db.insert("users", {
            fullName: `${DEPARTMENT_LABELS[dept]} Unit Officer - ${city}`,
            email: uoEmail,
            password: args.passwordHash,
            role: "unit_officer",
            createdAt: new Date(now).toISOString(),
          });
        } else {
          uoUserId = uoUser._id;
        }

        let uoProfile = await ctx.db
          .query("unitOfficers")
          .withIndex("by_user", (q) => q.eq("userId", uoUserId))
          .first();

        if (!uoProfile) {
          const uoProfId = await ctx.db.insert("unitOfficers", {
            userId: uoUserId,
            fullName: `${DEPARTMENT_LABELS[dept]} Unit Officer - ${city}`,
            email: uoEmail,
            phone: `+9198765${cityKey === "varanasi" ? "1" : "2"}${String(dIdx + 1).padStart(4, "0")}`,
            state: cityConfig.state,
            city: cityConfig.city,
            district: cityConfig.district,
            department: dept,
            totalVerifiedIssues: 0,
            totalRejectedIssues: 0,
            avgResolutionTime: 0,
            accountApproved: true,
            rating: 0,
            efficiencyScore: 0,
            assignedFieldOfficers: [],
            activeIssueIds: [],
            resolvedIssueIds: [],
            mustChangePassword: false,
          });
          unitOfficersCreated++;
          uoProfileMap.set(dept, { profileId: uoProfId, userId: uoUserId });
        } else {
          uoProfileMap.set(dept, { profileId: uoProfile._id, userId: uoUserId });
        }
      }

      // --- C. Field Officers (2 per department) ---
      const foProfileMap = new Map<string, Array<{ profileId: Id<"fieldOfficers">; userId: Id<"users"> }>>();

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const uoData = uoProfileMap.get(dept);
        const foListForDept: Array<{ profileId: Id<"fieldOfficers">; userId: Id<"users"> }> = [];

        for (let fIdx = 1; fIdx <= 2; fIdx++) {
          const foEmail = `fo.${dept}.0${fIdx}.${cityKey}.demo@citycare.local`;

          let foUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", foEmail))
            .first();

          let foUserId: Id<"users">;
          if (!foUser) {
            foUserId = await ctx.db.insert("users", {
              fullName: `${DEPARTMENT_LABELS[dept]} Field Officer 0${fIdx} - ${city}`,
              email: foEmail,
              password: args.passwordHash,
              role: "field_officer",
              createdAt: new Date(now).toISOString(),
            });
          } else {
            foUserId = foUser._id;
          }

          let foProfile = await ctx.db
            .query("fieldOfficers")
            .withIndex("by_user", (q) => q.eq("userId", foUserId))
            .first();

          let foProfileId: Id<"fieldOfficers">;

          if (!foProfile) {
            foProfileId = await ctx.db.insert("fieldOfficers", {
              userId: foUserId,
              fullName: `${DEPARTMENT_LABELS[dept]} Field Officer 0${fIdx} - ${city}`,
              email: foEmail,
              phone: `+9198764${cityKey === "varanasi" ? "1" : "2"}${String(dIdx * 2 + fIdx).padStart(4, "0")}`,
              state: cityConfig.state,
              city: cityConfig.city,
              district: cityConfig.district,
              department: dept,
              specialisations: SPECIALISATIONS[dept] || ["General Civic Maintenance"],
              reportingUnitOfficerId: uoData?.profileId,
              currentActiveIssues: 0,
              maxIssueCapacity: 10,
              assignedIssueIds: [],
              completedIssueIds: [],
              totalResolvedIssues: 0,
              avgResolutionTime: 0,
              onTimeCompletionRate: 0,
              accountApproved: true,
              rating: 0,
              efficiencyScore: 0,
              mustChangePassword: false,
            });
            fieldOfficersCreated++;
          } else {
            foProfileId = foProfile._id;
            if (uoData && String(foProfile.reportingUnitOfficerId) !== String(uoData.profileId)) {
              await ctx.db.patch(foProfile._id, {
                reportingUnitOfficerId: uoData.profileId,
              });
            }
          }

          foListForDept.push({ profileId: foProfileId, userId: foUserId });
        }

        foProfileMap.set(dept, foListForDept);

        // Update UO's assignedFieldOfficers array
        if (uoData) {
          const uoDoc = await ctx.db.get(uoData.profileId);
          if (uoDoc) {
            const currentFoIds = (uoDoc.assignedFieldOfficers || []).map(String);
            const newFoIds = foListForDept.map((f) => String(f.profileId));
            const merged = Array.from(new Set([...currentFoIds, ...newFoIds])) as Id<"fieldOfficers">[];

            await ctx.db.patch(uoData.profileId, {
              assignedFieldOfficers: merged,
            });
          }
        }
      }

      // --- D. Dummy Citizens (3 per city) ---
      const citizenUserIds: Id<"users">[] = [];

      for (let cIdx = 1; cIdx <= 3; cIdx++) {
        const citizenEmail = `citizen.${cityKey}.0${cIdx}.demo@citycare.local`;

        let citUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", citizenEmail))
          .first();

        let citUserId: Id<"users">;
        if (!citUser) {
          citUserId = await ctx.db.insert("users", {
            fullName: `Demo Citizen ${city} 0${cIdx}`,
            email: citizenEmail,
            password: args.passwordHash,
            role: "citizen",
            createdAt: new Date(now).toISOString(),
          });
        } else {
          citUserId = citUser._id;
        }

        let citProfile = await ctx.db
          .query("citizens")
          .withIndex("by_user", (q) => q.eq("userId", citUserId))
          .first();

        const areaName = cityConfig.areas[cIdx - 1] || "Central";
        const coords = offsetCoordinates(cityConfig.center.latitude, cityConfig.center.longitude, cIdx);

        if (!citProfile) {
          await ctx.db.insert("citizens", {
            userId: citUserId,
            fullName: `Demo Citizen ${city} 0${cIdx}`,
            email: citizenEmail,
            phone: `+9198763${cityKey === "varanasi" ? "1" : "2"}${String(cIdx).padStart(4, "0")}`,
            city: cityConfig.city,
            state: cityConfig.state,
            region: areaName,
            postal: cityConfig.postal,
            fullAddress: `${areaName}, ${cityConfig.city}, ${cityConfig.state} ${cityConfig.postal}`,
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            points: 0,
            level: 1,
            levelTitle: "Civic Starter",
            badgeCount: 0,
            reportsSubmitted: 0,
            reportsVerified: 0,
            reportsResolved: 0,
            reportsRejected: 0,
            duplicateReports: 0,
            commentsAdded: 0,
            upvotesReceived: 0,
            videoEvidenceAdded: 0,
            currentStreak: 0,
            longestStreak: 0,
            createdAt: now,
            updatedAt: now,
          });
          citizensCreated++;
        }

        citizenUserIds.push(citUserId);
      }

      // --- E. Dummy Issues (32 per city: 4 per department) ---
      const statusCycle = [
        "pending",
        "verified",
        "assigned",
        "in_progress",
        "pending_uo_verification",
        "rework_required",
        "resolved",
        "closed",
        "rejected",
      ];

      const priorities: Array<"low" | "medium" | "high" | "critical"> = [
        "medium",
        "high",
        "low",
        "medium",
        "critical",
        "medium",
        "high",
        "low",
      ];

      let cityIssueCounter = 0;

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const deptPrefix = DEPARTMENT_PREFIXES[dept] || "OT";
        const cityCodePrefix = cityKey === "varanasi" ? "VNS" : "MUM";
        const templates = ISSUE_TEMPLATES[dept] || ["Civic maintenance required"];

        const uoData = uoProfileMap.get(dept);
        const foList = foProfileMap.get(dept) || [];

        for (let iIdx = 1; iIdx <= 4; iIdx++) {
          cityIssueCounter++;
          const issueCode = `DEMO-${cityCodePrefix}-${deptPrefix}-${String(iIdx).padStart(3, "0")}`;

          // Check if issue already exists
          const existingIssue = await ctx.db
            .query("issues")
            .withIndex("by_issue_code", (q) => q.eq("issueCode", issueCode))
            .first();

          if (existingIssue) {
            continue;
          }

          const templateTitle = templates[(iIdx - 1) % templates.length];
          const areaName = cityConfig.areas[(cityIssueCounter - 1) % cityConfig.areas.length];
          const coords = offsetCoordinates(cityConfig.center.latitude, cityConfig.center.longitude, cityIssueCounter);
          const mapUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
          const citizenUserId = citizenUserIds[(cityIssueCounter - 1) % citizenUserIds.length];
          const priority = priorities[(cityIssueCounter - 1) % priorities.length];

          // Deterministic status selection
          let status = statusCycle[(cityIssueCounter - 1) % statusCycle.length];
          let isEscalated = false;

          // Make issue #15 escalated
          if (cityIssueCounter === 15) {
            status = "escalated";
            isEscalated = true;
          }

          const dayOffset = 5 + (cityIssueCounter * 2.5); // Spread over past 90 days
          const createdAt = now - dayOffset * DAY;
          const assignedAt = createdAt + 2 * 60 * 60 * 1000;
          const workStartedAt = assignedAt + 4 * 60 * 60 * 1000;

          // SLA Deadline logic
          let slaDeadline: number | null = null;
          let slaBreached = false;

          if (["verified", "assigned", "in_progress", "pending_uo_verification", "rework_required", "escalated"].includes(status)) {
            if (cityIssueCounter % 3 === 0) {
              slaDeadline = now - 1 * DAY; // Overdue / breached
              slaBreached = true;
            } else if (cityIssueCounter % 3 === 1) {
              slaDeadline = now + 12 * 60 * 60 * 1000; // Due soon
            } else {
              slaDeadline = now + 3 * DAY; // On track
            }
          }

          // Select Officers
          const assignedUOUserId = ["pending"].includes(status) ? null : uoData?.userId ?? null;
          const assignedFOData = foList[(iIdx - 1) % foList.length];
          const assignedFOUserId = ["pending", "verified"].includes(status) ? null : assignedFOData?.userId ?? null;

          // Completion timestamps & feedback
          let resolvedAt: number | null = null;
          let closedAt: number | null = null;
          let citizenRating: number | null = null;
          let citizenFeedback: string | null = null;

          if (["resolved", "closed"].includes(status)) {
            resolvedAt = createdAt + 2 * DAY;
            slaDeadline = createdAt + 3 * DAY;
            slaBreached = false;

            if (status === "closed") {
              closedAt = resolvedAt + 12 * 60 * 60 * 1000;
            }

            // Ratings for selected resolved issues
            const ratings = [4.5, 5.0, 3.5, 4.0];
            citizenRating = ratings[(cityIssueCounter - 1) % ratings.length];
            citizenFeedback = "Work was completed promptly and satisfactorily. Thank you!";
          }

          let rejectionData: any = undefined;
          if (status === "rejected") {
            rejectionData = {
              reason: "Insufficient Evidence",
              comment: "The submitted evidence was insufficient for civic action.",
              rejectedBy: uoData?.userId ?? systemAdminUserId,
              rejectedAt: createdAt + 1 * DAY,
            };
          }

          let reworkNote: string | undefined = undefined;
          let reworkReasons: string[] | undefined = undefined;
          let lastReworkRequestedAt: number | undefined = undefined;

          if (status === "rework_required") {
            reworkNote = "Please provide clearer before and after completion evidence.";
            reworkReasons = ["Incomplete evidence"];
            lastReworkRequestedAt = createdAt + 3 * DAY;
          }

          let escalationData: any = undefined;
          if (isEscalated) {
            escalationData = {
              category: "sla_breach",
              priority: "high",
              reason: "Issue exceeded expected resolution handling time limit.",
              comments: "Automated demo escalation created for handling verification.",
              escalatedBy: uoData?.userId ?? systemAdminUserId,
              prevIssueStatus: "in_progress",
              escalatedAt: now - 1 * DAY,
              resolved: false,
              adminReviewStatus: "pending",
              escalationCount: 1,
            };
          }

          let verificationChecklist: any = undefined;
          if (!["pending"].includes(status)) {
            verificationChecklist = {
              locationValid: true,
              hasSufficientEvidence: true,
              notDuplicate: true,
              isWithinJurisdiction: true,
              notes: "Demo verification completed by Unit Officer.",
              verifiedBy: uoData?.userId ?? systemAdminUserId,
              verifiedAt: createdAt + 1 * 60 * 60 * 1000,
            };
          }

          // Insert Issue
          const newIssueId = await ctx.db.insert("issues", {
            issueCode,
            title: templateTitle,
            description: `${templateTitle} reported in ${areaName}, ${city}. Immediate inspection requested by citizen.`,
            category: dept,
            department: dept,
            subcategory: [SPECIALISATIONS[dept]?.[0] || "General"],
            otherCategoryName: null,
            priority,
            tags: [dept, cityKey, "demo"],
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            address: `${areaName}, Near Main Landmark, ${city}, ${cityConfig.state} ${cityConfig.postal}`,
            city: cityConfig.city,
            state: cityConfig.state,
            postal: cityConfig.postal,
            googleMapUrl: mapUrl,

            reportedBy: citizenUserId,
            isAnonymous: iIdx === 4,
            additionalEmail: null,

            photos: [],
            videos: null,

            status,
            assignedUnitOfficer: assignedUOUserId,
            assignedFieldOfficer: assignedFOUserId,

            verificationChecklist,
            rejection: rejectionData,

            reworkNote,
            reworkReasons,
            lastReworkRequestedAt,

            beforePhotos: [],
            afterPhotos: [],
            notes: ["pending_uo_verification", "resolved", "closed"].includes(status)
              ? "Resolution completed with field evidence."
              : undefined,

            possibleDuplicateIds: [],
            escalatedToAdmin: isEscalated,
            escalation: escalationData,

            slaCategory: "standard",
            slaDeadline,
            slaBreached,

            resolvedAt,
            closedAt,

            citizenRating,
            citizenFeedback,

            reopenCount: 0,
            reopenReason: null,
            isReopened: false,

            createdAt,
          });

          issuesCreated++;

          // Insert Issue Updates (Timeline)
          await ctx.db.insert("issueUpdates", {
            issueId: newIssueId,
            status: "pending",
            comment: `Issue reported by citizen in ${areaName}.`,
            updatedBy: citizenUserId,
            role: "citizen",
            attachments: [],
            scope: "officer_and_citizen",
            createdAt,
          });

          if (!["pending"].includes(status) && assignedUOUserId) {
            await ctx.db.insert("issueUpdates", {
              issueId: newIssueId,
              status: "verified",
              comment: `Issue verified by Unit Officer.`,
              updatedBy: assignedUOUserId,
              role: "unit_officer",
              attachments: [],
              scope: "officer_and_citizen",
              createdAt: createdAt + 1 * 60 * 60 * 1000,
            });
          }

          if (["assigned", "in_progress", "pending_uo_verification", "rework_required", "resolved", "closed"].includes(status) && assignedUOUserId && assignedFOUserId) {
            await ctx.db.insert("issueUpdates", {
              issueId: newIssueId,
              status: "assigned",
              comment: `Field Officer assigned to resolve issue.`,
              updatedBy: assignedUOUserId,
              role: "unit_officer",
              attachments: [],
              scope: "officer_and_citizen",
              createdAt: assignedAt,
            });
          }

          if (["in_progress", "pending_uo_verification", "rework_required", "resolved", "closed"].includes(status) && assignedFOUserId) {
            await ctx.db.insert("issueUpdates", {
              issueId: newIssueId,
              status: "in_progress",
              comment: `Field Officer started resolution work.`,
              updatedBy: assignedFOUserId,
              role: "field_officer",
              attachments: [],
              scope: "officer_and_citizen",
              createdAt: workStartedAt,
            });
          }

          if (["resolved", "closed"].includes(status) && assignedUOUserId) {
            await ctx.db.insert("issueUpdates", {
              issueId: newIssueId,
              status: "resolved",
              comment: `Issue resolution verified and approved by Unit Officer.`,
              updatedBy: assignedUOUserId,
              role: "unit_officer",
              attachments: [],
              scope: "officer_and_citizen",
              createdAt: resolvedAt ?? now,
            });
          }

          // System Audit Log Entry
          await ctx.db.insert("auditLogs", {
            performedByUserId: systemAdminUserId,
            performerRole: "system",
            action: "demo_issue_seeded",
            actionCategory: "issue",
            affectedEntityType: "issue",
            affectedEntityId: String(newIssueId),
            issueId: newIssueId,
            issueCode,
            city: cityConfig.city,
            department: dept,
            description: `Seeded demo issue ${issueCode} with status ${status}.`,
            source: "system",
            timestamp: now,
          });
        }
      }

      // --- F. Reconcile Officer & City Admin Profiles after Issue Seeding ---

      // Re-fetch all city issues to calculate summary & update profiles
      const allCityIssuesAfterSeed = await ctx.db
        .query("issues")
        .withIndex("by_city", (q) => q.eq("city", city))
        .collect();

      const cityTotalIssuesCount = allCityIssuesAfterSeed.length;
      const cityResolvedCount = allCityIssuesAfterSeed.filter((i) => ["resolved", "closed"].includes(i.status)).length;
      const cityPendingCount = allCityIssuesAfterSeed.filter((i) => !["resolved", "closed", "rejected"].includes(i.status)).length;

      // Update City Admin profile
      if (cityAdminProfileId) {
        const uoProfileIds = Array.from(uoProfileMap.values()).map((u) => u.profileId);
        const foProfileIds: Id<"fieldOfficers">[] = [];
        for (const foList of foProfileMap.values()) {
          foList.forEach((f) => foProfileIds.push(f.profileId));
        }

        await ctx.db.patch(cityAdminProfileId, {
          managedUnitOfficers: uoProfileIds,
          managedFieldOfficers: foProfileIds,
          totalIssuesInCity: cityTotalIssuesCount,
          issuesResolved: cityResolvedCount,
          issuesPending: cityPendingCount,
        });
      }

      // Update UO & FO array caches for seeded issues
      for (const uoData of uoProfileMap.values()) {
        const uoIssues = allCityIssuesAfterSeed.filter((i) => String(i.assignedUnitOfficer) === String(uoData.userId));
        const activeIds = uoIssues.filter((i) => !["resolved", "closed", "rejected"].includes(i.status)).map((i) => i._id);
        const resolvedIds = uoIssues.filter((i) => ["resolved", "closed"].includes(i.status)).map((i) => i._id);
        const verifiedCount = uoIssues.filter((i) => i.verificationChecklist).length;
        const rejectedCount = uoIssues.filter((i) => i.status === "rejected").length;

        await ctx.db.patch(uoData.profileId, {
          activeIssueIds: activeIds,
          resolvedIssueIds: resolvedIds,
          totalVerifiedIssues: verifiedCount,
          totalRejectedIssues: rejectedCount,
        });
      }

      for (const foList of foProfileMap.values()) {
        for (const foData of foList) {
          const foIssues = allCityIssuesAfterSeed.filter((i) => String(i.assignedFieldOfficer) === String(foData.userId));
          const assignedIds = foIssues.filter((i) => !["resolved", "closed", "rejected"].includes(i.status)).map((i) => i._id);
          const completedIds = foIssues.filter((i) => ["resolved", "closed"].includes(i.status)).map((i) => i._id);

          await ctx.db.patch(foData.profileId, {
            assignedIssueIds: assignedIds,
            completedIssueIds: completedIds,
            currentActiveIssues: assignedIds.length,
            totalResolvedIssues: completedIds.length,
          });
        }
      }

      // Record City Audit Event if new items were created
      if (cityAdminCreated || unitOfficersCreated > 0 || fieldOfficersCreated > 0 || issuesCreated > 0) {
        await ctx.db.insert("auditLogs", {
          performedByUserId: systemAdminUserId,
          performerRole: "system",
          action: "demo_city_seeded",
          actionCategory: "other",
          affectedEntityType: "system",
          city: cityConfig.city,
          description: `Demo baseline created for ${cityConfig.city}: CityAdmin +${cityAdminCreated ? 1 : 0}, UO +${unitOfficersCreated}, FO +${fieldOfficersCreated}, Citizens +${citizensCreated}, Issues +${issuesCreated}.`,
          source: "system",
          timestamp: now,
        });
      }

      citySummaryResults[city] = {
        cityAdminCreated,
        citizensCreated,
        unitOfficersCreated,
        fieldOfficersCreated,
        issuesCreated,
        totalCityIssues: cityTotalIssuesCount,
      };

      totalCreatedAcrossAllCities += cityAdminCreated ? 1 : 0;
      totalCreatedAcrossAllCities += unitOfficersCreated + fieldOfficersCreated + citizensCreated + issuesCreated;
    }

    // Schedule canonical performance metric recalculation engine
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.officerPerformanceMaintenance.refreshAllOfficerPerformance,
        {}
      );
    } catch (err) {
      console.warn("Scheduled officer performance refresh notice:", err);
    }

    const alreadySeeded = totalCreatedAcrossAllCities === 0;

    console.log(
      `[DemoSeed] Completed. Total items created: ${totalCreatedAcrossAllCities}. Already seeded: ${alreadySeeded}.`
    );

    return {
      success: true,
      systemAdmin: {
        created: systemAdminCreated,
        userId: systemAdminUserId,
      },
      cities: citySummaryResults,
      alreadySeeded,
    };
  },
});
