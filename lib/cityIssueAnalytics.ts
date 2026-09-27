/**
 * Pure analytics computation library for CityCare City Issue Analytics.
 * Strict read-only computations: no database write operations.
 */

export const TERMINAL_STATUSES = new Set(['resolved', 'closed', 'rejected', 'withdrawn']);

export const ACTIVE_STATUSES = new Set([
  'reported',
  'pending',
  'verified',
  'assigned',
  'in_progress',
  'pending_uo_verification',
  'rework_required',
  'reopened',
  'escalated',
]);

export const DUPLICATE_THRESHOLD = 60;

export const STOP_WORDS = new Set([
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

export const CATEGORY_COMPATIBILITY = {
  road: ['drainage', 'water', 'sanitation'],
  electricity: [],
  water: ['drainage', 'road', 'public_health'],
  sanitation: ['solid_waste', 'drainage', 'public_health'],
  drainage: ['road', 'water', 'sanitation'],
  solid_waste: ['sanitation', 'public_health'],
  public_health: ['sanitation', 'solid_waste', 'water'],
  other: [],
};

export const SUBCATEGORY_ALIASES = {
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

export const PHRASE_NORMALIZATION = [
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

export function normalizeLocation(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeLabel(value = '') {
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

export function toKey(value = '') {
  return normalizeLabel(value).replace(/\s+/g, '_');
}

export function normalizeKey(value = '') {
  return toKey(value);
}

export function normalizeSubcategory(value = '') {
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

export function normalizeText(text = '') {
  let value = normalizeLabel(text);
  PHRASE_NORMALIZATION.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });
  return value.replace(/\s+/g, ' ').trim();
}

export function tokenize(text = '') {
  return [
    ...new Set(
      normalizeText(text)
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    ),
  ];
}

export function jaccardSimilarity(wordsA, wordsB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersection = [...setA].filter((word) => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function overlapSimilarity(wordsA, wordsB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const smaller = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const larger = new Set(wordsA.length <= wordsB.length ? wordsB : wordsA);
  const common = smaller.filter((word) => larger.has(word)).length;
  return common / smaller.length;
}

export function textSimilarity(textA = '', textB = '') {
  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);
  if (!wordsA.length || !wordsB.length) return 0;
  const jaccard = jaccardSimilarity(wordsA, wordsB);
  const overlap = overlapSimilarity(wordsA, wordsB);
  return Number((jaccard * 0.6 + overlap * 0.4).toFixed(2));
}

export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (degree) => (degree * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getProximitySimilarity(distanceMeters) {
  if (distanceMeters <= 100) return 1;
  if (distanceMeters <= 200) return 0.85;
  if (distanceMeters <= 300) return 0.7;
  if (distanceMeters <= 500) return 0.45;
  return 0;
}

export function getDuplicateLevel(score) {
  if (score >= 90) return 'Almost Certain Duplicate';
  if (score >= 80) return 'Strong Duplicate';
  if (score >= 60) return 'Possible Duplicate';
  return 'Low Similarity';
}

export function getDistanceScore(distanceMeters) {
  if (distanceMeters <= 100) return 50;
  if (distanceMeters <= 200) return 40;
  if (distanceMeters <= 300) return 30;
  return 0;
}

export function getCategoryScore(categoryA = '', categoryB = '') {
  const a = toKey(categoryA);
  const b = toKey(categoryB);
  if (!a || !b) return 0;
  if (a === b) return 15;
  const related = CATEGORY_COMPATIBILITY[a] ?? [];
  return related.includes(b) ? 7 : 0;
}

export function getSubcategoryResult(subA = [], subB = []) {
  const normalizedA = (Array.isArray(subA) ? subA : [subA])
    .filter(Boolean)
    .map(normalizeSubcategory);
  const normalizedB = (Array.isArray(subB) ? subB : [subB])
    .filter(Boolean)
    .map(normalizeSubcategory);

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

export function parseCoordinate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function safePercentage(numerator, denominator, digits = 1) {
  if (!denominator || denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(digits));
}

export function calculateMedian(values) {
  const valid = (values || [])
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (valid.length === 0) return 0;
  const middle = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    return Number(((valid[middle - 1] + valid[middle]) / 2).toFixed(1));
  }
  return Number(valid[middle].toFixed(1));
}

export function getRangeStart(range, now = Date.now()) {
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (range === '7d') {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  if (range === '30d') {
    return now - 30 * 24 * 60 * 60 * 1000;
  }
  if (range === '90d') {
    return now - 90 * 24 * 60 * 60 * 1000;
  }
  return null; // "all"
}

export function getPreviousRangeBounds(range, now = Date.now()) {
  if (range === 'today') {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const start = todayStart.getTime() - 24 * 60 * 60 * 1000;
    const end = todayStart.getTime() - 1;
    return { start, end };
  }
  if (range === '7d') {
    const end = now - 7 * 24 * 60 * 60 * 1000;
    const start = end - 7 * 24 * 60 * 60 * 1000;
    return { start, end };
  }
  if (range === '30d') {
    const end = now - 30 * 24 * 60 * 60 * 1000;
    const start = end - 30 * 24 * 60 * 60 * 1000;
    return { start, end };
  }
  if (range === '90d') {
    const end = now - 90 * 24 * 60 * 60 * 1000;
    const start = end - 90 * 24 * 60 * 60 * 1000;
    return { start, end };
  }
  return null;
}

export function getIssueId(issue) {
  if (!issue) return null;
  const value = issue._id ?? issue.id ?? null;
  return value ? String(value) : null;
}

export function getPossibleDuplicateIds(issue) {
  if (!issue) return [];
  const candidates = [
    issue.possibleDuplicateIds,
    issue.duplicateIssueIds,
    issue.possible_duplicate_ids,
  ];
  for (const val of candidates) {
    if (Array.isArray(val)) {
      return val;
    }
  }
  return [];
}

export function getIssueCreatedAt(issue) {
  if (!issue) return null;
  const value = issue.createdAt ?? issue._creationTime ?? null;
  if (value === null || value === undefined) return null;
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function buildAnalyticsIssue(issue) {
  if (!issue) return null;
  const id = getIssueId(issue);
  if (!id) return null;

  const latitude = Number(issue.coordinates?.latitude ?? issue.latitude);
  const longitude = Number(issue.coordinates?.longitude ?? issue.longitude);

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const subcategories = Array.isArray(issue.subcategory)
    ? issue.subcategory
    : issue.subcategory
      ? [issue.subcategory]
      : Array.isArray(issue.subCategories)
        ? issue.subCategories
        : [];

  return {
    id,
    rawIssue: issue,
    title: issue.title || '',
    description: issue.description || '',
    category: issue.category || issue.department || 'other',
    department: issue.department || issue.category || 'other',
    subCategories: subcategories,
    priority: issue.priority || 'medium',
    status: issue.status || 'unknown',
    location: issue.address || '',
    reportedBy: issue.reportedBy ? String(issue.reportedBy) : null,
    createdAt: getIssueCreatedAt(issue),
    coordinates: hasCoordinates ? { latitude, longitude } : null,
  };
}

export function shouldCompareIssues(issueA, issueB) {
  const categoryA = toKey(issueA.category);
  const categoryB = toKey(issueB.category);

  const sameCategory = Boolean(categoryA && categoryA === categoryB);
  const compatibleCategory =
    (CATEGORY_COMPATIBILITY[categoryA] || []).includes(categoryB) ||
    (CATEGORY_COMPATIBILITY[categoryB] || []).includes(categoryA);

  const sameDepartment = Boolean(
    toKey(issueA.department) && toKey(issueA.department) === toKey(issueB.department)
  );

  const sameCitizen = Boolean(
    issueA.reportedBy && issueB.reportedBy && issueA.reportedBy === issueB.reportedBy
  );

  let withinCandidateDistance = false;
  if (issueA.coordinates && issueB.coordinates) {
    const distance = haversineDistanceMeters(
      issueA.coordinates.latitude,
      issueA.coordinates.longitude,
      issueB.coordinates.latitude,
      issueB.coordinates.longitude
    );
    withinCandidateDistance = distance <= 500;
  }

  return (
    sameCategory || compatibleCategory || sameDepartment || sameCitizen || withinCandidateDistance
  );
}

export function compareIssuesForDuplicate(issueA, issueB) {
  const hasBothCoordinates = Boolean(issueA.coordinates && issueB.coordinates);

  const distanceMeters = hasBothCoordinates
    ? haversineDistanceMeters(
        issueA.coordinates.latitude,
        issueA.coordinates.longitude,
        issueB.coordinates.latitude,
        issueB.coordinates.longitude
      )
    : null;

  const titleSimilarity = textSimilarity(issueA.title, issueB.title);
  const descriptionSimilarity = textSimilarity(issueA.description, issueB.description);
  const locationSimilarity = textSimilarity(issueA.location, issueB.location);

  const categoryScore = getCategoryScore(issueA.category, issueB.category);
  const categoryMatch = toKey(issueA.category) === toKey(issueB.category);
  const categoryCompatible =
    (CATEGORY_COMPATIBILITY[toKey(issueA.category)] || []).includes(toKey(issueB.category)) ||
    (CATEGORY_COMPATIBILITY[toKey(issueB.category)] || []).includes(toKey(issueA.category));

  const subCategoryResult = getSubcategoryResult(issueA.subCategories, issueB.subCategories);

  const distanceScore = distanceMeters === null ? 0 : getDistanceScore(distanceMeters);
  const proximitySimilarity = distanceMeters === null ? 0 : getProximitySimilarity(distanceMeters);

  let duplicateScore = 0;
  const reasons = [];

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

  if (
    distanceMeters !== null &&
    distanceMeters <= 200 &&
    categoryMatch &&
    subCategoryResult.matched
  ) {
    duplicateScore += 5;
    reasons.push('Strong location-category-subcategory match');
  }

  duplicateScore = Math.min(duplicateScore, 100);

  const overallScore = Number(
    (
      titleSimilarity * 0.25 +
      descriptionSimilarity * 0.2 +
      locationSimilarity * 0.15 +
      (categoryMatch ? 1 : categoryScore > 0 ? 0.5 : 0) * 0.15 +
      (subCategoryResult.matched ? 1 : 0) * 0.1 +
      proximitySimilarity * 0.15
    ).toFixed(2)
  );

  return {
    issueAId: issueA.id,
    issueBId: issueB.id,
    duplicateScore,
    overallScore,
    duplicateLevel: getDuplicateLevel(duplicateScore),
    distanceMeters: distanceMeters !== null ? Math.round(distanceMeters) : null,
    titleSimilarity,
    descriptionSimilarity,
    locationSimilarity,
    categoryMatch,
    categoryCompatible,
    subCategoryMatch: subCategoryResult.matched,
    matchedSubCategories: subCategoryResult.matchedLabels,
    reasons,
  };
}

export function calculateDuplicatePairs(rawIssues, options = {}) {
  const { threshold = DUPLICATE_THRESHOLD } = options;
  const issues = rawIssues.map(buildAnalyticsIssue).filter(Boolean);
  const pairs = [];

  for (let i = 0; i < issues.length; i++) {
    for (let j = i + 1; j < issues.length; j++) {
      const issueA = issues[i];
      const issueB = issues[j];

      if (!shouldCompareIssues(issueA, issueB)) {
        continue;
      }

      const pair = compareIssuesForDuplicate(issueA, issueB);
      if (pair.duplicateScore >= threshold) {
        pairs.push({
          ...pair,
          source: 'calculated',
          sameCitizen: Boolean(
            issueA.reportedBy && issueB.reportedBy && issueA.reportedBy === issueB.reportedBy
          ),
        });
      }
    }
  }

  return { issues, pairs };
}

export function buildPersistedDuplicatePairs(rawIssues) {
  const issueMap = new Map(rawIssues.map((issue) => [getIssueId(issue), issue]));
  const pairKeys = new Set();
  const pairs = [];

  for (const issue of rawIssues) {
    const sourceId = getIssueId(issue);
    if (!sourceId) continue;

    for (const duplicateId of getPossibleDuplicateIds(issue)) {
      const targetId = String(duplicateId);
      if (!targetId || targetId === sourceId || !issueMap.has(targetId)) {
        continue;
      }

      const pairKey = [sourceId, targetId].sort().join('::');
      if (pairKeys.has(pairKey)) {
        continue;
      }

      pairKeys.add(pairKey);
      pairs.push({
        issueAId: sourceId,
        issueBId: targetId,
        duplicateScore: 100,
        overallScore: 1,
        duplicateLevel: 'Persisted Duplicate',
        reasons: ['Persisted possibleDuplicateIds relationship'],
        source: 'persisted',
        distanceMeters: null,
      });
    }
  }

  return pairs;
}

export function getPairKey(issueAId, issueBId) {
  return [String(issueAId), String(issueBId)].sort().join('::');
}

export function mergeDuplicatePairs(persistedPairs, calculatedPairs) {
  const pairMap = new Map();

  for (const pair of calculatedPairs) {
    pairMap.set(getPairKey(pair.issueAId, pair.issueBId), pair);
  }

  for (const pair of persistedPairs) {
    const key = getPairKey(pair.issueAId, pair.issueBId);
    const existing = pairMap.get(key);

    if (existing) {
      pairMap.set(key, {
        ...existing,
        source: 'persisted_and_calculated',
        persisted: true,
        reasons: Array.from(new Set([...(existing.reasons || []), ...(pair.reasons || [])])),
      });
    } else {
      pairMap.set(key, pair);
    }
  }

  return Array.from(pairMap.values());
}

export function buildCalculatedDuplicateGroups(rawIssues, pairs) {
  const issueMap = new Map(rawIssues.map((issue) => [getIssueId(issue), issue]));
  const adjacency = new Map();

  for (const pair of pairs) {
    const issueAId = String(pair.issueAId);
    const issueBId = String(pair.issueBId);

    if (!issueMap.has(issueAId) || !issueMap.has(issueBId)) {
      continue;
    }

    if (!adjacency.has(issueAId)) adjacency.set(issueAId, new Set());
    if (!adjacency.has(issueBId)) adjacency.set(issueBId, new Set());

    adjacency.get(issueAId).add(issueBId);
    adjacency.get(issueBId).add(issueAId);
  }

  const visited = new Set();
  const groups = [];

  for (const issueId of adjacency.keys()) {
    if (visited.has(issueId)) continue;

    const stack = [issueId];
    const memberIds = [];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;

      visited.add(current);
      memberIds.push(current);

      for (const neighbour of adjacency.get(current) || []) {
        if (!visited.has(neighbour)) {
          stack.push(neighbour);
        }
      }
    }

    if (memberIds.length > 1) {
      const members = memberIds
        .map((id) => issueMap.get(id))
        .filter(Boolean)
        .sort((a, b) => (getIssueCreatedAt(a) ?? 0) - (getIssueCreatedAt(b) ?? 0));

      const componentPairs = pairs.filter(
        (pair) =>
          memberIds.includes(String(pair.issueAId)) && memberIds.includes(String(pair.issueBId))
      );

      groups.push({
        members,
        pairs: componentPairs,
      });
    }
  }

  return groups;
}

export function enrichCalculatedDuplicateGroup(group, index) {
  const rawMembers = group.members || [];
  const members = [...rawMembers].sort(
    (a, b) => (getIssueCreatedAt(a) ?? 0) - (getIssueCreatedAt(b) ?? 0)
  );

  const anchorIssue = members[0]; // Earliest Report
  const memberCount = members.length;
  const redundantIssueCount = Math.max(0, memberCount - 1);

  const firstReportedAt = getIssueCreatedAt(anchorIssue);
  const latestMember = members[members.length - 1];
  const latestReportedAt = getIssueCreatedAt(latestMember);
  const timeSpanMs = Math.max(0, (latestReportedAt || 0) - (firstReportedAt || 0));
  const timeSpanHours = Number((timeSpanMs / (1000 * 60 * 60)).toFixed(1));

  const category = anchorIssue.category || 'General';
  const department = anchorIssue.department || anchorIssue.category || 'General';

  const categories = Array.from(
    new Set(members.map((m) => normalizeKey(m.category)).filter(Boolean))
  );

  const departments = Array.from(
    new Set(members.map((m) => normalizeKey(m.department || m.category)).filter(Boolean))
  );

  const pairs = group.pairs || [];
  const pairCount = pairs.length;

  const bestDuplicateScore =
    pairs.length > 0 ? Math.max(...pairs.map((p) => p.duplicateScore)) : 100;

  const averageDuplicateScore =
    pairs.length > 0
      ? Number((pairs.reduce((sum, p) => sum + p.duplicateScore, 0) / pairs.length).toFixed(1))
      : 100;

  const distances = pairs
    .map((p) => p.distanceMeters)
    .filter((d) => typeof d === 'number' && Number.isFinite(d));
  const minimumDistanceMeters = distances.length > 0 ? Math.min(...distances) : null;

  const duplicateLevel = getDuplicateLevel(bestDuplicateScore);
  const detectionSources = Array.from(new Set(pairs.map((p) => p.source || 'calculated')));
  const reasons = Array.from(new Set(pairs.flatMap((p) => p.reasons || [])));

  // Distributions & Status Counts
  const statusDistribution = {};
  const priorityDistribution = {};
  let activeMemberCount = 0;
  let resolvedMemberCount = 0;
  let escalatedMemberCount = 0;
  let breachedMemberCount = 0;

  for (const m of members) {
    const st = m.status || 'unknown';
    statusDistribution[st] = (statusDistribution[st] || 0) + 1;

    const pr = m.priority || 'medium';
    priorityDistribution[pr] = (priorityDistribution[pr] || 0) + 1;

    if (!TERMINAL_STATUSES.has(st)) {
      activeMemberCount++;
    } else if (st === 'resolved' || st === 'closed') {
      resolvedMemberCount++;
    }

    if (m.escalatedToAdmin || m.is_escalated || m.escalation?.isEscalated) {
      escalatedMemberCount++;
    }

    if (m.slaBreached || m.sla?.status === 'breached') {
      breachedMemberCount++;
    }
  }

  return {
    groupId: `dup-group-${index + 1}-${getIssueId(anchorIssue)}`,
    anchorIssueId: getIssueId(anchorIssue),
    anchorIssueCode: anchorIssue.issueCode || anchorIssue.code,
    anchorIssueTitle: anchorIssue.title,
    memberCount,
    redundantIssueCount,
    firstReportedAt,
    latestReportedAt,
    timeSpanHours,
    category,
    department,
    categories,
    departments,
    address: anchorIssue.address || 'Location unavailable',
    statusDistribution,
    priorityDistribution,
    activeMemberCount,
    resolvedMemberCount,
    escalatedMemberCount,
    breachedMemberCount,
    bestDuplicateScore,
    averageDuplicateScore,
    minimumDistanceMeters,
    pairCount,
    duplicateLevel,
    detectionSources,
    reasons,
    pairMetrics: pairs,
    members: members.map((m) => ({
      id: getIssueId(m),
      code: m.issueCode || m.code,
      title: m.title,
      description: m.description,
      category: m.category,
      subcategory: Array.isArray(m.subcategory)
        ? m.subcategory
        : m.subcategory
          ? [m.subcategory]
          : [],
      department: m.department || m.category,
      priority: m.priority || 'medium',
      status: m.status,
      address: m.address,
      createdAt: getIssueCreatedAt(m),
      assignedUnitOfficer: m.assignedUnitOfficerName || m.assignedUnitOfficer || null,
      assignedFieldOfficer: m.assignedFieldOfficerName || m.assignedFieldOfficer || null,
      slaDeadline: m.slaDeadline ?? m.sla?.deadline ?? null,
      slaBreached: Boolean(m.slaBreached || m.sla?.status === 'breached'),
      isEscalated: Boolean(m.escalatedToAdmin || m.escalation?.isEscalated),
      isReopened: Boolean(m.isReopened || m.reopenCount > 0),
    })),
  };
}

/**
 * Backward-compatible helper functions
 */
export function buildDuplicateGroups(issues, options = {}) {
  const { pairs: calculatedPairs } = calculateDuplicatePairs(issues, options);
  const persistedPairs = buildPersistedDuplicatePairs(issues);
  const duplicatePairs = mergeDuplicatePairs(persistedPairs, calculatedPairs);
  const rawGroups = buildCalculatedDuplicateGroups(issues, duplicatePairs);
  return rawGroups.map((g) => g.members);
}

export function enrichDuplicateGroup(group, index) {
  const rawMembers = Array.isArray(group) ? group : group.members || [];
  return enrichCalculatedDuplicateGroup({ members: rawMembers, pairs: [] }, index);
}

export function buildTimeBuckets(issues, range, now = Date.now(), options = {}) {
  let bucketType = 'day';
  let bucketCount = 7;
  let startMs = now - 7 * 24 * 60 * 60 * 1000;

  if (range === 'today') {
    bucketType = 'hour';
    bucketCount = 24;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    startMs = todayStart.getTime();
  } else if (range === '7d') {
    bucketType = 'day';
    bucketCount = 7;
    startMs = now - 7 * 24 * 60 * 60 * 1000;
  } else if (range === '30d') {
    bucketType = 'day';
    bucketCount = 30;
    startMs = now - 30 * 24 * 60 * 60 * 1000;
  } else if (range === '90d') {
    bucketType = 'week';
    bucketCount = 13;
    startMs = now - 13 * 7 * 24 * 60 * 60 * 1000;
  } else {
    bucketType = 'month';
    bucketCount = 12;
    startMs = now - 365 * 24 * 60 * 60 * 1000;
  }

  const buckets = [];
  const labels = [];

  for (let i = 0; i < bucketCount; i++) {
    let bStart = 0;
    let bEnd = 0;
    let label = '';

    if (bucketType === 'hour') {
      bStart = startMs + i * 60 * 60 * 1000;
      bEnd = bStart + 60 * 60 * 1000 - 1;
      label = `${String(i).padStart(2, '0')}:00`;
    } else if (bucketType === 'day') {
      bStart = startMs + i * 24 * 60 * 60 * 1000;
      bEnd = bStart + 24 * 60 * 60 * 1000 - 1;
      const d = new Date(bStart);
      label = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (bucketType === 'week') {
      bStart = startMs + i * 7 * 24 * 60 * 60 * 1000;
      bEnd = bStart + 7 * 24 * 60 * 60 * 1000 - 1;
      const d = new Date(bStart);
      label = `W${i + 1} (${d.getMonth() + 1}/${d.getDate()})`;
    } else {
      const d = new Date(startMs);
      d.setMonth(d.getMonth() + i);
      bStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      bEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      label = d.toLocaleString('default', { month: 'short' });
    }

    buckets.push({ start: bStart, end: bEnd, label });
    labels.push(label);
  }

  const issueVolume = new Array(bucketCount).fill(0);
  const resolvedVolume = new Array(bucketCount).fill(0);
  const duplicateLinkedVolume = new Array(bucketCount).fill(0);
  const escalationVolume = new Array(bucketCount).fill(0);
  const slaBreachVolume = new Array(bucketCount).fill(0);
  const reopenedVolume = new Array(bucketCount).fill(0);

  const externalDuplicateLinkedIds = options.duplicateLinkedIssueIds;
  const duplicateLinkedSet = externalDuplicateLinkedIds
    ? new Set([...externalDuplicateLinkedIds].map((id) => String(id)))
    : new Set();

  if (!externalDuplicateLinkedIds) {
    issues.forEach((issue) => {
      const dupIds = getPossibleDuplicateIds(issue);
      if (dupIds.length > 0) {
        const id = getIssueId(issue);
        if (id) duplicateLinkedSet.add(id);
      }
    });
  }

  for (const issue of issues) {
    const created = issue.createdAt ?? issue._creationTime ?? 0;
    const issueId = getIssueId(issue);
    if (!created) continue;

    for (let idx = 0; idx < bucketCount; idx++) {
      const b = buckets[idx];
      if (created >= b.start && created <= b.end) {
        issueVolume[idx]++;
        if (issue.status === 'resolved' || issue.status === 'closed') {
          resolvedVolume[idx]++;
        }
        if (issueId && duplicateLinkedSet.has(issueId)) {
          duplicateLinkedVolume[idx]++;
        }
        if (issue.escalatedToAdmin || issue.is_escalated || issue.escalation?.isEscalated) {
          escalationVolume[idx]++;
        }
        if (issue.slaBreached || issue.sla?.status === 'breached') {
          slaBreachVolume[idx]++;
        }
        if (issue.isReopened || issue.reopenCount > 0) {
          reopenedVolume[idx]++;
        }
        break;
      }
    }
  }

  return {
    bucketType,
    labels,
    issueVolume,
    resolvedVolume,
    duplicateLinkedVolume,
    escalationVolume,
    slaBreachVolume,
    reopenedVolume,
  };
}
