const { createClient } = require("@supabase/supabase-js");
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupBlogTable() {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  console.log("Checking if posts table exists in Supabase...");
  const { data: testData, error: testError } = await adminClient.from("posts").select("*").limit(1);

  if (testError && testError.code === "42P01") { // table does not exist
    console.log("Posts table missing. Note: Please execute 20260609000002_blog_schema.sql in your Supabase SQL Editor if auto-creation fails.");
  } else if (!testError) {
    console.log("Posts table exists! Current count:", testData.length);
  }

  // Ensure seed data is inserted via admin API if not already present
  const seedPosts = [
    {
      id: "e1112222-3333-4444-5555-666677778888",
      title: "How to Master Completing the Square in A-Level Maths",
      slug: "completing-the-square-guide",
      content: "Completing the square is one of the most vital techniques in A-Level Pure Mathematics. It allows you to find the vertex of a parabola, solve quadratic equations without the formula, and evaluate integrals involving quadratic forms.\n\n### The Standard Form\nA quadratic equation is written as:\n$$ax^2 + bx + c = 0$$\n\nTo complete the square when $a = 1$:\n1. Move the constant term $c$ to the right side.\n2. Add $(b/2)^2$ to both sides.\n3. Factor the perfect square trinomial on the left side.\n\n### Exam Tip\nAlways watch out for non-unit coefficients ($a \\neq 1$). Factor out $a$ from the first two terms before completing the square inside parentheses!\n\nCheck out the handwritten notes below for a step-by-step past paper problem walkthrough.",
      meta_title: "Master Completing the Square - A-Level Maths Guide by SK",
      meta_description: "Learn how to complete the square in A-Level Mathematics with step-by-step examples, past paper tips, and handwritten notes by SK.",
      image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
      status: "published"
    },
    {
      id: "f2223333-4444-5555-6666-777788889999",
      title: "Quadratic Formula Proof & Common Past Paper Traps",
      slug: "quadratic-formula-proof-and-traps",
      content: "### DRAFT POST - FOR ADMIN REVIEW ONLY\n\nThis article covers the formal derivation of the quadratic formula via completing the square, followed by a breakdown of top examiner traps in Cambridge P1 papers.\n\n### Derivation Overview:\nStart from $ax^2 + bx + c = 0$:\n$$x^2 + \\frac{b}{a}x = -\\frac{c}{a}$$\nCompleting the square:\n$$\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2}$$\nTaking square roots:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n*Note: Include handwritten diagram of discriminant cases before publishing.*",
      meta_title: "Quadratic Formula Proof & Exam Traps | A-Level Maths SK",
      meta_description: "Step-by-step proof of the quadratic formula and analysis of common mistakes made by students in Cambridge A-Level exams.",
      image_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80",
      status: "draft"
    }
  ];

  for (const post of seedPosts) {
    const { error: upsertErr } = await adminClient.from("posts").upsert(post, { onConflict: "slug" });
    if (upsertErr) {
      console.warn(`Upsert warning for post ${post.slug}:`, upsertErr.message);
    } else {
      console.log(`Successfully synced post: ${post.title} (${post.status})`);
    }
  }
}

setupBlogTable();
