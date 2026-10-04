const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");

// Parse .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const resendKey = process.env.RESEND_API_KEY;
console.log("Using Resend API Key:", resendKey ? `${resendKey.substring(0, 10)}...` : "NONE");

const resend = new Resend(resendKey);

async function testSend() {
  const recipientEmail = process.argv[2] || "its.ibrahim.sohail@gmail.com";
  console.log(`Sending test email to: ${recipientEmail}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: "Maths with SK <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "Welcome to A-Level Mathematics! - Course Unlocked",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f97316; font-size: 24px; margin: 0;">Maths with SK</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">A-Level Mathematics E-Learning Platform</p>
          </div>

          <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Welcome to A-Level Mathematics!</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>Student</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Your payment has been successfully approved! Full access to all HD video lectures, handwritten notes, and past paper walkthroughs is now active.
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a href="http://localhost:3000/portal" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
              Go to Student Portal & Start Learning →
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 14px; color: #475569; margin: 0;">
            Best of luck with your studies,<br />
            <strong>SK</strong><br />
            <span style="color: #94a3b8; font-size: 12px;">Maths with SK Specialist</span>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
    } else {
      console.log("✅ Email sent successfully! Message ID:", data.id);
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

testSend();
