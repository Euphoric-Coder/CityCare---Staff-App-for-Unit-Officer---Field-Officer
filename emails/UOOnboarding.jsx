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

export default function UnitOfficerOnboardingEmail({
  officerName = "Kevin Dcosta",
  officerEmail = "testuo@example.com",
  temporaryPassword = "KD@Kevin02082005",
  city = "Mumbai",
  department = "Road & Infrastructure",
  supportEmail = "support@citycare.gov.in",
}) {
  const logoUrl = "https://ik.imagekit.io/5zzchrjn8/logo.png";

  return (
    <Html>
      <Head />
      <Preview>
        Your CityCare Unit Officer account is ready. Use your temporary
        credentials to sign in on the mobile app.
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
              <Text style={badge}>UNIT OFFICER ACCOUNT CREATED</Text>
              <Heading style={heading}>Welcome to CityCare</Heading>
              <Text style={heroText}>
                Your account has been pre-provisioned successfully. Please use
                the credentials below to access the CityCare mobile application
                and begin managing civic issue verification and assignment
                workflows.
              </Text>
            </Section>

            <Section style={content}>
              <Text style={greeting}>Hello {officerName},</Text>

              <Text style={paragraph}>
                Your <strong>Unit Officer</strong> account has been created on
                the CityCare platform by the administration team. You will be
                responsible for verifying reported issues, assigning tasks to
                field officers, and ensuring timely resolution within your
                assigned jurisdiction.
              </Text>

              <Section style={infoCard}>
                <Text style={infoCardTitle}>Account Details</Text>

                <Section style={infoRow}>
                  <Text style={label}>Email Address</Text>
                  <Text style={value}>{officerEmail}</Text>
                </Section>

                <Section style={infoRow}>
                  <Text style={label}>Temporary Password</Text>
                  <Text style={password}>{temporaryPassword}</Text>
                </Section>

                <Section style={infoRow}>
                  <Text style={label}>Assigned City</Text>
                  <Text style={value}>{city}</Text>
                </Section>

                <Section style={lastInfoRow}>
                  <Text style={label}>Assigned Department</Text>
                  <Text style={value}>{department}</Text>
                </Section>
              </Section>

              <Section style={securityBox}>
                <Text style={securityTitle}>Security Notice</Text>
                <Text style={securityText}>
                  This password is temporary and follows the required onboarding
                  format: <strong>Initials@FirstNameDOB</strong>. You will be
                  required to change it immediately after your first successful
                  login.
                </Text>
              </Section>

              <Section style={instructionBox}>
                <Text style={instructionTitle}>How to Get Started</Text>
                <Text style={instructionText}>
                  Open the CityCare mobile application and sign in using your
                  registered email address and the temporary password shared in
                  this email. Once logged in, you will be able to verify
                  reported issues and assign them to field officers.
                </Text>
              </Section>

              <Hr style={divider} />

              <Text style={sectionTitle}>Your Role as a Unit Officer</Text>

              <Section style={bulletCard}>
                <Text style={bullet}>
                  • Review and verify civic issues reported by citizens
                </Text>
                <Text style={bullet}>
                  • Approve or reject reports based on evidence and jurisdiction
                </Text>
                <Text style={bullet}>
                  • Assign verified issues to suitable Field Officers
                </Text>
                <Text style={bullet}>
                  • Monitor progress and validate issue resolution
                </Text>
                <Text style={bullet}>
                  • Ensure SLA compliance and efficient service delivery
                </Text>
              </Section>

              <Hr style={divider} />

              <Text style={sectionTitle}>Support</Text>
              <Text style={paragraph}>
                If you face any issue while accessing your account, please
                contact the support team at{" "}
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
                This is an automated onboarding email from CityCare. Please do
                not share your credentials with anyone.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ===================== PURPLE THEME ===================== */

const main = {
  margin: 0,
  padding: "0",
  width: "100%",
  backgroundColor: "#f5f3ff",
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
  border: "1px solid #e9d5ff",
  borderRadius: "0",
  overflow: "hidden",
};

const topBar = {
  height: "8px",
  backgroundColor: "#7c3aed",
};

const header = {
  width: "100%",
  textAlign: "center",
  padding: "36px 24px 20px",
  backgroundColor: "#faf5ff",
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
  color: "#6d28d9",
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
  backgroundColor: "#faf5ff",
};

const badge = {
  display: "inline-block",
  margin: "0 0 14px",
  padding: "7px 14px",
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: "700",
  letterSpacing: "0.9px",
  color: "#6d28d9",
  backgroundColor: "#ede9fe",
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
  backgroundColor: "#faf5ff",
  border: "1px solid #e9d5ff",
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
};

const password = {
  margin: "0",
  fontSize: "16px",
  lineHeight: "24px",
  color: "#6d28d9",
  fontWeight: "800",
  backgroundColor: "#ede9fe",
  border: "1px solid #ddd6fe",
  borderRadius: "12px",
  padding: "10px 12px",
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
  color: "#92400e",
};

const instructionBox = {
  margin: "0 0 8px",
  backgroundColor: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  padding: "16px 18px",
};

const instructionTitle = {
  margin: "0 0 8px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#6d28d9",
};

const instructionText = {
  margin: "0",
  fontSize: "14px",
  color: "#4c1d95",
};

const divider = {
  margin: "30px 0",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "18px",
  fontWeight: "700",
};

const bulletCard = {
  padding: "16px",
};

const bullet = {
  fontSize: "15px",
};

const link = {
  color: "#7c3aed",
};

const closing = {
  margin: "20px 0 0",
};

const footer = {
  width: "100%",
  borderTop: "1px solid #e9d5ff",
  backgroundColor: "#faf5ff",
  padding: "20px 24px",
};

const footerText = {
  margin: "0 auto",
  maxWidth: "960px",
  fontSize: "12px",
  textAlign: "center",
};
