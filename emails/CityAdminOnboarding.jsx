import * as React from "react";
const Html = ({ children }) => <html>{children}</html>;
const Head = ({ children }) => <head>{children}</head>;
const Preview = ({ children }) => <span style={{ display: "none" }}>{children}</span>;
const Body = ({ children, style }) => <body style={style}>{children}</body>;
const Container = ({ children, style }) => <div style={style}>{children}</div>;
const Section = ({ children, style }) => <div style={style}>{children}</div>;
const Heading = ({ children, style }) => <h1 style={style}>{children}</h1>;
const Text = ({ children, style }) => <p style={style}>{children}</p>;
const Img = (props) => <img {...props} />;
const Hr = ({ style }) => <hr style={style} />;

export default function CityAdminOnboardingEmail({
  adminName = "Rajesh Sharma",
  adminEmail = "admin@varanasi.gov.in",
  temporaryPassword = "RS@Rajesh15081985",
  city = "Varanasi",
  state = "Uttar Pradesh",
  supportEmail = "support@citycare.dev",
  portalUrl = "https://citycare.dev/staff/sign-in",
}) {
  const logoUrl = "https://ik.imagekit.io/5zzchrjn8/logo.png";

  return (
    <Html>
      <Head />
      <Preview>
        Your CityCare City Administrator account is ready. Use your temporary
        credentials to sign in to the CityCare Web Portal.
      </Preview>

      <Body style={main}>
        <Container style={outerWrapper}>
          <Section style={card}>
            <Section style={topBar} />

            <Section style={header}>
              <Img
                src={`${logoUrl}`}
                alt="CityCare"
                width="64"
                height="64"
                style={logo}
              />
              <Text style={brand}>CityCare</Text>
              <Text style={brandSubtext}>
                Smart Civic Issue Management Platform
              </Text>
            </Section>

            <Section style={hero}>
              <Text style={badge}>CITY ADMINISTRATOR ACCOUNT CREATED</Text>
              <Heading style={heading}>Welcome to CityCare</Heading>
              <Text style={heroText}>
                Your City Administrator account has been provisioned successfully.
                Please use the credentials below to access the CityCare Web Management
                Portal and oversee municipal civic operations, departments, and
                resolution workflows.
              </Text>
            </Section>

            <Section style={content}>
              <Text style={greeting}>Hello {adminName},</Text>

              <Text style={paragraph}>
                Your <strong>City Administrator</strong> account has been created
                on the CityCare platform by the executive administration. You have
                administrative authority for <strong>{city}{state ? `, ${state}` : ""}</strong>{" "}
                to supervise municipal departments, monitor civic resolutions, review
                SLA compliance, and manage departmental officers.
              </Text>

              <Section style={infoCard}>
                <Text style={infoCardTitle}>Account & Jurisdiction Details</Text>

                <Section style={infoRow}>
                  <Text style={label}>Email Address</Text>
                  <Text style={value}>{adminEmail}</Text>
                </Section>

                <Section style={infoRow}>
                  <Text style={label}>Temporary Password</Text>
                  <Text style={password}>{temporaryPassword}</Text>
                </Section>

                <Section style={infoRow}>
                  <Text style={label}>Assigned Jurisdiction</Text>
                  <Text style={value}>{city}{state ? `, ${state}` : ""}</Text>
                </Section>

                <Section style={lastInfoRow}>
                  <Text style={label}>Administrative Role</Text>
                  <Text style={value}>Municipal City Administrator</Text>
                </Section>
              </Section>

              <Section style={securityBox}>
                <Text style={securityTitle}>Security Notice</Text>
                <Text style={securityText}>
                  This password is temporary and follows the required onboarding
                  format: <strong>Initials@FirstNameDOB</strong>. For security
                  compliance, you will be required to change it immediately after
                  your first successful login.
                </Text>
              </Section>

              <Section style={instructionBox}>
                <Text style={instructionTitle}>How to Get Started</Text>
                <Text style={instructionText}>
                  Access the CityCare Web Portal from your desktop browser and sign in
                  using your registered email address and the temporary password above.
                  Upon login, you will have immediate access to your city dashboard,
                  real-time issue analytics, and department oversight tools.
                </Text>
              </Section>

              <Hr style={divider} />

              <Text style={sectionTitle}>Your Role as a City Administrator</Text>

              <Section style={bulletCard}>
                <Text style={bullet}>
                  • Oversee municipal civic operations, issue resolutions, and department performance
                </Text>
                <Text style={bullet}>
                  • Monitor real-time issue trends, escalation heatmaps, and SLA adherence
                </Text>
                <Text style={bullet}>
                  • Coordinate with Unit Officers and review field officer deployments
                </Text>
                <Text style={bullet}>
                  • Review citizen feedback, verified resolutions, and audit trails
                </Text>
                <Text style={bullet}>
                  • Export executive reports and drive data-driven municipal improvements
                </Text>
              </Section>

              <Hr style={divider} />

              <Text style={sectionTitle}>Support</Text>
              <Text style={paragraph}>
                If you face any issues while accessing your account or need assistance
                with municipal provisioning, please contact our support team at{" "}
                <a href={`mailto:${supportEmail}`} style={link}>
                  {supportEmail}
                </a>
                .
              </Text>

              <Text style={closing}>
                Regards,
                <br />
                <strong>CityCare Administration Team</strong>
              </Text>
            </Section>

            <Section style={footer}>
              <Text style={footerText}>
                This is an automated onboarding email from CityCare. Please do not
                disclose your temporary credentials to anyone.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ===================== EMERALD / TEAL THEME ===================== */

const main = {
  margin: 0,
  padding: "0",
  width: "100%",
  backgroundColor: "#f0fdf4",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#0f172a",
};

const outerWrapper = {
  width: "100%",
  maxWidth: "100%",
  margin: "0 auto",
  padding: "0",
};

const card = {
  width: "100%",
  backgroundColor: "#ffffff",
  border: "1px solid #bbf7d0",
  borderRadius: "0",
  overflow: "hidden",
};

const topBar = {
  height: "8px",
  backgroundColor: "#059669",
};

const header = {
  width: "100%",
  textAlign: "center",
  padding: "36px 24px 20px",
  backgroundColor: "#f0fdf4",
};

const logo = {
  margin: "0 auto 12px",
  display: "block",
};

const brand = {
  margin: "0",
  fontSize: "30px",
  lineHeight: "36px",
  fontWeight: "800",
  color: "#047857",
};

const brandSubtext = {
  margin: "8px 0 0",
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
};

const hero = {
  width: "100%",
  textAlign: "center",
  padding: "8px 24px 30px",
  backgroundColor: "#f0fdf4",
};

const badge = {
  display: "inline-block",
  margin: "0 0 14px",
  padding: "7px 14px",
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: "700",
  letterSpacing: "0.9px",
  color: "#065f46",
  backgroundColor: "#dcfce7",
  borderRadius: "999px",
  textTransform: "uppercase",
};

const heading = {
  margin: "0",
  fontSize: "32px",
  lineHeight: "38px",
  fontWeight: "800",
  color: "#0f172a",
};

const heroText = {
  maxWidth: "760px",
  margin: "14px auto 0",
  fontSize: "15px",
  lineHeight: "25px",
  color: "#475569",
};

const content = {
  width: "100%",
  maxWidth: "960px",
  margin: "0 auto",
  padding: "32px 24px 36px",
  boxSizing: "border-box",
};

const greeting = {
  margin: "0 0 18px",
  fontSize: "18px",
  lineHeight: "28px",
  fontWeight: "700",
  color: "#111827",
};

const paragraph = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "26px",
  color: "#334155",
};

const infoCard = {
  margin: "26px 0",
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "18px",
  padding: "20px",
};

const infoCardTitle = {
  margin: "0 0 16px",
  fontSize: "17px",
  lineHeight: "24px",
  fontWeight: "700",
  color: "#0f172a",
};

const infoRow = {
  padding: "0 0 14px",
  margin: "0 0 14px",
  borderBottom: "1px solid #e2e8f0",
};

const lastInfoRow = {
  padding: "0",
  margin: "0",
};

const label = {
  margin: "0 0 6px",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: "700",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const value = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#0f172a",
  fontWeight: "500",
  wordBreak: "break-word",
};

const password = {
  margin: "0",
  fontSize: "16px",
  lineHeight: "24px",
  color: "#047857",
  fontWeight: "800",
  backgroundColor: "#dcfce7",
  border: "1px solid #86efac",
  borderRadius: "12px",
  padding: "10px 12px",
  wordBreak: "break-word",
};

const securityBox = {
  margin: "0 0 20px",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "16px",
  padding: "16px 18px",
};

const securityTitle = {
  margin: "0 0 8px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#92400e",
};

const securityText = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "23px",
  color: "#92400e",
};

const instructionBox = {
  margin: "0 0 8px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: "16px",
  padding: "16px 18px",
};

const instructionTitle = {
  margin: "0 0 8px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#047857",
};

const instructionText = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "23px",
  color: "#065f46",
};

const divider = {
  margin: "30px 0",
  borderColor: "#e2e8f0",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "18px",
  lineHeight: "26px",
  fontWeight: "700",
  color: "#0f172a",
};

const bulletCard = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "16px",
  padding: "18px 20px",
};

const bullet = {
  margin: "0 0 10px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
};

const link = {
  color: "#059669",
  textDecoration: "underline",
};

const closing = {
  margin: "20px 0 0",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
};

const footer = {
  width: "100%",
  borderTop: "1px solid #bbf7d0",
  backgroundColor: "#f0fdf4",
  padding: "20px 24px",
};

const footerText = {
  margin: "0 auto",
  maxWidth: "960px",
  fontSize: "12px",
  lineHeight: "20px",
  color: "#64748b",
  textAlign: "center",
};
