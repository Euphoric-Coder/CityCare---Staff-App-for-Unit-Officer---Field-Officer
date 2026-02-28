export type IssueStatus =
  | 'Pending'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Pending UO Verification'
  | 'Rework Required'
  | 'Reopened'
  | 'Escalated'
  | 'Closed'
  | 'Rejected';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueCategory =
  | 'Pothole'
  | 'Street Light'
  | 'Waste Management'
  | 'Water Supply'
  | 'Drainage'
  | 'Road Repair'
  | 'Park Maintenance'
  | 'Public Safety';

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

export interface VerificationChecklist {
  locationValid: boolean;
  evidenceSufficient: boolean;
  notDuplicate: boolean;
  withinJurisdiction: boolean;
}

export interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  description: string;
  officerName?: string;
  comment?: string;
}

export interface Comment {
  id: string;
  author: string;
  role: string;
  message: string;
  timestamp: string;
}

export interface Message {
  id: string;
  issueId: string;
  fromUserId: string;
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
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  location: string;
  ward: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;
  dateReported: string;
  assignedOfficer?: string;
  assignedOfficerId?: string;
  beforePhotos: string[];
  afterPhotos?: string[];
  timeline: TimelineEvent[];
  comments: Comment[];
  slaDeadline?: string;
  distance?: number;
  coordinates: { latitude: number; longitude: number };
  images?: string[];
  createdAt: string;
  verificationChecklist?: VerificationChecklist;
  rejectionReason?: RejectionReason;
  rejectionComment?: string;
  reassignmentReason?: ReassignmentReason;
  reassignmentComment?: string;
  reworkReason?: ReworkReason;
  reworkComment?: string;
  escalationReason?: EscalationReason;
  escalationComment?: string;
  submissionComment?: string;
  submissionLocation?: { latitude: number; longitude: number };
  submissionTimestamp?: string;
}

export interface FieldOfficer {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  rating: number;
  specializations: IssueCategory[];
  workloadPercentage: number;
  activeIssues: number;
  successRate: number;
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

export type UserRole = 'UnitOfficer' | 'FieldOfficer' | 'Citizen' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ward?: string;
  phone?: string;
}
