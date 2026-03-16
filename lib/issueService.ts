import {
  Issue,
  IssueUpdate,
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

function makeUpdate(
  issueId: string,
  status: string,
  comment: string,
  scope: IssueUpdate['scope'],
  role: IssueUpdate['role']
): IssueUpdate {
  return {
    id: `upd-${Date.now()}`,
    issueId,
    status: status as IssueUpdate['status'],
    comment,
    role,
    attachments: [],
    updatedBy: 'uo-1',
    scope,
    createdAt: new Date().toISOString(),
  };
}

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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Verified',
        'Issue verified by Unit Officer.',
        'field_and_citizen',
        'UnitOfficer'
      )
    );
  },

  rejectIssue: async (issueId: string, reason: RejectionReason, comment: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');

    issue.status = 'Rejected';
    issue.rejectionReason = reason;
    issue.rejectionComment = comment;
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Rejected',
        `Issue rejected: ${reason}. ${comment}`,
        'citizen',
        'UnitOfficer'
      )
    );
  },

  assignIssue: async (issueId: string, officerId: string, note?: string): Promise<void> => {
    await delay(500);
    const issue = issues.find((i) => i.id === issueId);
    const officer = officers.find((o) => o.id === officerId);
    if (!issue || !officer) throw new Error('Issue or Officer not found');

    issue.status = 'Assigned';
    issue.assignedOfficerId = officer.id;
    issue.assignedOfficer = officer.name;
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Assigned',
        `Assigned to ${officer.name}.${note ? ' ' + note : ''}`,
        'field_and_citizen',
        'UnitOfficer'
      )
    );

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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Assigned',
        `Reassigned from ${oldOfficerName} to ${newOfficer.name}. Reason: ${reason}. ${comment}`,
        'admin_only',
        'UnitOfficer'
      )
    );

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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Closed',
        `Resolution approved and issue closed.${comment ? ' ' + comment : ''}`,
        'citizen',
        'UnitOfficer'
      )
    );

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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Rework Required',
        `Rework requested: ${reason}. ${comment}`,
        'field_and_citizen',
        'UnitOfficer'
      )
    );
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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Escalated',
        `Issue escalated: ${reason}. ${comment}`,
        'admin_only',
        'UnitOfficer'
      )
    );
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
    issue.issueUpdates.push(
      makeUpdate(
        issueId,
        'Verified',
        'Reopened issue re-verified by Unit Officer.',
        'field_and_citizen',
        'UnitOfficer'
      )
    );
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
