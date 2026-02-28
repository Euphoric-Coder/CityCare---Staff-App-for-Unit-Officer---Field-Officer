import {
  Issue,
  FieldOfficer,
  VerificationChecklist,
  RejectionReason,
  ReassignmentReason,
  ReworkReason,
  EscalationReason,
} from './types';
import { mockIssues, mockFieldOfficers } from './mockData';

let issues = [...mockIssues];
let officers = [...mockFieldOfficers];

export const issueService = {
  fetchIssues: async (wardId?: string): Promise<Issue[]> => {
    await delay(300);
    return issues.filter((issue) => !wardId || issue.ward === wardId);
  },

  fetchIssueById: async (id: string): Promise<Issue | undefined> => {
    await delay(200);
    return issues.find((issue) => issue.id === id);
  },

  fetchFieldOfficers: async (wardId?: string): Promise<FieldOfficer[]> => {
    await delay(200);
    return officers.filter((officer) => !wardId || officer.ward === wardId);
  },

  verifyIssue: async (
    issueId: string,
    checklist: VerificationChecklist,
    slaDate: string
  ): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Verified';
    issue.verificationChecklist = checklist;
    issue.slaDeadline = slaDate;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Verified',
      timestamp: new Date().toISOString(),
      description: 'Issue verified by Unit Officer',
      officerName: 'Kumar Singh',
    });
  },

  rejectIssue: async (issueId: string, reason: RejectionReason, comment: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Rejected';
    issue.rejectionReason = reason;
    issue.rejectionComment = comment;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Rejected',
      timestamp: new Date().toISOString(),
      description: 'Issue rejected by Unit Officer',
      officerName: 'Kumar Singh',
      comment,
    });
  },

  assignIssue: async (issueId: string, officerId: string, note?: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    const officer = officers.find((o) => o.id === officerId);
    if (!issue || !officer) throw new Error('Issue or Officer not found');

    issue.status = 'Assigned';
    issue.assignedOfficerId = officer.id;
    issue.assignedOfficer = officer.name;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Assigned',
      timestamp: new Date().toISOString(),
      description: `Assigned to ${officer.name}`,
      officerName: 'Kumar Singh',
      comment: note,
    });

    officer.activeIssues += 1;
    officer.workloadPercentage = Math.min(100, officer.workloadPercentage + 15);
  },

  reassignIssue: async (
    issueId: string,
    newOfficerId: string,
    reason: ReassignmentReason,
    comment: string
  ): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    const newOfficer = officers.find((o) => o.id === newOfficerId);
    const oldOfficer = officers.find((o) => o.id === issue?.assignedOfficerId);

    if (!issue || !newOfficer) throw new Error('Issue or Officer not found');

    const oldOfficerName = issue.assignedOfficer;
    issue.assignedOfficerId = newOfficer.id;
    issue.assignedOfficer = newOfficer.name;
    issue.reassignmentReason = reason;
    issue.reassignmentComment = comment;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'REAssigned',
      timestamp: new Date().toISOString(),
      description: `Reassigned from ${oldOfficerName} to ${newOfficer.name}`,
      officerName: 'Kumar Singh',
      comment,
    });

    if (oldOfficer) {
      oldOfficer.activeIssues = Math.max(0, oldOfficer.activeIssues - 1);
      oldOfficer.workloadPercentage = Math.max(0, oldOfficer.workloadPercentage - 15);
    }

    newOfficer.activeIssues += 1;
    newOfficer.workloadPercentage = Math.min(100, newOfficer.workloadPercentage + 15);
  },

  approveResolution: async (issueId: string, comment?: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Closed';
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Closed',
      timestamp: new Date().toISOString(),
      description: 'Resolution approved and issue closed',
      officerName: 'Kumar Singh',
      comment,
    });

    const officer = officers.find((o) => o.id === issue.assignedOfficerId);
    if (officer) {
      officer.activeIssues = Math.max(0, officer.activeIssues - 1);
      officer.workloadPercentage = Math.max(0, officer.workloadPercentage - 15);
    }
  },

  requestRework: async (issueId: string, reason: ReworkReason, comment: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Rework Required';
    issue.reworkReason = reason;
    issue.reworkComment = comment;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Rework Required',
      timestamp: new Date().toISOString(),
      description: 'Rework requested by Unit Officer',
      officerName: 'Kumar Singh',
      comment,
    });
  },

  escalateToAdmin: async (
    issueId: string,
    reason: EscalationReason,
    comment: string
  ): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Escalated';
    issue.escalationReason = reason;
    issue.escalationComment = comment;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'Escalated',
      timestamp: new Date().toISOString(),
      description: 'Issue escalated to admin',
      officerName: 'Kumar Singh',
      comment,
    });
  },

  reverifyReopenedIssue: async (
    issueId: string,
    checklist: VerificationChecklist,
    slaDate: string
  ): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Verified';
    issue.verificationChecklist = checklist;
    issue.slaDeadline = slaDate;
    issue.timeline.push({
      id: `tl-${Date.now()}`,
      status: 'REVERIFIED',
      timestamp: new Date().toISOString(),
      description: 'Reopened issue re-verified by Unit Officer',
      officerName: 'Kumar Singh',
    });
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
