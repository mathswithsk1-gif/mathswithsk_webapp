"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "src/components/video-player";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ChevronRight, Play } from "lucide-react";

interface LectureClientProps {
  course: {
    title: string;
    slug: string;
  };
  lecture: {
    id: string;
    title: string;
    duration_seconds: number;
  };
  signedUrl: string;
  initialMaxPosition: number;
  initialCompleted: boolean;
  prevLectureId?: string | null;
  nextLectureId?: string | null;
  isNextUnlocked: boolean;
}

export function LectureClient({
  course,
  lecture,
  signedUrl,
  initialMaxPosition,
  initialCompleted,
  prevLectureId,
  nextLectureId,
  isNextUnlocked: initialNextUnlocked,
}: LectureClientProps) {
  const router = useRouter();

  const [completed, setCompleted] = useState(initialCompleted);
  const [maxPosition, setMaxPosition] = useState(initialMaxPosition);
  const [nextUnlocked, setNextUnlocked] = useState(initialNextUnlocked);
  const [savingProgress, setSavingProgress] = useState(false);

  // Send playback position to API
  const handleProgress = async (currentTime: number) => {
    if (savingProgress) return;
    
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId: lecture.id,
          positionSeconds: currentTime,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMaxPosition(data.maxPositionSeconds);
        
        if (data.completed && !completed) {
          setCompleted(true);
          setNextUnlocked(true);
          // Refresh routers to update layout caches
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Failed to report playback progress:", err);
    }
  };

  const handleComplete = async () => {
    setSavingProgress(true);
    // Force report 100% position on ended
    await handleProgress(lecture.duration_seconds);
    setSavingProgress(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation Headers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={`/portal/courses/${course.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course Syllabus</span>
        </Link>

        {/* Breadcrumb indicator */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
          <span>{course.title}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-primary truncate max-w-xs">{lecture.title}</span>
        </div>
      </div>

      {/* Main Player Area */}
      <div className="shadow-2xl rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800 bg-slate-950 p-2">
        <VideoPlayer
          videoId={lecture.id}
          signedUrl={signedUrl}
          duration={lecture.duration_seconds}
          maxPositionSeconds={maxPosition}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />
      </div>

      {/* Navigation & Status bar below the player */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        {/* Title / Duration Status */}
        <div className="md:col-span-7 space-y-2">
          <h1 className="text-xl font-black text-black dark:text-white leading-snug">
            {lecture.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="text-slate-450">Length: {Math.round(lecture.duration_seconds / 60)} minutes</span>
            {completed && (
              <span className="text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                <span>Lecture Completed</span>
              </span>
            )}
          </div>
        </div>

        {/* Prev / Next buttons */}
        <div className="md:col-span-5 flex justify-end gap-3 w-full sm:w-auto">
          {prevLectureId ? (
            <Link
              href={`/portal/courses/${course.slug}/${prevLectureId}`}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-3 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </Link>
          ) : (
            <div className="opacity-40 cursor-not-allowed select-none bg-slate-100 dark:bg-slate-850 text-slate-400 text-xs font-bold px-4 py-3 rounded-xl">
              <span>Previous</span>
            </div>
          )}

          {nextLectureId ? (
            nextUnlocked ? (
              <Link
                href={`/portal/courses/${course.slug}/${nextLectureId}`}
                className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
              >
                <span>Next Lesson</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center gap-1.5 bg-slate-150 text-slate-400 dark:bg-slate-850 text-xs font-bold px-5 py-3 rounded-xl cursor-not-allowed select-none"
                title="Complete current lecture (90% minimum) to unlock"
              >
                <span>Next Locked</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-5 py-3 rounded-xl text-xs font-extrabold border border-emerald-500/15">
              <span>Course Completed!</span>
              <CheckCircle2 className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default LectureClient;
