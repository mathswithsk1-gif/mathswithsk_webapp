const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Manually parse .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing environment variables:", { supabaseUrl, supabaseAnonKey, supabaseServiceKey });
  process.exit(1);
}

async function test() {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  // Find admin email
  const { data: adminStudent, error: findError } = await adminClient
    .from("students")
    .select("email")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (findError || !adminStudent) {
    console.error("Error finding admin user:", findError);
    return;
  }

  console.log("Found admin email:", adminStudent.email);

  // Generate magic link
  const { data, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: adminStudent.email,
  });

  if (linkError) {
    console.error("Error generating link:", linkError);
    return;
  }

  console.log("Generated properties:", data.properties);

  // Verify OTP using the hashed_token
  const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink"
  });

  if (verifyError) {
    console.error("Verify OTP failed:", verifyError);
  } else {
    console.log("Verify OTP succeeded! User logged in:", verifyData.user.email);
  }
}

test();
