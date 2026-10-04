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

async function testGmailSignup() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const email = `teststudent_${Date.now()}@gmail.com`;
  const password = "Password123!";
  const name = "Test Student Gmail";
  const phone = "03001234567";

  console.log("Signing up user with Gmail:", email);

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        role: "student",
      },
    },
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }

  console.log("SignUp successful! User ID:", authData.user?.id);

  // Auto-confirm
  const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
    authData.user.id,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error("Confirm Email Error:", confirmError);
  } else {
    console.log("Email auto-confirmed successfully!");
  }

  // Insert into students
  const { error: studentDbError } = await adminSupabase
    .from("students")
    .insert({
      id: authData.user.id,
      name,
      email,
      phone,
      role: "student",
    });

  if (studentDbError) {
    console.error("Insert into public.students failed:", studentDbError);
  } else {
    console.log("Insert into public.students succeeded!");
  }

  // Cleanup user from auth.users
  console.log("Cleaning up test user...");
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(authData.user.id);
  if (deleteError) {
    console.error("Delete user cleanup failed:", deleteError);
  } else {
    console.log("Cleanup complete!");
  }
}

testGmailSignup();
