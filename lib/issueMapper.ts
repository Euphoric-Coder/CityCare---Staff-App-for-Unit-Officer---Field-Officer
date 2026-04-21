export function mapIssueToUI(issue: any, userMap: Record<string, any>) {
  const citizen = userMap[issue.reportedBy];

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
    citizenName: citizen?.fullName || 'Unknown',
    citizenEmail: citizen?.email || '',
    citizenPhone: citizen?.phone || '',

    dateReported: new Date(issue.createdAt).toISOString(),

    coordinates: {
      latitude: Number(issue.latitude),
      longitude: Number(issue.longitude),
    },

    beforePhotos: issue.beforePhotos || [],
    afterPhotos: issue.afterPhotos || [],

    videoEvidence: issue.videos ? [issue.videoUrl] : [],

    slaDeadline: issue.slaDeadline,

    assignedOfficer: userMap[issue.assignedFieldOfficer]?.fullName || null,

    verificationChecklist: issue.verificationChecklist ?? null,
    rejection: issue.rejection ?? null,

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
