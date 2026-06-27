export function mapIssueToUI(issue: any) {
  if (!issue) return null;

  return {
    id: issue._id,
    issueCode: issue.issueCode,

    title: issue.title,
    description: issue.description,

    category: (issue.category || 'other').toLowerCase().trim(),
    subCategories: issue.subcategory || [],
    tags: issue.tags || [],

    status: (issue.status || 'pending').toLowerCase().trim(),
    priority: (issue.priority || 'low').toLowerCase().trim(),

    address: issue.address,
    city: issue.city,
    state: issue.state,
    postal: issue.postal,
    location: `${issue.address}, ${issue.city}, ${issue.state}, ${issue.postal}`,

    ward: issue.city,

    reportedBy: issue.reportedBy,
    citizenName: issue.citizenDetails?.fullName || 'Unknown',
    citizenEmail: issue.citizenDetails?.email || '',
    citizenPhone: issue.citizenDetails?.phone || '',

    dateReported: new Date(issue.createdAt).toISOString(),

    coordinates: {
      latitude: Number(issue.latitude),
      longitude: Number(issue.longitude),
    },

    beforePhotos: issue.beforePhotos || [],
    beforePhotosId: issue.beforePhotosId || [],
    afterPhotos: issue.afterPhotos || [],
    afterPhotosId: issue.afterPhotosId || [],

    beforeLocation: issue.beforeLocation || null,
    afterLocation: issue.afterLocation || null,

    foResolutionNotes: issue.notes,

    videoEvidence: issue.videos ? [issue.videoUrl] : [],

    slaDeadline: issue.slaDeadline,

    assignedUnitOfficer: issue.assignedUnitOfficer || null,
    assignedFieldOfficer: issue.assignedFieldOfficer || null,
    assignedOfficer: issue.fieldOfficerDetails || null,

    verificationChecklist: issue.verificationChecklist ?? null,
    rejection: issue.rejection ?? null,

    reopenCategory: issue.reopenCategory ?? null,

    reworkNote: issue.reworkNote ?? null,
    reworkReasons: issue.reworkReasons || [],
    lastReworkRequestedAt: issue.lastReworkRequestedAt || 0,

    images: issue.photoUrl || [],

    createdAt: issue.createdAt,
  };
}

export function mapIssueUpdates(updates: any[]) {
  return updates.map((u) => ({
    id: u._id,
    issueId: u.issueId,
    status: u.status,
    comment: u.comment,
    role: u.role,
    attachments: u.attachments || [],
    updatedBy: u.updatedBy,
    scope: u.scope,
    createdAt: new Date(u.createdAt).toISOString(),
  }));
}

export const mapToMobilePublicIssues = (issues: any[]): PublicIssue[] => {
  return issues.map((issue, index) => {
    const isResolved = issue.status === 'resolved';
    const isRejected = issue.status === 'rejected';

    return {
      id: issue.id || `PUB-${String(index + 1).padStart(3, '0')}`,

      original_issue_id: issue.issueCode,

      title: issue.title,

      category: issue.category,

      ward: issue.ward || issue.city,

      location: `${issue.address}, ${issue.city}`,

      status: isResolved ? 'Resolved' : 'Rejected',

      description: issue.description,

      summary: issue.publicCompletionNote || '',

      before_images: issue.photosBefore || [],

      after_images: issue.photosAfter || [],

      created_at: issue.createdAt,

      reviewed_at: issue.reviewedAt || undefined,

      resolved_by: issue.resolvedBy || 'Field Officer Team — CityCare Department',

      resolved_date: isResolved && issue.resolvedAt ? issue.resolvedAt : issue.rejectedAt,

      moderated_by: issue.moderatedBy || 'Unit Officer',

      moderated_at: issue.status === 'resolved' ? issue.resolvedAt : issue.rejectedAt,

      public_visible: issue.publicVisible ?? false,

      publish_status: issue.publishStatus,

      rejection_reason: isRejected ? issue.rejectionReason || '' : undefined,

      view_count: issue.viewCount || 0,
    };
  });
};
