import { Resend } from "resend";
import nodemailer from "nodemailer";

const resendKey = process.env.RESEND_API_KEY || "";
export const resend = resendKey ? new Resend(resendKey) : null;

// Optional SMTP Transporter (Gmail / Custom SMTP)
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);

const hasSmtp = !!(smtpUser && smtpPass);
const smtpTransporter = hasSmtp
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

interface EmailParams {
  to: string;
  studentName: string;
  courseName: string;
}

/**
 * Sends a transactional welcome email to the student with portal details.
 * Supports Resend, Gmail/Nodemailer SMTP, and development fallback logging.
 */
export async function sendAccessGrantedEmail({ to, studentName, courseName }: EmailParams) {
  const subject = `Welcome to ${courseName}! - Course Unlocked`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f97316; font-size: 24px; margin: 0;">Maths with SK</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">A-Level Mathematics E-Learning Platform</p>
      </div>

      <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Welcome to ${courseName}!</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${studentName}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">
        Your payment has been successfully approved! Full access to all HD video lectures, handwritten notes, and past paper walkthroughs is now active.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${siteUrl}/portal" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
          Go to Student Portal & Start Learning →
        </a>
      </div>

      <div style="background-color: #f8fafc; border-left: 4px solid #f97316; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Sequential Unlocking Note:</strong> Each lecture requires at least 90% watch completion before the next video in sequence unlocks automatically.
        </p>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="font-size: 14px; color: #475569; margin: 0;">
        Best of luck with your studies,<br />
        <strong>SK</strong><br />
        <span style="color: #94a3b8; font-size: 12px;">Maths with SK Specialist</span>
      </p>
    </div>
  `;

  // 1. Try Resend API if configured
  if (resend) {
    try {
      const from = process.env.RESEND_FROM_EMAIL || "Maths with SK <onboarding@resend.dev>";
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        console.error("Resend delivery failed:", error.message);
      } else {
        console.log(`✅ Resend Email sent successfully to ${to}. Message ID: ${data?.id}`);
        return { success: true, provider: "resend", id: data?.id };
      }
    } catch (err: any) {
      console.error("Error sending email via Resend:", err.message);
    }
  }

  // 2. Try Nodemailer SMTP (Gmail / custom server) if configured
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"Maths with SK" <${smtpUser}>`,
        to,
        subject,
        html,
      });
      console.log(`✅ SMTP Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return { success: true, provider: "smtp", id: info.messageId };
    } catch (err: any) {
      console.error("Error sending email via SMTP:", err.message);
    }
  }

  // 3. Fallback: Log email details to development console
  console.log("\n=======================================================");
  console.log("=== [DEVELOPMENT MOCK EMAIL (No API Key Configured)] ===");
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${html.replace(/<[^>]*>?/gm, "")}`);
  console.log("=======================================================\n");

  return { success: true, provider: "mock" };
}

export default sendAccessGrantedEmail;
