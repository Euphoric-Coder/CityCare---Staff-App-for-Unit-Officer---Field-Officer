export type IssueStatus =
  | 'pending'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'pending_uo_verification'
  | 'rework_required'
  | 'reopened'
  | 'escalated'
  | 'closed'
  | 'resolved'
  | 'withdrawn'
  | 'rejected';

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export type IssueCategory =
  | 'Pothole'
  | 'Street Light'
  | 'Waste Management'
  | 'Water Supply'
  | 'Drainage'
  | 'Road Repair'
  | 'Park Maintenance'
  | 'Public Safety';

export type CategoryKey =
  | 'road'
  | 'electricity'
  | 'water'
  | 'sanitation'
  | 'drainage'
  | 'solid_waste'
  | 'public_health'
  | 'other';

export const SUBCATEGORY_MAP: Record<CategoryKey, IssueSubCategory[]> = {
  sanitation: [
    'Waste Collection',
    'Drain Cleaning',
    'Public Toilet Maintenance',
    'Garbage Segregation',
    'Sewage Handling',
  ],

  road: [
    'Pothole Repair',
    'Asphalt Laying',
    'Footpath Repair',
    'Speed Breaker Construction',
    'Road Marking',
  ],

  water: [
    'Pipeline Repair',
    'Leakage Detection',
    'Valve Maintenance',
    'Tanker Management',
    'Water Quality Testing',
  ],

  electricity: [
    'Street Light Repair',
    'Cable Maintenance',
    'Transformer Inspection',
    'Meter Repair',
  ],

  drainage: ['Manhole Cleaning', 'Flood Prevention', 'Storm Water Management', 'Sewer Line Repair'],

  solid_waste: ['Dumping Site Management', 'Waste Transportation', 'Recycling Operations'],

  public_health: [
    'Mosquito Control',
    'Disinfection',
    'Disease Prevention',
    'Sanitation Inspection',
  ],

  other: ['General Issue'],
};

export type IssueSubCategory =
  | 'Waste Collection'
  | 'Drain Cleaning'
  | 'Public Toilet Maintenance'
  | 'Garbage Segregation'
  | 'Sewage Handling'
  | 'Pothole Repair'
  | 'Asphalt Laying'
  | 'Footpath Repair'
  | 'Speed Breaker Construction'
  | 'Road Marking'
  | 'Pipeline Repair'
  | 'Leakage Detection'
  | 'Valve Maintenance'
  | 'Tanker Management'
  | 'Water Quality Testing'
  | 'Street Light Repair'
  | 'Cable Maintenance'
  | 'Transformer Inspection'
  | 'Meter Repair'
  | 'Manhole Cleaning'
  | 'Flood Prevention'
  | 'Storm Water Management'
  | 'Sewer Line Repair'
  | 'Dumping Site Management'
  | 'Waste Transportation'
  | 'Recycling Operations'
  | 'Mosquito Control'
  | 'Disinfection'
  | 'Disease Prevention'
  | 'Sanitation Inspection'
  | 'General Issue';

export type RejectionReason =
  | 'Duplicate'
  | 'Spam / Fake'
  | 'Outside Jurisdiction'
  | 'Insufficient Evidence'
  | 'Invalid Location'
  | 'Other';

export type ReassignmentReason =
  | 'Officer overloaded'
  | 'Delay observed'
  | 'Quality concerns'
  | 'Officer request'
  | 'Citizen complaint'
  | 'Other';

export type ReworkReason =
  | 'Incomplete fix'
  | 'Poor quality'
  | 'Wrong location'
  | 'Evidence unclear'
  | 'Needs additional work';

export type EscalationReason =
  | 'SLA breach'
  | 'Repeated rework failure'
  | 'Serious civic risk'
  | 'Needs higher authority'
  | 'Policy/legal issue';

export type SLAOverdueRejectionReason =
  | 'Non-feasible due to structural constraints'
  | 'Outside municipal jurisdiction'
  | 'Budget unavailable'
  | 'Safety risk prevents work'
  | 'Duplicate or merged with another issue'
  | 'Other';

export type SLAExtensionReason =
  | 'Material procurement delay'
  | 'Weather / natural conditions'
  | 'Additional survey required'
  | 'Pending third-party approval'
  | 'Resource unavailability'
  | 'Scope of work increased'
  | 'Other';

export type StatusKey =
  | 'all'
  | 'pending'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'pending_uo_verification'
  | 'rework_required'
  | 'reopened'
  | 'escalated'
  | 'closed'
  | 'rejected'
  | 'withdrawn'
  | 'resolved';

export type PriorityKey = 'critical' | 'high' | 'medium' | 'low';

export type SLAKey = 'all' | 'overdue' | 'due_soon' | 'on_track';

export type Meta = {
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
};

export type StatusMeta = Meta & {
  dot: string;
  border: string;
};

export type PriorityMeta = Meta & {
  dot: string;
};

export type SLAMeta = Meta & {
  dot: string;
};

export interface VerificationChecklist {
  locationValid: boolean;
  hasSufficientEvidence: boolean;
  notDuplicate: boolean;
  isWithinJurisdiction: boolean;
}

export type UserRole = 'unit_officer' | 'field_officer' | 'citizen' | 'admin' | 'city_admin';

export type UpdateScope = 'citizen' | 'officer_and_citizen' | 'admin_only';

export interface IssueUpdate {
  id: string;
  issueId: string;
  status: IssueStatus;
  comment: string;
  role: UserRole;
  attachments: string[];
  updatedBy: string | undefined;
  scope: UpdateScope;
  createdAt: string;
}

export interface Message {
  id: string;
  issueId: string;
  senderId: string;
  fromUserName: string;
  fromRole: 'UnitOfficer' | 'FieldOfficer' | 'Citizen';
  text: string;
  attachments?: string[];
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  issueId: string;
  issueTitle: string;
  status: IssueStatus;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Issue {
  // ---- Core ----
  id: string;
  issueCode: string;

  title: string;
  description: string;

  category: IssueCategory;
  subCategories: IssueSubCategory[];

  otherCategoryName?: string | null;

  priority: IssuePriority;
  status: IssueStatus;

  tags: string[];

  // ---- Location ----
  address: string;
  city: string;
  state: string;
  postal: string;
  location: string; // combined string for UI

  coordinates: {
    latitude: number;
    longitude: number;
  };

  googleMapUrl: string;

  // ---- Reporter ----
  reportedBy: string;

  citizenName?: string;
  citizenEmail?: string | null;
  citizenPhone?: number | null;
  isAnonymous: boolean;

  // ---- Media ----
  images: string[]; // from photos
  videoEvidence?: string | null;

  beforePhotos?: string[];
  afterPhotos?: string[];

  // ---- Workflow ----
  assignedUnitOfficer?: string | null;
  assignedFieldOfficer?: string | null;

  assignedOfficer?: string; // UI helper (resolved name)

  // ---- SLA ----
  slaCategory: string;
  slaDeadline?: string | null;
  slaBreached: boolean;

  // ---- Status Timestamps ----
  createdAt: number;
  dateReported: string; // ISO string for UI

  resolvedAt?: number | null;
  closedAt?: number | null;

  // ---- Withdrawal ----
  withdrawnAt?: number;
  withdrawalReason?: string;
  withdrawalCategory?: string;

  // ---- Verification ----
  verificationChecklist?: {
    locationValid: boolean;
    hasSufficientEvidence: boolean;
    notDuplicate: boolean;
    isWithinJurisdiction: boolean;
    notes?: string;
    verifiedBy: string;
    verifiedAt: number;
  };

  // ---- Rejection ----
  rejection?: {
    reason: string;
    comment?: string;
    rejectedBy: string;
    rejectedAt: number;
  };

  // ---- Duplicate Detection ----
  possibleDuplicateIds: string[];

  // ---- Escalation ----
  escalatedToAdmin: boolean;

  // ---- Reopen ----
  reopenCount: number;
  reopenReason?: string | null;
  isReopened: boolean;

  // ---- Citizen Feedback ----
  citizenRating?: number | null;
  citizenFeedback?: string | null;

  // ---- Issue Updates ----
  issueUpdates?: IssueUpdate[];
}

export interface FieldOfficerDetails {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;

  rating: number;
  efficiencyScore: number;

  currentActiveIssues: number;
  maxIssueCapacity: number;
  workloadPercentage: number;

  specialisations: string[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CitizenDetails {
  name: string;
  email: string;
  phone: string;
}

export interface MappedIssue {
  id: string;
  issueCode: string;

  title: string;
  description: string;

  category: string;
  subCategories: string[];
  tags: string[];

  status: string;
  priority: string;

  address: string;
  city: string;
  state: string;
  postal: string;
  location: string;

  ward: string;

  reportedBy: string;

  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;

  dateReported: string;

  coordinates: Coordinates;

  beforePhotos: string[];
  afterPhotos: string[];

  beforeLocation: Coordinates | null;
  afterLocation: Coordinates | null;

  videoEvidence: string[];

  slaDeadline: number | null;

  assignedOfficer: FieldOfficerDetails | null;

  verificationChecklist: any | null; // refine later if structured
  rejection: any | null;

  images: string[] | string; // based on your mapper (photoUrl can be string or array)

  createdAt: number;
}

export interface FieldOfficer {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  rating: number;
  specialisations: IssueCategory[];
  workloadPercentage: number;
  currentActiveIssues: number;
  onTimeCompletionRate: number;
  lastActive: string;
  ward: string;
  recommended?: boolean;
}

export interface DashboardStats {
  totalIssues: number;
  pendingVerification: number;
  verifiedReadyToAssign: number;
  assigned: number;
  submittedForReview: number;
  reworkRequired: number;
  reopened: number;
  escalated: number;
  closed: number;
}

export interface AnalyticsData {
  slaCompliance: number;
  avgVerificationTime: number;
  avgResolutionTime: number;
  categoryDistribution: { category: string; count: number; percentage: number }[];
  escalationCount: number;
  topPerformingOfficers: { name: string; successRate: number; issuesResolved: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ward?: string;
  phone?: string;
}

export interface OfficialUser {
  id: string;
  name: string;
  role: 'Admin' | 'CityAdmin' | 'UnitOfficer' | 'FieldOfficer';
  designation: string;
  department: string;
  ward?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  fromUserName: string;
  fromRole: 'Admin' | 'CityAdmin' | 'UnitOfficer' | 'FieldOfficer';
  text: string;
  timestamp: string;
  read: boolean;
  issueRef?: {
    issueId: string;
    issueTitle: string;
  };
  attachments?: string[];
}

export interface DirectConversation {
  id: string;
  participantIds: string[];
  participants: OfficialUser[];
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId: string;
  unreadCount: number;
  issueRef?: {
    issueId: string;
    issueTitle: string;
    status: IssueStatus;
  };
}

export interface CitizenMessage {
  id: string;
  issueId: string;
  fromId: string;
  fromName: string;
  fromRole: 'FieldOfficer' | 'Citizen';
  fromAvatar?: string;
  text: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

export type NotificationType =
  | 'status'
  | 'upvote'
  | 'comment'
  | 'assigned'
  | 'sla_alert'
  | 'rework'
  | 'escalation'
  | 'verified'
  | 'rejected'
  | 'in_progress'
  | 'submitted_for_review'
  | 'resolution'
  | 'reopened'
  | 'message'
  | 'system';

export interface AppNotification {
  _id: string;
  _createdAt: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  issueId?: string;
}

export type PublicIssueStatus = 'draft' | 'published';

export interface PublicIssue {
  id: string;
  original_issue_id: string;
  title: string;
  category: IssueCategory;
  ward: string;
  location: string;
  status: 'Resolved' | 'Rejected';
  description?: string;
  summary: string;
  before_images: string[];
  after_images: string[];
  foVisible: boolean;
  created_at?: string;
  reviewed_at?: string;
  resolved_by: string;
  resolved_date: string;
  moderated_by: string;
  moderated_at: string;
  publicCompletionNote: string;
  public_visible: boolean;
  publish_status: PublicIssueStatus;
  rejection_reason?: string;
  view_count?: number;
}

export interface DuplicatePairMetrics {
  issueAId: string;
  issueBId: string;

  overallScore: number;
  duplicateScore: number;
  duplicateLevel: 'Possible Duplicate' | 'Strong Duplicate' | 'Almost Certain Duplicate';

  distanceMeters: number;
  titleSimilarity: number;
  descriptionSimilarity: number;
  locationSimilarity: number;
  categoryMatch: boolean;
  subCategoryMatch: boolean;
  proximitySimilarity: number;

  matchedSubCategories: string[];
  reasons: string[];
}

export interface DuplicateGroupMetrics {
  bestOverallScore: number;
  averageOverallScore: number;
  bestDuplicateScore: number;
  minimumDistanceMeters: number;
  pairCount: number;
  reasons: string[];
}

export interface DuplicateGroup {
  id: string;

  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;

  detectedAt: string;
  similarityReason: string;
  resolved: boolean;

  issues: Issue[];

  similarityMetrics: DuplicateGroupMetrics;
  pairMetrics: DuplicatePairMetrics[];
}
