import React from "react";
import Link from "next/link";
import Metadata from "next";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";
import { createAdminClient } from "src/lib/supabase-server";
import { FileText, ArrowRight, Clock, Sparkles, BookOpen } from "lucide-react";

export const metadata = {
  title: "A-Level Mathematics Blog & Notes | Maths with SK",
  description: "Explore free A-Level Maths guides, exam past paper breakdowns, quadratic equation derivations, and handwritten lecture notes by SK.",
};

async function getPublishedPosts() {
  try {
    const adminSupabase = createAdminClient();
    const { data: posts, error } = await adminSupabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (!error && posts && posts.length > 0) {
      return posts;
    }
  } catch (err) {
    console.warn("Could not query Supabase for published blog posts, falling back to mock:", err);
  }

  // Fallback published posts
  return [
    {
      id: "e1112222-3333-4444-5555-666677778888",
      title: "How to Master Completing the Square in A-Level Maths",
      slug: "completing-the-square-guide",
      content: "Completing the square is one of the most vital techniques in A-Level Pure Mathematics. It allows you to find the vertex of a parabola, solve quadratic equations without the formula, and evaluate integrals involving quadratic forms.",
      meta_title: "Master Completing the Square - A-Level Maths Guide by SK",
      meta_description: "Learn how to complete the square in A-Level Mathematics with step-by-step examples, past paper tips, and handwritten notes by SK.",
      image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
      status: "published",
      created_at: new Date().toISOString(),
    },
  ];
}

export default async function BlogListingPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <Navbar />

      <main className="flex-grow py-12 bg-slate-50/40 dark:bg-slate-950/20 min-h-[85vh]">
        <Section bg="white" className="rounded-3xl border border-slate-200/40 dark:border-slate-800/60 p-6 md:p-12 shadow-sm space-y-10 max-w-6xl mx-auto">
          {/* HEADER HERO BANNER */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>A-Level Mathematics Library</span>
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Handwritten Notes & Free Exam Guides
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Master complex Pure Mathematics topics with free step-by-step derivations, past paper strategies, and handwritten formula sheets by SK.
            </p>
          </div>

          {/* BLOG POSTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail / Handwritten Note Image */}
                  {post.image_url && (
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span>Handwritten Notes Included</span>
                      </div>
                    </div>
                  )}

                  <div className="p-6 md:p-8 space-y-3">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {post.meta_description || post.content.replace(/[#*$`]/g, "").substring(0, 160) + "..."}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 md:px-8 md:pb-8 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-850">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>5 min read</span>
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary group-hover:translate-x-1 transition-transform"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
