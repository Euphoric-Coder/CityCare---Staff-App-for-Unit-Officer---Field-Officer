import { DuplicateGroup, DuplicatePairMetrics, Issue } from './types';

type RawIssue = {
  _id?: string;
  id?: string;

  title?: string;
  description?: string;

  category?: string;

  // Your backend may use either one.
  subcategory?: string[];
  subCategories?: string[];

  priority?: string;
  status?: string;
  location?: string;
  ward?: string;

  reportedBy?: string;

  citizenDetails?: {
    fullName?: string;
    email?: string;
    phone?: number;
  };

  dateReported?: string;
  createdAt?: string;
  updatedAt?: string;

  beforePhotos?: string[];
  issueUpdates?: any[];

  slaDeadline?: string;

  coordinates?: {
    latitude?: number;
    longitude?: number;
  };

  latitude?: number | string;
  longitude?: number | string;
};

const DUPLICATE_THRESHOLD = 60;

const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'near',
  'with',
  'this',
  'that',
  'there',
  'here',
  'from',
  'by',
  'it',
  'be',
  'are',
  'was',
  'were',
  'as',
  'has',
  'have',
  'had',
  'very',
  'please',
  'kindly',
  'urgent',
  'issue',
  'problem',
  'area',
  'location',
  'place',
  'people',
  'residents',
  'citizens',
  'facing',
  'causing',
  'caused',
  'many',
  'some',
  'due',
]);

const CATEGORY_COMPATIBILITY: Record<string, string[]> = {
  road: ['drainage', 'water', 'sanitation'],
  electricity: [],
  water: ['drainage', 'road', 'public_health'],
  sanitation: ['solid_waste', 'drainage', 'public_health'],
  drainage: ['road', 'water', 'sanitation'],
  solid_waste: ['sanitation', 'public_health'],
  public_health: ['sanitation', 'solid_waste', 'water'],
  other: [],
};

const SUBCATEGORY_ALIASES: Record<string, string[]> = {
  pothole_repair: [
    'pothole',
    'potholes',
    'road hole',
    'road holes',
    'broken road',
    'damaged road',
    'road damage',
    'crater',
  ],

  asphalt_laying: ['asphalt', 'tar', 'tarring', 'road laying', 'road resurfacing'],

  footpath_repair: ['footpath', 'sidewalk', 'pavement', 'broken footpath', 'damaged footpath'],

  speed_breaker_construction: ['speed breaker', 'speed bump', 'speed hump'],

  road_marking: ['road marking', 'zebra crossing', 'lane marking', 'traffic marking'],

  street_light_repair: [
    'street light',
    'streetlight',
    'lamp post',
    'light pole',
    'road light',
    'public light',
    'broken light',
    'light not working',
    'dark street',
    'darkness',
  ],

  cable_maintenance: [
    'cable',
    'electric cable',
    'wire',
    'wires',
    'loose wire',
    'hanging wire',
    'damaged wire',
    'exposed wire',
  ],

  transformer_inspection: ['transformer', 'electric transformer', 'faulty transformer'],

  meter_repair: ['meter', 'electric meter', 'faulty meter', 'meter box'],

  pipeline_repair: [
    'pipeline',
    'pipe',
    'broken pipe',
    'pipe damage',
    'water pipe',
    'pipe burst',
    'burst pipe',
  ],

  leakage_detection: ['leakage', 'water leak', 'leaking', 'leak', 'pipe leak', 'water seepage'],

  valve_maintenance: ['valve', 'water valve', 'broken valve'],

  tanker_management: ['tanker', 'water tanker', 'tanker delay'],

  water_quality_testing: [
    'dirty water',
    'contaminated water',
    'bad smell water',
    'muddy water',
    'unsafe water',
    'polluted water',
  ],

  waste_collection: [
    'waste collection',
    'garbage collection',
    'trash collection',
    'garbage',
    'trash',
    'rubbish',
  ],

  drain_cleaning: [
    'drain cleaning',
    'blocked drain',
    'clogged drain',
    'dirty drain',
    'drain blockage',
    'drain overflow',
  ],

  public_toilet_maintenance: [
    'public toilet',
    'toilet',
    'dirty toilet',
    'broken toilet',
    'community toilet',
  ],

  garbage_segregation: ['garbage segregation', 'waste segregation', 'mixed waste'],

  sewage_handling: ['sewage', 'sewerage', 'sewage overflow', 'sewage leak', 'sewer smell'],

  manhole_cleaning: ['manhole', 'open manhole', 'blocked manhole', 'manhole overflow'],

  flood_prevention: [
    'flood',
    'flooding',
    'waterlogging',
    'water logged',
    'standing water',
    'rain water',
    'road flooded',
  ],

  storm_water_management: ['storm water', 'rainwater', 'storm drain'],

  sewer_line_repair: ['sewer line', 'sewer pipe', 'sewer damage', 'broken sewer'],

  dumping_site_management: [
    'dumping site',
    'illegal dumping',
    'waste dumping',
    'garbage dump',
    'open dumping',
  ],

  waste_transportation: ['garbage vehicle', 'garbage truck', 'waste truck', 'waste vehicle'],

  recycling_operations: ['recycling', 'recycle', 'recyclable waste'],

  mosquito_control: [
    'mosquito',
    'mosquitoes',
    'mosquito breeding',
    'fogging',
    'dengue',
    'malaria',
    'stagnant water',
  ],

  disinfection: ['disinfection', 'sanitize', 'sanitization', 'chemical spray'],

  disease_prevention: ['disease', 'infection', 'fever', 'health risk'],

  sanitation_inspection: ['sanitation inspection', 'hygiene check', 'dirty area', 'unclean area'],
};

const PHRASE_NORMALIZATION: [RegExp, string][] = [
  [/pothole(s)?/g, 'pothole_repair'],
  [/road\s*hole(s)?/g, 'pothole_repair'],
  [/broken\s*road/g, 'pothole_repair'],
  [/damaged\s*road/g, 'pothole_repair'],

  [/street\s*light/g, 'street_light_repair'],
  [/streetlight/g, 'street_light_repair'],
  [/lamp\s*post/g, 'street_light_repair'],
  [/light\s*pole/g, 'street_light_repair'],
  [/light\s*not\s*working/g, 'street_light_repair'],
  [/dark\s*street/g, 'street_light_repair'],

  [/blocked\s*drain/g, 'drain_cleaning'],
  [/clogged\s*drain/g, 'drain_cleaning'],
  [/drain\s*overflow/g, 'drain_cleaning'],

  [/water\s*logging/g, 'flood_prevention'],
  [/waterlogging/g, 'flood_prevention'],
  [/flooding/g, 'flood_prevention'],
  [/standing\s*water/g, 'flood_prevention'],

  [/pipe\s*burst/g, 'pipeline_repair'],
  [/burst\s*pipe/g, 'pipeline_repair'],
  [/broken\s*pipe/g, 'pipeline_repair'],
  [/water\s*leakage/g, 'leakage_detection'],
  [/pipe\s*leak/g, 'leakage_detection'],

  [/garbage/g, 'waste_collection'],
  [/trash/g, 'waste_collection'],
  [/rubbish/g, 'waste_collection'],

  [/sewage/g, 'sewage_handling'],
  [/sewerage/g, 'sewage_handling'],

  [/mosquito(es)?/g, 'mosquito_control'],
  [/fogging/g, 'mosquito_control'],
  [/dengue/g, 'mosquito_control'],
  [/malaria/g, 'mosquito_control'],
];

function normalizeLabel(value = '') {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toKey(value = '') {
  return normalizeLabel(value).replace(/\s+/g, '_');
}

function normalizeSubcategory(value = '') {
  const phrase = normalizeLabel(value);
  const key = toKey(value);

  for (const [mainKey, aliases] of Object.entries(SUBCATEGORY_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeLabel);

    if (key === mainKey || normalizedAliases.includes(phrase)) {
      return mainKey;
    }
  }

  return key;
}

function normalizeText(text = '') {
  let value = normalizeLabel(text);

  PHRASE_NORMALIZATION.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });

  return value.replace(/\s+/g, ' ').trim();
}

function tokenize(text = '') {
  return [
    ...new Set(
      normalizeText(text)
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    ),
  ];
}

function jaccardSimilarity(wordsA: string[], wordsB: string[]) {
  if (!wordsA.length || !wordsB.length) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  const intersection = [...setA].filter((word) => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

function overlapSimilarity(wordsA: string[], wordsB: string[]) {
  if (!wordsA.length || !wordsB.length) return 0;

  const smaller = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const larger = new Set(wordsA.length <= wordsB.length ? wordsB : wordsA);

  const common = smaller.filter((word) => larger.has(word)).length;

  return common / smaller.length;
}

function textSimilarity(textA = '', textB = '') {
  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);

  if (!wordsA.length || !wordsB.length) return 0;

  const jaccard = jaccardSimilarity(wordsA, wordsB);
  const overlap = overlapSimilarity(wordsA, wordsB);

  return Number((jaccard * 0.6 + overlap * 0.4).toFixed(2));
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoordinates(issue: RawIssue) {
  const latitude = Number(issue.coordinates?.latitude ?? issue.latitude);
  const longitude = Number(issue.coordinates?.longitude ?? issue.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getProximitySimilarity(distanceMeters: number) {
  if (distanceMeters <= 100) return 1;
  if (distanceMeters <= 200) return 0.85;
  if (distanceMeters <= 300) return 0.7;
  if (distanceMeters <= 500) return 0.45;
  return 0;
}

function getDuplicateLevel(score: number): DuplicatePairMetrics['duplicateLevel'] {
  if (score >= 90) return 'Almost Certain Duplicate';
  if (score >= 80) return 'Strong Duplicate';
  return 'Possible Duplicate';
}

function getDistanceScore(distanceMeters: number) {
  if (distanceMeters <= 100) return 50;
  if (distanceMeters <= 200) return 40;
  if (distanceMeters <= 300) return 30;
  return 0;
}

function getCategoryScore(categoryA = '', categoryB = '') {
  const a = toKey(categoryA);
  const b = toKey(categoryB);

  if (!a || !b) return 0;
  if (a === b) return 15;

  const related = CATEGORY_COMPATIBILITY[a] ?? [];
  return related.includes(b) ? 7 : 0;
}

function getSubcategoryResult(subA: string[] = [], subB: string[] = []) {
  const normalizedA = subA.map(normalizeSubcategory);
  const normalizedB = subB.map(normalizeSubcategory);

  const setB = new Set(normalizedB);

  const matchedNormalized = normalizedA.filter((item) => setB.has(item));

  const matchedLabels = matchedNormalized.map((item) =>
    item
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );

  return {
    matched: matchedNormalized.length > 0,
    matchedNormalized,
    matchedLabels,
  };
}

function buildMobileIssue(issue: RawIssue): Issue | null {
  const coordinates = getCoordinates(issue);

  if (!coordinates) return null;

  const id = String(issue.id ?? issue._id ?? '');

  if (!id) return null;

  const subCategories = issue.subCategories ?? issue.subcategory ?? [];

  return {
    id,
    title: issue.title ?? 'Untitled Issue',
    description: issue.description ?? '',

    category: issue.category ?? 'other',
    subCategories,

    priority: issue.priority ?? 'Medium',
    status: issue.status ?? 'Pending',
    location: issue.address ?? 'Unknown location',
    ward: issue.ward ?? 'N/A',

    reportedBy: issue.reportedBy,

    citizenName: issue.citizenDetails?.fullName ?? 'Unknown',
    citizenEmail: issue.citizenDetails?.email ?? 'N/A',
    citizenPhone: issue.citizenDetails?.phone ?? 'N/A',

    dateReported: issue.createdAt ?? issue.dateReported ?? new Date().toISOString(),
    createdAt: issue.createdAt ?? issue.dateReported ?? new Date().toISOString(),

    beforePhotos: issue.beforePhotos ?? [],
    issueUpdates: issue.issueUpdates ?? [],

    slaDeadline: issue.slaDeadline,
    coordinates,
  };
}

function compareIssues(issueA: Issue, issueB: Issue): DuplicatePairMetrics {
  const distanceMeters = haversineDistanceMeters(
    issueA.coordinates.latitude,
    issueA.coordinates.longitude,
    issueB.coordinates.latitude,
    issueB.coordinates.longitude
  );

  const titleSimilarity = textSimilarity(issueA.title, issueB.title);
  const descriptionSimilarity = textSimilarity(issueA.description, issueB.description);
  const locationSimilarity = textSimilarity(issueA.location, issueB.location);

  const categoryScore = getCategoryScore(issueA.category, issueB.category);
  const categoryMatch = toKey(issueA.category) === toKey(issueB.category);

  const subCategoryResult = getSubcategoryResult(issueA.subCategories, issueB.subCategories);

  const proximitySimilarity = getProximitySimilarity(distanceMeters);

  let duplicateScore = 0;
  const reasons: string[] = [];

  const distanceScore = getDistanceScore(distanceMeters);

  if (distanceScore > 0) {
    duplicateScore += distanceScore;
    reasons.push(`Nearby location (${Math.round(distanceMeters)}m away)`);
  }

  if (categoryScore === 15) {
    duplicateScore += 15;
    reasons.push('Same category');
  } else if (categoryScore === 7) {
    duplicateScore += 7;
    reasons.push('Related category');
  }

  if (subCategoryResult.matched) {
    duplicateScore += 10;
    reasons.push(`Matching subcategory: ${subCategoryResult.matchedLabels.join(', ')}`);
  }

  if (titleSimilarity >= 0.45) {
    duplicateScore += Math.round(titleSimilarity * 15);
    reasons.push(`Similar title (${Math.round(titleSimilarity * 100)}%)`);
  }

  if (descriptionSimilarity >= 0.35) {
    duplicateScore += Math.round(descriptionSimilarity * 13);
    reasons.push(`Similar description (${Math.round(descriptionSimilarity * 100)}%)`);
  }

  if (distanceMeters <= 200 && categoryMatch && subCategoryResult.matched) {
    duplicateScore += 5;
    reasons.push('Strong location-category-subcategory match');
  }

  duplicateScore = Math.min(duplicateScore, 100);

  const overallScore =
    titleSimilarity * 0.25 +
    descriptionSimilarity * 0.2 +
    locationSimilarity * 0.15 +
    (categoryMatch ? 1 : categoryScore > 0 ? 0.5 : 0) * 0.15 +
    (subCategoryResult.matched ? 1 : 0) * 0.1 +
    proximitySimilarity * 0.15;

  return {
    issueAId: issueA.id,
    issueBId: issueB.id,

    overallScore: Number(overallScore.toFixed(2)),
    duplicateScore,
    duplicateLevel: getDuplicateLevel(duplicateScore),

    distanceMeters,
    titleSimilarity,
    descriptionSimilarity,
    locationSimilarity,
    categoryMatch,
    subCategoryMatch: subCategoryResult.matched,
    proximitySimilarity,

    matchedSubCategories: subCategoryResult.matchedLabels,
    reasons,
  };
}

function createGroupReason(pairMetrics: DuplicatePairMetrics[]) {
  const bestPair = [...pairMetrics].sort((a, b) => b.duplicateScore - a.duplicateScore)[0];

  if (!bestPair) {
    return 'Potential duplicate reports detected from the same citizen';
  }

  const reasonParts: string[] = [];

  if (bestPair.distanceMeters <= 300) {
    reasonParts.push('nearby location');
  }

  if (bestPair.categoryMatch) {
    reasonParts.push('same category');
  }

  if (bestPair.subCategoryMatch) {
    reasonParts.push('matching subcategory');
  }

  if (bestPair.titleSimilarity >= 0.45) {
    reasonParts.push('similar title');
  }

  if (bestPair.descriptionSimilarity >= 0.35) {
    reasonParts.push('similar description');
  }

  return `Same citizen submitted reports with ${reasonParts.join(', ')}`;
}

function getConnectedComponents(issueIds: string[], matchingPairs: DuplicatePairMetrics[]) {
  const adjacency = new Map<string, Set<string>>();

  issueIds.forEach((id) => adjacency.set(id, new Set()));

  matchingPairs.forEach((pair) => {
    adjacency.get(pair.issueAId)?.add(pair.issueBId);
    adjacency.get(pair.issueBId)?.add(pair.issueAId);
  });

  const visited = new Set<string>();
  const components: string[][] = [];

  issueIds.forEach((id) => {
    if (visited.has(id)) return;

    const stack = [id];
    const component: string[] = [];

    visited.add(id);

    while (stack.length) {
      const current = stack.pop()!;
      component.push(current);

      adjacency.get(current)?.forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }

    if (component.length > 1) {
      components.push(component);
    }
  });

  return components;
}

export function buildDuplicateGroupsFromIssues(rawIssues: RawIssue[]): DuplicateGroup[] {
  const issues = rawIssues
    .map(buildMobileIssue)
    .filter((issue): issue is Issue => Boolean(issue?.reportedBy));

  const issuesByCitizen = new Map<string, Issue[]>();

  issues.forEach((issue) => {
    const citizenId = issue.reportedBy!;

    if (!issuesByCitizen.has(citizenId)) {
      issuesByCitizen.set(citizenId, []);
    }

    issuesByCitizen.get(citizenId)!.push(issue);
  });

  const groups: DuplicateGroup[] = [];

  issuesByCitizen.forEach((citizenIssues, citizenId) => {
    if (citizenIssues.length < 2) return;

    const pairMetrics: DuplicatePairMetrics[] = [];

    for (let i = 0; i < citizenIssues.length; i++) {
      for (let j = i + 1; j < citizenIssues.length; j++) {
        const pair = compareIssues(citizenIssues[i], citizenIssues[j]);

        if (pair.duplicateScore >= DUPLICATE_THRESHOLD) {
          pairMetrics.push(pair);
        }
      }
    }

    if (!pairMetrics.length) return;

    const components = getConnectedComponents(
      citizenIssues.map((issue) => issue.id),
      pairMetrics
    );

    components.forEach((componentIds, index) => {
      const componentIssues = citizenIssues.filter((issue) => componentIds.includes(issue.id));

      const componentPairs = pairMetrics.filter(
        (pair) => componentIds.includes(pair.issueAId) && componentIds.includes(pair.issueBId)
      );

      if (componentIssues.length < 2 || componentPairs.length < 1) return;

      const bestOverallScore = Math.max(...componentPairs.map((p) => p.overallScore));
      const bestDuplicateScore = Math.max(...componentPairs.map((p) => p.duplicateScore));
      const averageOverallScore =
        componentPairs.reduce((sum, pair) => sum + pair.overallScore, 0) / componentPairs.length;
      const minimumDistanceMeters = Math.min(...componentPairs.map((p) => p.distanceMeters));

      const firstIssue = componentIssues[0];

      groups.push({
        id: `dup-${citizenId}-${index + 1}`,

        citizenId,
        citizenName: firstIssue.citizenName as string,
        citizenEmail: firstIssue.citizenEmail as string,
        citizenPhone: firstIssue.citizenPhone,

        detectedAt: new Date().toISOString(),
        similarityReason: createGroupReason(componentPairs),
        resolved: false,

        issues: componentIssues.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),

        similarityMetrics: {
          bestOverallScore: Number(bestOverallScore.toFixed(2)),
          averageOverallScore: Number(averageOverallScore.toFixed(2)),
          bestDuplicateScore,
          minimumDistanceMeters,
          pairCount: componentPairs.length,
          reasons: [...new Set(componentPairs.flatMap((pair) => pair.reasons))],
        },

        pairMetrics: componentPairs,
      });
    });
  });

  return groups.sort(
    (a, b) => b.similarityMetrics.bestDuplicateScore - a.similarityMetrics.bestDuplicateScore
  );
}
