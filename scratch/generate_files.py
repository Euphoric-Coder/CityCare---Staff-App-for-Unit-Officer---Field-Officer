import os, re

ts_demoseed = """import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

/**
 * Checks whether an email belongs to a pre-provisioned demo user account.
 */
export function isDemoSeedEmail(email?: string | null): boolean {
  if (!email) return false;
  const value = String(email).trim().toLowerCase();
  return (
    value === 'system.admin.demo@citycare.local' ||
    value.endsWith('.demo@citycare.local') ||
    value.includes('.demo@citycare.local')
  );
}

/**
 * Internal query to fetch all existing demo users for password validation/repair.
 */
export const getDemoUsersForPasswordRepair = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.filter((u) => isDemoSeedEmail(u.email));
  },
});

/**
 * Internal mutation to apply password repairs for demo users.
 */
export const applyDemoPasswordRepair = internalMutation({
  args: {
    userIds: v.array(v.id('users')),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    let repaired = 0;
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (user && isDemoSeedEmail(user.email)) {
        await ctx.db.patch(userId, {
          password: args.passwordHash,
        });
        repaired++;
      }
    }
    return { repaired };
  },
});

const DEPARTMENTS = [
  'road',
  'electricity',
  'water',
  'sanitation',
  'drainage',
  'solid_waste',
  'public_health',
  'other',
] as const;

const DEPARTMENT_PREFIXES: Record<string, string> = {
  road: 'RD',
  electricity: 'EL',
  water: 'WT',
  sanitation: 'SN',
  drainage: 'DR',
  solid_waste: 'SW',
  public_health: 'PH',
  other: 'OT',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  road: 'Roads & Footpaths',
  electricity: 'Electricity & Lighting',
  water: 'Water Supply & Sewage',
  sanitation: 'Sanitation & Hygiene',
  drainage: 'Drainage & Storm Water',
  solid_waste: 'Solid Waste Management',
  public_health: 'Public Health & Safety',
  other: 'General Civic Amenities',
};

const SPECIALISATIONS: Record<string, string[]> = {
  road: ['Pothole Repair', 'Asphalt Laying', 'Footpath Maintenance'],
  electricity: ['Street Lighting', 'Wiring Inspection', 'Transformer Maintenance'],
  water: ['Pipeline Repair', 'Leak Detection', 'Water Supply'],
  sanitation: ['Waste Collection', 'Public Toilet Maintenance', 'Sanitization'],
  drainage: ['Drain Cleaning', 'Flood Prevention', 'Storm Water'],
  solid_waste: ['Garbage Collection', 'Dumping Site Management', 'Segregation'],
  public_health: ['Mosquito Control', 'Disinfection', 'Health Inspection'],
  other: ['General Maintenance', 'Civil Infrastructure'],
};

const DEMO_TITLES: Record<string, string[]> = {
  road: [
    'Large pothole causing traffic disruption',
    'Damaged road surface near junction',
    'Broken footpath requiring urgent repair',
    'Cracked asphalt hazard on main road',
  ],
  electricity: [
    'Streetlight not functioning at night',
    'Exposed electrical wiring near walkway',
    'Repeated lighting failure in residential area',
    'Damaged transformer enclosure door',
  ],
  water: [
    'Water pipeline leakage on main road',
    'Irregular water supply connection',
    'Public drinking water fountain damaged',
    'Clean water wasting from broken pipe',
  ],
  sanitation: [
    'Public toilet requires urgent sanitation',
    'Drain-side hygiene issue near market',
    'Unsanitary public dumping area',
    'Overflowing public waste receptacle',
  ],
  drainage: [
    'Blocked storm drain causing waterlogging',
    'Waterlogging near traffic junction',
    'Sewer overflow reported in lane',
    'Missing storm drain chamber cover',
  ],
  solid_waste: [
    'Garbage accumulation at street corner',
    'Missed scheduled waste collection',
    'Illegal waste dumping behind complex',
    'Overflowing communal garbage bin',
  ],
  public_health: [
    'Mosquito breeding hotspot in stagnant pool',
    'Public health hazard from stagnant runoff',
    'Stagnant water health concern near school',
    'Open drain pest infestation reported',
  ],
  other: [
    'Damaged civic infrastructure signpost',
    'Public facility maintenance required',
    'Broken park bench in civic garden',
    'Unmaintained public notice board',
  ],
};

const CITY_CONFIGS = [
  {
    city: 'Varanasi',
    key: 'varanasi',
    state: 'Uttar Pradesh',
    postal: '221001',
    codePrefix: 'VNS',
    center: { latitude: 25.3176, longitude: 82.9739 },
    areas: [
      'Godowlia',
      'Dashashwamedh',
      'Sigra',
      'Lanka',
      'Bhelupur',
      'Cantonment',
      'Maldahiya',
      'Chetganj',
    ],
  },
  {
    city: 'Mumbai',
    key: 'mumbai',
    state: 'Maharashtra',
    postal: '400001',
    codePrefix: 'MUM',
    center: { latitude: 19.0760, longitude: 72.8777 },
    areas: [
      'Colaba',
      'Bandra West',
      'Andheri East',
      'Dadar',
      'Juhu',
      'Worli',
      'Chembur',
      'Powai',
    ],
  },
];

function offsetCoordinates(baseLat: number, baseLng: number, index: number) {
  const offsets = [
    [0.002, 0.003],
    [-0.003, 0.004],
    [0.005, -0.002],
    [-0.004, -0.005],
    [0.001, -0.006],
    [-0.006, 0.002],
    [0.003, -0.003],
    [-0.002, 0.005],
  ];
  const [latOffset, lngOffset] = offsets[index % offsets.length];
  return {
    latitude: Number((baseLat + latOffset).toFixed(6)),
    longitude: Number((baseLng + lngOffset).toFixed(6)),
  };
}

/**
 * Main deterministic, idempotent baseline demo data seeder.
 * Idempotently checks existence of accounts, officer profiles, and per-issue codes.
 */
export const seedDemoDataOnce = internalMutation({
  args: {
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const passwordHash = args.passwordHash;
    let totalCreatedCount = 0;

    // 1. System Admin Resolution / Seeding
    const demoAdminEmail = 'system.admin.demo@citycare.local';
    let systemAdminUserId: Id<'users'>;

    const existingDemoAdminUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', demoAdminEmail))
      .unique();

    if (!existingDemoAdminUser) {
      systemAdminUserId = await ctx.db.insert('users', {
        fullName: 'System Admin',
        email: demoAdminEmail,
        password: passwordHash,
        role: 'admin',
        createdAt: new Date(now).toISOString(),
      });
      totalCreatedCount++;
    } else {
      systemAdminUserId = existingDemoAdminUser._id;
    }

    const citySummaryResults: Record<string, any> = {};

    // 2. City-by-City Seeding (Varanasi & Mumbai)
    for (const cityConfig of CITY_CONFIGS) {
      const cityName = cityConfig.city;
      const cityKey = cityConfig.key;
      const codePrefix = cityConfig.codePrefix;

      // --- A. Dummy Citizens (3 Citizens per City) ---
      const cityCitizenUserIds: Id<'users'>[] = [];
      for (let cIdx = 1; cIdx <= 3; cIdx++) {
        const citizenEmail = `citizen.${cityKey}.0${cIdx}.demo@citycare.local`;
        const citizenName = `Citizen ${cIdx} (${cityName})`;
        const area = cityConfig.areas[(cIdx - 1) % cityConfig.areas.length];
        const coords = offsetCoordinates(
          cityConfig.center.latitude,
          cityConfig.center.longitude,
          cIdx
        );

        let citizenUserId: Id<'users'>;
        const existingUser = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', citizenEmail))
          .unique();

        if (!existingUser) {
          citizenUserId = await ctx.db.insert('users', {
            fullName: citizenName,
            email: citizenEmail,
            password: passwordHash,
            role: 'citizen',
            createdAt: new Date(now - 60 * DAY_MS).toISOString(),
          });
          totalCreatedCount++;
        } else {
          citizenUserId = existingUser._id;
        }

        cityCitizenUserIds.push(citizenUserId);

        const existingCitizenProfile = await ctx.db
          .query('citizens')
          .withIndex('by_user', (q) => q.eq('userId', citizenUserId))
          .unique();

        if (!existingCitizenProfile) {
          await ctx.db.insert('citizens', {
            userId: citizenUserId,
            fullName: citizenName,
            email: citizenEmail,
            phone: `+9198765${cityKey === 'varanasi' ? '1' : '2'}00${cIdx}`,
            city: cityName,
            state: cityConfig.state,
            region: area,
            postal: cityConfig.postal,
            fullAddress: `${area}, ${cityName}, ${cityConfig.state}`,
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            points: 150 + cIdx * 50,
            level: 2,
            levelTitle: 'Active Contributor',
            badgeCount: 3,
            reportsSubmitted: 10,
            reportsVerified: 8,
            reportsResolved: 7,
            reportsRejected: 1,
            duplicateReports: 0,
            commentsAdded: 5,
            upvotesReceived: 12,
            videoEvidenceAdded: 2,
            currentStreak: 4,
            longestStreak: 7,
            createdAt: now - 60 * DAY_MS,
            updatedAt: now,
          });
          totalCreatedCount++;
        }
      }

      // --- B. Unit Officers Seeding (8 UOs per City — 1 per Department) ---
      const uoProfileMap = new Map<string, { profileId: Id<'unitOfficers'>; userId: Id<'users'> }>();
      const cityUoProfileIds: Id<'unitOfficers'>[] = [];

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const deptLabel = DEPARTMENT_LABELS[dept];
        const uoEmail = `uo.${dept}.${cityKey}.demo@citycare.local`;
        const uoName = `UO ${deptLabel} (${cityName})`;

        let uoUserId: Id<'users'>;
        const existingUser = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', uoEmail))
          .unique();

        if (!existingUser) {
          uoUserId = await ctx.db.insert('users', {
            fullName: uoName,
            email: uoEmail,
            password: passwordHash,
            role: 'unit_officer',
            createdAt: new Date(now - 90 * DAY_MS).toISOString(),
          });
          totalCreatedCount++;
        } else {
          uoUserId = existingUser._id;
        }

        let uoProfileId: Id<'unitOfficers'>;
        const existingProfile = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', uoUserId))
          .unique();

        if (!existingProfile) {
          uoProfileId = await ctx.db.insert('unitOfficers', {
            userId: uoUserId,
            fullName: uoName,
            email: uoEmail,
            phone: `+9198111${cityKey === 'varanasi' ? '1' : '2'}00${dIdx + 1}`,
            state: cityConfig.state,
            city: cityName,
            district: cityName,
            department: dept,
            totalVerifiedIssues: 12,
            totalRejectedIssues: 1,
            avgResolutionTime: 24.5,
            accountApproved: true,
            rating: 4.8,
            efficiencyScore: 92,
            assignedFieldOfficers: [],
            activeIssueIds: [],
            resolvedIssueIds: [],
            mustChangePassword: false,
          });
          totalCreatedCount++;
        } else {
          uoProfileId = existingProfile._id;
        }

        uoProfileMap.set(dept, { profileId: uoProfileId, userId: uoUserId });
        cityUoProfileIds.push(uoProfileId);
      }

      // --- C. Field Officers Seeding (16 FOs per City — 2 per Department) ---
      const foProfileMap = new Map<string, Array<{ profileId: Id<'fieldOfficers'>; userId: Id<'users'> }>>();
      const cityFoProfileIds: Id<'fieldOfficers'>[] = [];

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const deptLabel = DEPARTMENT_LABELS[dept];
        const uoInfo = uoProfileMap.get(dept)!;
        const deptFoProfiles: Id<'fieldOfficers'>[] = [];

        for (let foIdx = 1; foIdx <= 2; foIdx++) {
          const foEmail = `fo.${dept}.0${foIdx}.${cityKey}.demo@citycare.local`;
          const foName = `FO ${deptLabel} ${foIdx} (${cityName})`;

          let foUserId: Id<'users'>;
          const existingUser = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', foEmail))
            .unique();

          if (!existingUser) {
            foUserId = await ctx.db.insert('users', {
              fullName: foName,
              email: foEmail,
              password: passwordHash,
              role: 'field_officer',
              createdAt: new Date(now - 90 * DAY_MS).toISOString(),
            });
            totalCreatedCount++;
          } else {
            foUserId = existingUser._id;
          }

          let foProfileId: Id<'fieldOfficers'>;
          const existingProfile = await ctx.db
            .query('fieldOfficers')
            .withIndex('by_user', (q) => q.eq('userId', foUserId))
            .unique();

          if (!existingProfile) {
            foProfileId = await ctx.db.insert('fieldOfficers', {
              userId: foUserId,
              fullName: foName,
              email: foEmail,
              phone: `+9198222${cityKey === 'varanasi' ? '1' : '2'}${dIdx}${foIdx}`,
              state: cityConfig.state,
              city: cityName,
              district: cityName,
              department: dept,
              specialisations: SPECIALISATIONS[dept] || ['General Maintenance'],
              reportingUnitOfficerId: uoInfo.profileId,
              currentActiveIssues: 0,
              maxIssueCapacity: 10,
              assignedIssueIds: [],
              completedIssueIds: [],
              totalResolvedIssues: 15,
              avgResolutionTime: 18.2,
              onTimeCompletionRate: 94.5,
              accountApproved: true,
              rating: 4.7,
              efficiencyScore: 89,
              mustChangePassword: false,
            });
            totalCreatedCount++;
          } else {
            foProfileId = existingProfile._id;
            if (existingProfile.reportingUnitOfficerId !== uoInfo.profileId) {
              await ctx.db.patch(foProfileId, { reportingUnitOfficerId: uoInfo.profileId });
            }
          }

          deptFoProfiles.push(foProfileId);
          cityFoProfileIds.push(foProfileId);

          if (!foProfileMap.has(dept)) foProfileMap.set(dept, []);
          foProfileMap.get(dept)!.push({ profileId: foProfileId, userId: foUserId });
        }

        // Reconcile corresponding UO profile's assignedFieldOfficers
        const uoDoc = await ctx.db.get(uoInfo.profileId);
        if (uoDoc) {
          const currentAssigned = (uoDoc.assignedFieldOfficers || []).map(String);
          const mergedAssigned = Array.from(
            new Set([...currentAssigned, ...deptFoProfiles.map(String)])
          ) as Id<'fieldOfficers'>[];
          await ctx.db.patch(uoInfo.profileId, { assignedFieldOfficers: mergedAssigned });
        }
      }

      // --- D. City Admin Seeding (1 per City) ---
      const cityAdminEmail = `cityadmin.${cityKey}.demo@citycare.local`;
      const cityAdminName = `City Admin (${cityName})`;

      let cityAdminUserId: Id<'users'>;
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', cityAdminEmail))
        .unique();

      if (!existingUser) {
        cityAdminUserId = await ctx.db.insert('users', {
          fullName: cityAdminName,
          email: cityAdminEmail,
          password: passwordHash,
          role: 'city_admin',
          createdAt: new Date(now - 90 * DAY_MS).toISOString(),
        });
        totalCreatedCount++;
      } else {
        cityAdminUserId = existingUser._id;
      }

      let cityAdminProfileId: Id<'cityAdmins'>;
      const existingCityAdminProfile = await ctx.db
        .query('cityAdmins')
        .withIndex('by_user', (q) => q.eq('userId', cityAdminUserId))
        .unique();

      if (!existingCityAdminProfile) {
        cityAdminProfileId = await ctx.db.insert('cityAdmins', {
          userId: cityAdminUserId,
          fullName: cityAdminName,
          email: cityAdminEmail,
          phone: `+9198999${cityKey === 'varanasi' ? '1' : '2'}001`,
          state: cityConfig.state,
          city: cityName,
          managedUnitOfficers: cityUoProfileIds,
          managedFieldOfficers: cityFoProfileIds,
          mustChangePassword: false,
          totalIssuesInCity: 32,
          issuesResolved: 20,
          issuesPending: 12,
          avgResolutionTime: 22.4,
          slaComplianceRate: 91.5,
          createdAt: now - 90 * DAY_MS,
          createdBy: systemAdminUserId,
          notes: `Pre-provisioned City Administrator for ${cityName}.`,
        });
        totalCreatedCount++;
      } else {
        cityAdminProfileId = existingCityAdminProfile._id;
        const currentUos = (existingCityAdminProfile.managedUnitOfficers || []).map(String);
        const currentFos = (existingCityAdminProfile.managedFieldOfficers || []).map(String);
        const newUos = Array.from(new Set([...currentUos, ...cityUoProfileIds.map(String)])) as Id<'unitOfficers'>[];
        const newFos = Array.from(new Set([...currentFos, ...cityFoProfileIds.map(String)])) as Id<'fieldOfficers'>[];
        await ctx.db.patch(cityAdminProfileId, {
          managedUnitOfficers: newUos,
          managedFieldOfficers: newFos,
        });
      }

      // --- E. Issues Seeding (32 Issues per City — 4 per Department) ---
      const statusSpecs = [
        { status: 'pending' }, // 0
        { status: 'verified' }, // 1
        { status: 'assigned' }, // 2
        { status: 'in_progress' }, // 3
        { status: 'pending_uo_verification' }, // 4
        { status: 'rework_required' }, // 5
        { status: 'resolved', slaOutcome: 'within' }, // 6
        { status: 'resolved', slaOutcome: 'breached', feedback: true }, // 7
        { status: 'closed' }, // 8
        { status: 'rejected' }, // 9
        { status: 'escalated' }, // 10
        { status: 'pending' }, // 11
        { status: 'verified' }, // 12
        { status: 'assigned' }, // 13
        { status: 'in_progress' }, // 14
        { status: 'pending_uo_verification' }, // 15
        { status: 'rework_required' }, // 16
        { status: 'resolved', slaOutcome: 'within', feedback: true }, // 17
        { status: 'resolved', slaOutcome: 'breached' }, // 18
        { status: 'closed' }, // 19
        { status: 'rejected' }, // 20
        { status: 'pending' }, // 21
        { status: 'verified' }, // 22
        { status: 'assigned' }, // 23
        { status: 'in_progress' }, // 24
        { status: 'pending_uo_verification' }, // 25
        { status: 'resolved', slaOutcome: 'within', feedback: true }, // 26
        { status: 'resolved', slaOutcome: 'within' }, // 27
        { status: 'closed' }, // 28
        { status: 'assigned' }, // 29
        { status: 'in_progress' }, // 30
        { status: 'pending' }, // 31
      ];

      const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      const createdCityIssueIds: Id<'issues'>[] = [];
      let issueGlobalIndex = 0;

      for (let dIdx = 0; dIdx < DEPARTMENTS.length; dIdx++) {
        const dept = DEPARTMENTS[dIdx];
        const deptPrefix = DEPARTMENT_PREFIXES[dept] || 'OT';
        const deptTitles = DEMO_TITLES[dept] || DEMO_TITLES.other;
        const uoInfo = uoProfileMap.get(dept)!;
        const deptFoList = foProfileMap.get(dept) || [];

        for (let issueNum = 1; issueNum <= 4; issueNum++) {
          const specIndex = issueGlobalIndex;
          const code = `DEMO-${codePrefix}-${deptPrefix}-${String(issueNum).padStart(3, '0')}`;
          issueGlobalIndex++;

          const existingIssue = await ctx.db
            .query('issues')
            .withIndex('by_issue_code', (q) => q.eq('issueCode', code))
            .first();

          if (existingIssue) {
            createdCityIssueIds.push(existingIssue._id);
            continue;
          }

          const spec = statusSpecs[specIndex % statusSpecs.length];
          const title = deptTitles[(issueNum - 1) % deptTitles.length];
          const area = cityConfig.areas[specIndex % cityConfig.areas.length];
          const coords = offsetCoordinates(
            cityConfig.center.latitude,
            cityConfig.center.longitude,
            specIndex
          );
          const reporterUserId = cityCitizenUserIds[specIndex % cityCitizenUserIds.length];
          const foInfo = deptFoList.length > 0 ? deptFoList[(issueNum - 1) % deptFoList.length] : null;

          const daysAgo = Math.max(1, Math.floor(90 - issueGlobalIndex * 2.7));
          const issueCreatedAt = now - daysAgo * DAY_MS;

          let slaDeadline = issueCreatedAt + 4 * DAY_MS;
          let slaBreached = false;
          let resolvedAt: number | null = null;
          let closedAt: number | null = null;

          if (spec.slaOutcome === 'breached') {
            slaBreached = true;
            slaDeadline = issueCreatedAt + 2 * DAY_MS;
          } else if (spec.status === 'in_progress' && daysAgo > 5) {
            slaBreached = true;
            slaDeadline = issueCreatedAt + 3 * DAY_MS;
          }

          if (spec.status === 'resolved' || spec.status === 'closed') {
            resolvedAt = slaBreached
              ? slaDeadline + 1 * DAY_MS
              : issueCreatedAt + 2 * DAY_MS;
            if (spec.status === 'closed') {
              closedAt = resolvedAt + 1 * DAY_MS;
            }
          }

          let assignedUO: Id<'users'> | null = null;
          let assignedFO: Id<'users'> | null = null;

          if (spec.status !== 'pending') {
            assignedUO = uoInfo.userId;
          }

          if (
            [
              'assigned',
              'in_progress',
              'pending_uo_verification',
              'rework_required',
              'resolved',
              'closed',
              'escalated',
            ].includes(spec.status)
          ) {
            assignedFO = foInfo ? foInfo.userId : null;
          }

          let verificationChecklist: any = undefined;
          if (assignedUO && spec.status !== 'pending') {
            verificationChecklist = {
              locationValid: true,
              hasSufficientEvidence: true,
              notDuplicate: true,
              isWithinJurisdiction: true,
              notes: 'Verified by Ward Officer.',
              verifiedBy: assignedUO,
              verifiedAt: issueCreatedAt + 30 * 60 * 1000,
            };
          }

          let escalatedToAdmin = false;
          let escalation: any = undefined;

          if (spec.status === 'escalated') {
            escalatedToAdmin = true;
            escalation = {
              category: 'sla_breach',
              priority: 'high',
              reason: 'Issue handling time exceeded maximum acceptable threshold without resolution.',
              comments: 'Escalated for immediate administrative intervention.',
              escalatedBy: uoInfo.userId || systemAdminUserId,
              prevIssueStatus: 'in_progress',
              escalatedAt: issueCreatedAt + 3 * DAY_MS,
              resolved: false,
              adminReviewStatus: 'pending',
              escalationCount: 1,
            };
          }

          let reworkNote: string | undefined = undefined;
          let reworkReasons: string[] | undefined = undefined;
          let lastReworkRequestedAt: number | undefined = undefined;

          if (spec.status === 'rework_required') {
            reworkNote = 'Resolution evidence is unclear. Please re-upload clearer after-fix photographs.';
            reworkReasons = ['Incomplete evidence'];
            lastReworkRequestedAt = issueCreatedAt + 2 * DAY_MS;
          }

          let rejection: any = undefined;
          if (spec.status === 'rejected') {
            rejection = {
              reason: 'Outside Municipal Scope',
              comment: 'The reported location lies outside city municipal jurisdiction boundaries.',
              rejectedBy: uoInfo.userId || systemAdminUserId,
              rejectedAt: issueCreatedAt + 1 * DAY_MS,
            };
          }

          let citizenRating: number | null = null;
          let citizenFeedback: string | null = null;
          if (spec.feedback && (resolvedAt || closedAt)) {
            citizenRating = issueGlobalIndex % 2 === 0 ? 4.5 : 5.0;
            citizenFeedback = 'Issue was resolved promptly by the municipal team. Thank you!';
          }

          const priority = priorities[(issueGlobalIndex - 1) % priorities.length];

          const issueId = await ctx.db.insert('issues', {
            issueCode: code,
            title,
            description: `${title} reported at ${area}, ${cityName}. Immediate municipal action is requested by residents.`,
            category: dept,
            department: dept,
            subcategory: [SPECIALISATIONS[dept]?.[0] || 'General Maintenance'],
            otherCategoryName: null,
            priority,
            tags: [dept, cityName.toLowerCase()],
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            address: `${area} Ward ${(issueGlobalIndex % 5) + 1}, ${cityName}, ${cityConfig.state}`,
            city: cityName,
            state: cityConfig.state,
            postal: cityConfig.postal,
            googleMapUrl: `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`,
            reportedBy: reporterUserId,
            isAnonymous: issueGlobalIndex % 4 === 0,
            additionalEmail: null,
            photos: [],
            videos: null,
            status: spec.status,
            assignedUnitOfficer: assignedUO,
            assignedFieldOfficer: assignedFO,
            possibleDuplicateIds: [],
            verificationChecklist,
            reworkNote,
            reworkReasons,
            lastReworkRequestedAt,
            rejection,
            escalatedToAdmin,
            escalation,
            slaCategory: 'standard',
            slaDeadline,
            slaBreached,
            resolvedAt: resolvedAt,
            closedAt: closedAt,
            citizenRating: citizenRating,
            citizenFeedback: citizenFeedback,
            reopenCount: 0,
            reopenReason: null,
            isReopened: false,
            createdAt: issueCreatedAt,
          });

          totalCreatedCount++;
          createdCityIssueIds.push(issueId);

          await ctx.db.insert('issueUpdates', {
            issueId,
            status: 'pending',
            comment: `Issue reported by citizen. Code: ${code}`,
            updatedBy: reporterUserId,
            role: 'citizen',
            attachments: [],
            scope: 'officer_and_citizen',
            createdAt: issueCreatedAt,
          });

          if (assignedUO && spec.status !== 'pending') {
            await ctx.db.insert('issueUpdates', {
              issueId,
              status: 'verified',
              comment: 'Issue verified by Ward Officer.',
              updatedBy: assignedUO,
              role: 'unit_officer',
              attachments: [],
              scope: 'officer_and_citizen',
              createdAt: issueCreatedAt + 30 * 60 * 1000,
            });
          }

          if (assignedFO) {
            await ctx.db.insert('issueUpdates', {
              issueId,
              status: 'assigned',
              comment: 'Field Officer assigned for on-site execution.',
              updatedBy: assignedUO || systemAdminUserId,
              role: 'unit_officer',
              attachments: [],
              scope: 'officer_and_citizen',
              createdAt: issueCreatedAt + 1 * 60 * 60 * 1000,
            });
          }

          if (
            ['in_progress', 'pending_uo_verification', 'rework_required', 'resolved', 'closed', 'escalated'].includes(spec.status)
          ) {
            await ctx.db.insert('issueUpdates', {
              issueId,
              status: 'in_progress',
              comment: 'Work started on site by Field Officer.',
              updatedBy: assignedFO || systemAdminUserId,
              role: 'field_officer',
              attachments: [],
              scope: 'officer_and_citizen',
              createdAt: issueCreatedAt + 4 * 60 * 60 * 1000,
            });
          }

          if (['resolved', 'closed'].includes(spec.status)) {
            await ctx.db.insert('issueUpdates', {
              issueId,
              status: 'resolved',
              comment: 'Work completed successfully and verified.',
              updatedBy: assignedFO || systemAdminUserId,
              role: 'field_officer',
              attachments: [],
              scope: 'officer_and_citizen',
              createdAt: resolvedAt || now,
            });
          }
        }
      }

      // --- F. Intentional Duplicate Pair Linking ---
      const issue1 = await ctx.db
        .query('issues')
        .withIndex('by_issue_code', (q) => q.eq('issueCode', `DEMO-${codePrefix}-RD-001`))
        .first();
      const issue2 = await ctx.db
        .query('issues')
        .withIndex('by_issue_code', (q) => q.eq('issueCode', `DEMO-${codePrefix}-RD-002`))
        .first();

      if (issue1 && issue2) {
        const u1Dups = (issue1.possibleDuplicateIds || []).map(String);
        const u2Dups = (issue2.possibleDuplicateIds || []).map(String);

        if (!u1Dups.includes(String(issue2._id))) {
          await ctx.db.patch(issue1._id, {
            possibleDuplicateIds: Array.from(new Set([...u1Dups, String(issue2._id)])) as Id<'issues'>[],
          });
        }
        if (!u2Dups.includes(String(issue1._id))) {
          await ctx.db.patch(issue2._id, {
            possibleDuplicateIds: Array.from(new Set([...u2Dups, String(issue1._id)])) as Id<'issues'>[],
          });
        }
      }

      // --- G. Reconcile Officer Arrays & City Admin Metrics after Issue Seeding ---
      const allCityIssuesAfter = await ctx.db
        .query('issues')
        .withIndex('by_city', (q) => q.eq('city', cityName))
        .collect();

      for (const uoInfo of uoProfileMap.values()) {
        const uoIssues = allCityIssuesAfter.filter(
          (i) => String(i.assignedUnitOfficer) === String(uoInfo.userId)
        );
        const activeIds = uoIssues
          .filter((i) => !['resolved', 'closed', 'rejected', 'withdrawn'].includes(i.status))
          .map((i) => i._id);
        const resolvedIds = uoIssues
          .filter((i) => ['resolved', 'closed'].includes(i.status))
          .map((i) => i._id);

        await ctx.db.patch(uoInfo.profileId, {
          activeIssueIds: activeIds,
          resolvedIssueIds: resolvedIds,
          totalVerifiedIssues: uoIssues.filter((i) => i.verificationChecklist).length,
          totalRejectedIssues: uoIssues.filter((i) => i.status === 'rejected').length,
        });
      }

      for (const deptFoList of foProfileMap.values()) {
        for (const foInfo of deptFoList) {
          const foIssues = allCityIssuesAfter.filter(
            (i) => String(i.assignedFieldOfficer) === String(foInfo.userId)
          );
          const assignedIds = foIssues
            .filter((i) => !['resolved', 'closed', 'rejected', 'withdrawn'].includes(i.status))
            .map((i) => i._id);
          const completedIds = foIssues
            .filter((i) => ['resolved', 'closed'].includes(i.status))
            .map((i) => i._id);

          await ctx.db.patch(foInfo.profileId, {
            assignedIssueIds: assignedIds,
            completedIssueIds: completedIds,
            currentActiveIssues: assignedIds.length,
            totalResolvedIssues: completedIds.length,
          });
        }
      }

      const totalCount = allCityIssuesAfter.length;
      const resolvedCount = allCityIssuesAfter.filter((i) =>
        ['resolved', 'closed'].includes(i.status)
      ).length;
      const pendingCount = totalCount - resolvedCount;
      const breachedCount = allCityIssuesAfter.filter((i) => i.slaBreached).length;
      const slaCompliance =
        resolvedCount > 0
          ? Number((((resolvedCount - breachedCount) / resolvedCount) * 100).toFixed(1))
          : 100;

      await ctx.db.patch(cityAdminProfileId, {
        totalIssuesInCity: totalCount,
        issuesResolved: resolvedCount,
        issuesPending: pendingCount,
        slaComplianceRate: Math.max(0, slaCompliance),
      });

      citySummaryResults[cityKey] = {
        totalIssues: totalCount,
        resolved: resolvedCount,
        pending: pendingCount,
      };
    }

    // --- H. System Audit Log Event (Only if new records were inserted) ---
    if (totalCreatedCount > 0) {
      await ctx.db.insert('auditLogs', {
        performedByUserId: systemAdminUserId,
        performerRole: 'system',
        action: 'demo_baseline_seeded',
        actionCategory: 'other',
        affectedEntityType: 'system',
        description: `Demo baseline data seeded/verified across 2 cities (${totalCreatedCount} new records created).`,
        source: 'system',
        timestamp: now,
      });
    }

    // --- I. Refresh Officer Performance Metrics ---
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.officerPerformanceMaintenance.refreshAllOfficerPerformance,
        {}
      );
    } catch {
      // Graceful fallback if scheduler context is restricted
    }

    return {
      success: true,
      createdCount: totalCreatedCount,
      citiesProcessed: CITY_CONFIGS.length,
      citySummary: citySummaryResults,
    };
  },
});
"""

ts_demoseedpasswords = """'use node';

import bcrypt from 'bcryptjs';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const DEMO_PASSWORD = 'CityCare@Demo2026';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/**
 * Node action to repair passwords of known deterministic demo users.
 * Checks existing passwords with bcrypt.compare; if invalid or plaintext, patches with valid bcrypt hash.
 */
export const repairDemoPasswords = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; checked: number; repaired: number; unchanged: number }> => {
    const demoUsers: Array<{ _id: Id<'users'>; email: string; password?: string }> =
      await ctx.runQuery(internal.demoSeed.getDemoUsersForPasswordRepair, {});

    const idsToRepair: Id<'users'>[] = [];

    for (const user of demoUsers) {
      let isValid = false;
      try {
        if (user.password && typeof user.password === 'string') {
          isValid = await bcrypt.compare(DEMO_PASSWORD, user.password);
        }
      } catch {
        isValid = false;
      }

      if (!isValid) {
        idsToRepair.push(user._id);
      }
    }

    if (idsToRepair.length === 0) {
      return {
        success: true,
        checked: demoUsers.length,
        repaired: 0,
        unchanged: demoUsers.length,
      };
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const result = await ctx.runMutation(
      internal.demoSeed.applyDemoPasswordRepair,
      {
        userIds: idsToRepair,
        passwordHash,
      }
    );

    return {
      success: true,
      checked: demoUsers.length,
      repaired: result.repaired,
      unchanged: demoUsers.length - result.repaired,
    };
  },
});

export const repairDemoPasswordsAction = repairDemoPasswords;

/**
 * Main Node action orchestrator invoked by Cron or manual trigger.
 * Generates bcrypt passwordHash, seeds demo baseline data if needed, and repairs existing demo passwords.
 */
export const ensureDemoBaseline = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; seed: any; passwordRepair: any }> => {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const seedResult = await ctx.runMutation(
      internal.demoSeed.seedDemoDataOnce,
      { passwordHash }
    );

    const passwordRepairResult = await ctx.runAction(
      internal.demoSeedPasswords.repairDemoPasswords,
      {}
    );

    return {
      success: true,
      seed: seedResult,
      passwordRepair: passwordRepairResult,
    };
  },
});
"""

def to_js(text):
    text = re.sub(r"import \{ Id \} from '\./_generated/dataModel';\n", "", text)
    text = re.sub(r"isDemoSeedEmail\(email\?: string \| null\): boolean", "isDemoSeedEmail(email)", text)
    text = re.sub(r" as const", "", text)
    text = re.sub(r"new Map<[\s\S]+?>\(\)", "new Map()", text)
    text = re.sub(r"\.get\(([^\)]+)\)!", r".get(\1)", text)
    text = re.sub(r": Record<[^>]+>", "", text)
    text = re.sub(r": Id<[^>]+>\[\]", "", text)
    text = re.sub(r": Id<[^>]+>\s*\|\s*null", "", text)
    text = re.sub(r": Id<[^>]+>", "", text)
    text = re.sub(r" as Id<[^>]+>\[\]", "", text)
    text = re.sub(r" as Id<[^>]+>", "", text)
    text = re.sub(r": Array<[^>]+>", "", text)
    text = re.sub(r": [a-zA-Z0-9_\[\]]+\s*\|\s*null", "", text)
    text = re.sub(r": [a-zA-Z0-9_\[\]]+\s*\|\s*undefined", "", text)
    text = re.sub(r": Promise<[^>]+>", "", text)
    text = re.sub(r": number", "", text)
    text = re.sub(r": string", "", text)
    text = re.sub(r": boolean", "", text)
    text = re.sub(r": any", "", text)
    return text

with open('/Users/sagnikdey/Desktop/PORTFOLIO PROJECTS/CityCareMobile/convex/demoSeed.ts', 'w') as f:
    f.write(ts_demoseed)

with open('/Users/sagnikdey/Desktop/PORTFOLIO PROJECTS/CityCareMobile/convex/demoSeedPasswords.ts', 'w') as f:
    f.write(ts_demoseedpasswords)

with open('/Users/sagnikdey/Desktop/PROJECTS/FULLSTACK/CityCare/convex/demoSeed.js', 'w') as f:
    f.write(to_js(ts_demoseed))

with open('/Users/sagnikdey/Desktop/PROJECTS/FULLSTACK/CityCare/convex/demoSeedPasswords.js', 'w') as f:
    f.write(to_js(ts_demoseedpasswords))

print('Updated seed files!')
