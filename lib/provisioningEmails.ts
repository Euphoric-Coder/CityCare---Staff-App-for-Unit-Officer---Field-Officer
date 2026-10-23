import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resend } from 'resend';
import FieldOfficerOnboardingEmail from '../emails/FOOnboarding';
import UnitOfficerOnboardingEmail from '../emails/UOOnboarding';
import CityAdminOnboardingEmail from '../emails/CityAdminOnboarding';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured on backend environment.');
  }
  return new Resend(apiKey);
};

const SENDER_EMAIL = process.env.CITYCARE_EMAIL_FROM || 'CityCare Security <security@citycare.dev>';
const SUPPORT_EMAIL = process.env.CITYCARE_SUPPORT_EMAIL || 'support@citycare.dev';

export const DEPARTMENT_LABELS: Record<string, string> = {
  road: 'Road & Infrastructure',
  waste: 'Waste Management',
  water: 'Water Supply & Drainage',
  electricity: 'Electricity & Power',
  health: 'Public Health & Sanitation',
  other: 'General Municipal Services',
};

export function formatDepartment(dep?: string | null): string {
  if (!dep) return 'General Administration';
  return DEPARTMENT_LABELS[dep.toLowerCase()] || dep;
}

export function renderEmail(element: React.ReactElement): string {
  const doctype =
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n';
  return doctype + renderToStaticMarkup(element);
}

export interface SendOfficerProvisioningEmailParams {
  role: 'field_officer' | 'unit_officer' | 'Field Officer' | 'Unit Officer' | string;
  fullName: string;
  email: string;
  tempPassword: string;
  city?: string | null;
  department?: string | null;
  specialisations?: string[] | null;
}

/**
 * Send Field Officer or Unit Officer Onboarding Email
 */
export async function sendOfficerProvisioningEmail({
  role,
  fullName,
  email,
  tempPassword,
  city,
  department,
  specialisations = [],
}: SendOfficerProvisioningEmailParams) {
  const resend = getResendClient();
  const formattedDept = formatDepartment(department);
  const normalizedEmail = email.trim().toLowerCase();

  let html = '';
  let subject = '';

  if (role === 'field_officer' || role === 'Field Officer') {
    subject = 'Welcome to CityCare - Your Field Officer Account Details';
    const specs =
      Array.isArray(specialisations) && specialisations.length > 0
        ? specialisations
        : ['General Field Operations'];

    html = renderEmail(
      React.createElement(FieldOfficerOnboardingEmail, {
        officerName: fullName,
        officerEmail: normalizedEmail,
        temporaryPassword: tempPassword,
        city: city || 'Municipal Jurisdiction',
        department: formattedDept,
        specialization: specs,
        supportEmail: SUPPORT_EMAIL,
      })
    );
  } else {
    // Unit Officer
    subject = 'Welcome to CityCare - Your Unit Officer Account Details';
    html = renderEmail(
      React.createElement(UnitOfficerOnboardingEmail, {
        officerName: fullName,
        officerEmail: normalizedEmail,
        temporaryPassword: tempPassword,
        city: city || 'Municipal Jurisdiction',
        department: formattedDept,
        supportEmail: SUPPORT_EMAIL,
      })
    );
  }

  const response = await resend.emails.send({
    from: SENDER_EMAIL,
    to: normalizedEmail,
    subject,
    html,
  });

  if (response.error) {
    console.error('Resend error sending officer email:', response.error);
    throw new Error(response.error.message || 'Failed to send onboarding email via Resend');
  }

  return response;
}

export interface SendCityAdminProvisioningEmailParams {
  fullName: string;
  email: string;
  tempPassword: string;
  city?: string | null;
  state?: string | null;
}

/**
 * Send City Administrator Onboarding Email
 */
export async function sendCityAdminProvisioningEmail({
  fullName,
  email,
  tempPassword,
  city,
  state,
}: SendCityAdminProvisioningEmailParams) {
  const resend = getResendClient();
  const normalizedEmail = email.trim().toLowerCase();
  const subject = 'Welcome to CityCare - Your City Administrator Account Details';

  const html = renderEmail(
    React.createElement(CityAdminOnboardingEmail, {
      adminName: fullName,
      adminEmail: normalizedEmail,
      temporaryPassword: tempPassword,
      city: city || 'Municipal Jurisdiction',
      state: state || '',
      supportEmail: SUPPORT_EMAIL,
      portalUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'https://citycare.dev/staff/sign-in',
    })
  );

  const response = await resend.emails.send({
    from: SENDER_EMAIL,
    to: normalizedEmail,
    subject,
    html,
  });

  if (response.error) {
    console.error('Resend error sending city admin email:', response.error);
    throw new Error(response.error.message || 'Failed to send onboarding email via Resend');
  }

  return response;
}
