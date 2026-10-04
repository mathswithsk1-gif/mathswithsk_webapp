import React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, GraduationCap, Award, HelpCircle, ArrowRight, Video, Flame } from "lucide-react";
import { createServerSupabaseClient } from "src/lib/supabase-server";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";
import { VideoPlayer } from "src/components/video-player";
import { ShapeGrid } from "src/components/shape-grid";
import { SquishyCard } from "src/components/squishy-card";
import { TestimonialCarousel } from "src/components/testimonial-carousel";
import { FAQAccordion } from "src/components/faq-accordion";

export const revalidate = 3600; // Revalidate public page every hour (ISR)

async function getPublishedCourses() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published");

    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch (err) {
    console.warn("Failed to fetch courses, falling back to mock seed data:", err);
  }

  // Fallback mock data matching seed file
  return [
    {
      id: "a5fa5e99-8cfb-4a5c-897d-419b457e5e32",
      title: "A-Level Maths: Quadratic Equations",
      slug: "quadratic-equations",
      description: "Master quadratic equations for A-Level Maths. Covers solving by factoring, completing the square, the quadratic formula, and graphing quadratic functions with past paper practice.",
      price_pkr: 4000,
      vsl_video_id: "mock-vsl-video-id",
      status: "published",
    },
  ];
}

export default async function HomePage() {
  const courses = await getPublishedCourses();

  const faqs = [
    {
      q: "How does the sequential video unlocking work?",
      a: "To ensure you fully master each topic, you must watch at least 90% of a lecture before the next one is unlocked. You cannot skip ahead, but you can rewind and rewatch completed lectures as many times as you like.",
    },
    {
      q: "How can I pay for the courses from Pakistan?",
      a: "We support instant online payments through Safepay. You can pay securely using credit/debit cards (Visa/Mastercard) and mobile wallets. Your course access is activated immediately upon successful payment.",
    },
    {
      q: "Can parents monitor their child's progress?",
      a: "Yes! The student portal tracks the progress of each lecture. Parents can log in to view the completed checklist and furthest position watched on the dashboard.",
    },
    {
      q: "Are these courses suitable for CIE A-Level Maths (9709)?",
      a: "Yes, all lectures, exercises, and past papers are tailored specifically to the Cambridge Assessment International Education (CIE) A-Level Mathematics syllabus.",
    },
  ];

  return (
    <>
      <Navbar />

      <main className="flex-grow overflow-x-hidden">
        {/* HERO SECTION WITH SHAPE GRID & BLUR GLOW */}
        <section className="w-full pt-20 md:pt-32 pb-44 md:pb-56 px-4 md:px-8 bg-white relative overflow-hidden text-center flex flex-col items-center">
          {/* Interactive ShapeGrid Background */}
          <div className="absolute inset-0 z-0 opacity-[0.65]">
            <ShapeGrid
              speed={0.5}
              squareSize={40}
              direction="diagonal"
              borderColor="#F97316"
              hoverFillColor="#F97316"
              shape="hexagon"
              hoverTrailAmount={8}
            />
          </div>

          {/* Blur Glows */}
          <div className="absolute top-[-100px] right-[-100px] md:top-[-200px] md:right-[-200px] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-gradient-to-br from-primary/20 via-rose-500/10 to-transparent blur-[80px] md:blur-[120px] pointer-events-none z-0" />
          <div className="absolute top-[40%] left-[-150px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none z-0" />

          <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
            {/* The Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary/20 bg-white/70 backdrop-blur-xs text-slate-800 text-xs font-bold mb-8 shadow-xs dark:bg-slate-900/60 dark:text-white dark:border-slate-800 animate-pulse">
              <span className="text-primary">✨</span>
              <span>Best Online Platform for CIE A-Level Maths</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>            {/* Hero Title */}
            <h1 className="text-4xl md:text-6xl lg:text-[4.25rem] font-black tracking-tight max-w-4xl leading-[1.15] text-[#0f172b]">
              Stop memorizing formulas, let the math make sense on your <span className="underline decoration-primary decoration-wavy decoration-3 underline-offset-8">own</span> 📈
            </h1>

            {/* Subheader */}
            <p className="mt-6 text-sm md:text-base text-[#0f172b] max-w-2xl leading-relaxed">
              We build your mathematical intuition from A to Z to guarantee your A* in CIE A-Level Maths. 
              Complete video curriculum, anti-skip progression, and live past paper practice.
            </p>

            {/* Actions (Pill Buttons) */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="#courses"
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4.5 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span>Explore Courses & Join Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#vsl"
                className="border border-[#0f172b] text-[#0f172b] font-black text-xs tracking-wider uppercase px-8 py-4.5 rounded-full transition-all hover:bg-[#0f172b] hover:text-white flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4 text-primary" />
                <span>Watch Sample Video</span>
              </Link>
            </div>

            {/* Trust Logo Banner */}
            <div className="mt-16 text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0f172b]">
                Trusted by Students Across Top Institutions & Boards
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-80">
                <span className="font-extrabold text-sm text-[#0f172b] tracking-wider">CAMBRIDGE (CIE)</span>
                <span className="font-bold text-sm text-[#0f172b] tracking-wider">EDEXCEL</span>
                <span className="font-black text-sm text-[#0f172b] tracking-wider">AQA</span>
                <span className="font-black text-sm text-[#0f172b] tracking-wider">IB MATHS</span>
              </div>
            </div>
          </div>
        </section>

        {/* OVERLAPPING VSL SECTION */}
        <section id="vsl" className="relative z-20 max-w-4xl mx-auto px-4 -mt-36 md:-mt-48 pb-16 md:pb-24">
          <div className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-2xl">
            <VideoPlayer
              videoId="dQw4w9WgXcQ"
              duration={180} // 3 mins VSL
              isVSL={true}
            />
          </div>
          
          <div className="mt-12 text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-extrabold tracking-widest text-primary uppercase">Video Sales Letter</span>
            <h2 className="text-2xl font-black tracking-tight text-[#0f172b] sm:text-3xl">
              Meet Your Instructor: SK
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Watch this brief video lesson overview to see how SK simplifies complex A-Level math topics, and how our interactive platform ensures you stay on track.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="#courses"
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Learning with SK</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="w-full py-16 md:py-24 px-4 md:px-8 bg-[#0f172b] text-white border-y border-slate-800">
          <div className="max-w-6xl mx-auto w-full space-y-12 animate-fade-in">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                About Us
              </h2>
              <p className="text-sm text-slate-300">
                A premier educational brand coached by SK, delivering high-impact, conceptual A-Level Maths preparation that transforms student results.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column (spans 6 columns) */}
              <div className="lg:col-span-6 flex flex-col justify-between gap-6">
                {/* Top Left: Large Image Card */}
                <div className="relative flex-grow min-h-[240px] rounded-[2rem] overflow-hidden border border-slate-200/40 dark:border-slate-800/80 shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                    alt="Students studying"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                {/* Bottom Left: Stat Capsule Card */}
                <div className="bg-slate-950 text-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-800/80 dark:border-slate-850 flex justify-around items-center min-h-[105px] shadow-sm">
                  <div className="text-center">
                    <span className="block text-3xl font-black text-primary">10+ Years</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">Teaching Experience</span>
                  </div>
                  <div className="w-px h-10 bg-slate-850" />
                  <div className="text-center">
                    <span className="block text-3xl font-black text-primary">92%</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">A*/A Grade Rate</span>
                  </div>
                </div>
              </div>

              {/* Center Column (spans 3 columns) */}
              <div className="lg:col-span-3 flex flex-col justify-between rounded-[2rem] border border-purple-500/35 bg-purple-500/5 p-6 shadow-sm min-h-[420px]">
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-white">
                    Empowering Students
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    We build innovative visual frameworks that make complex calculus, algebra, and trigonometry clear and simple.
                  </p>
                </div>
                <div className="relative w-full h-[180px] rounded-2xl overflow-hidden mt-6 border border-slate-105 dark:border-slate-800/50">
                  <img
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                    alt="Digital learning"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Column (spans 3 columns) */}
              <div className="lg:col-span-3 flex flex-col justify-between rounded-[2rem] border border-sky-500/35 bg-[#0f172b] p-6 shadow-sm min-h-[420px]">
                <div className="relative w-full h-[180px] rounded-2xl overflow-hidden mb-6 border border-slate-800/50">
                  <img
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"
                    alt="Mentorship"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-white">
                    Proven, Reliable & Responsive Guidance
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A dedicated mentor with a proven track record, structured study plans, 24/7 student support, and active past-paper practice to guarantee a path to your A*.
                  </p>
                </div>
              </div>

            </div>
            <div className="mt-12 flex justify-center">
              <Link
                href="#courses"
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enroll in the A* Syllabus</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* COURSES LIST SECTION */}
        <Section id="courses" bg="alwaysWhite" className="flex flex-col items-center">
          <div className="text-center max-w-2xl mb-12">
            <h2 className="text-3xl font-black tracking-tight text-[#0f172b] sm:text-4xl">
              Featured Mathematics Courses
            </h2>
            <p className="mt-4 text-[#0f172b]/80">
              Get comprehensive access to high-definition video lectures, notes, and revision papers. Select a course below to view details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl justify-center">
            {courses.map((course: any) => (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-[2rem] bg-[#0f172b]/5 border border-[#0f172b]/10 hover:border-primary/20 p-6 shadow-xs hover:shadow-md transition-all duration-300 group"
              >
                <div>
                  <div className="h-44 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/5 flex items-center justify-center mb-6 relative overflow-hidden">
                    <BookOpen className="w-12 h-12 text-primary stroke-[1.5] group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute top-3 right-3 bg-[#0f172b] text-white text-[10px] font-bold px-2 py-1 rounded">
                      CIE 9709
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-[#0f172b] group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-3 text-[#0f172b]/80 text-xs line-clamp-3">
                    {course.description}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-[#0f172b]/10 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Course Fee</span>
                    <span className="text-lg font-black text-[#0f172b]">Rs. {course.price_pkr.toLocaleString()}</span>
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex items-center gap-1.5 bg-primary/95 hover:bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all hover:scale-[1.01]"
                  >
                    <span>View Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center w-full">
            <Link
              href="#courses"
              className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Instant Access to Lectures</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Section>

        {/* HOW IT WORKS SECTION */}
        <Section id="how-it-works" bg="darkSlate">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              The Path to A* is Structured
            </h2>
            <p className="mt-4 text-slate-300">
              No endless skipping or fragmented learning. Our system guides students step-by-step.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 w-full">
            <SquishyCard
              step="1"
              title="Register & Enroll"
              description="Create a secure student account in under 30 seconds. Choose your course and proceed to payment."
              buttonText="Join Now"
              buttonHref="#courses"
              variant={1}
            />
            <SquishyCard
              step="2"
              title="Instant Payment"
              description="Pay instantly via cards or wallets using Safepay. No manual receipt approvals. Portal unlocks immediately."
              buttonText="Enroll Today"
              buttonHref="#courses"
              variant={2}
            />
            <SquishyCard
              step="3"
              title="Sequential Unlocking"
              description="Watch 90% of Lecture N to unlock Lecture N+1. Build complete conceptual consistency without gaps."
              buttonText="Learn Syllabus"
              buttonHref="#courses"
              variant={3}
            />
          </div>

          <div className="mt-12 flex justify-center w-full">
            <Link
              href="#courses"
              className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Unlock Your Path to A* Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Section>

        {/* TESTIMONIALS SECTION */}
        <Section bg="alwaysWhite" className="flex flex-col items-center">
          <div className="text-center max-w-2xl mb-12">
            <h2 className="text-3xl font-black tracking-tight text-[#0f172b] sm:text-4xl">
              Approved by Parents & Students
            </h2>
            <p className="mt-4 text-[#0f172b]/80">
              Read how SK's visual methods have transformed math results for Pakistani students.
            </p>
          </div>

          <TestimonialCarousel />

          <div className="mt-12 flex justify-center w-full">
            <Link
              href="#courses"
              className="bg-primary hover:bg-primary/95 text-white font-black text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Achieving Your A* Today</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Section>

        {/* FAQS SECTION */}
        <Section id="faq" bg="darkSlate" className="flex flex-col items-center">
          <div className="text-center max-w-2xl mb-12">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-slate-300">
              Got questions? We've got answers. If you need further help, feel free to contact us via WhatsApp.
            </p>
          </div>

          <FAQAccordion items={faqs} />

          <div className="mt-12 flex justify-center w-full">
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs tracking-wider uppercase px-8 py-4.5 rounded-full transition-all hover:scale-[1.01] shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Chat with SK on WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
