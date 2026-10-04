import { createAdminClient } from "./supabase-server";
import { getCache, setCache, getEnrollmentKey, getUnlockedLecturesKey } from "./redis";

/**
 * Checks if a student has an active enrollment in a course.
 * Uses Upstash Redis cache-aside strategy (caches for 5 mins / 300s).
 */
export async function checkEnrollment(studentId: string, courseId: string): Promise<boolean> {
  const cacheKey = getEnrollmentKey(studentId, courseId);
  
  // Try Cache
  const cachedStatus = await getCache<string>(cacheKey);
  if (cachedStatus !== null) {
    return cachedStatus === "active";
  }

  // Query DB (Using Admin client to ensure RLS bypass if called from internal routes)
  const adminSupabase = createAdminClient();
  const { data: enrollment, error } = await adminSupabase
    .from("enrollments")
    .select("status")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .single();

  const isActive = !error && enrollment && enrollment.status === "active";

  // Save Cache
  await setCache(cacheKey, isActive ? "active" : "none", 300);

  return isActive;
}

/**
 * Computes and returns the set of unlocked lecture IDs for a student in a course.
 * Rules:
 * - First lecture is always unlocked.
 * - Lecture N unlocks only if Lecture N-1 has a progress record marked as completed.
 * Uses Upstash Redis cache-aside strategy (caches for 1 hr / 3600s).
 */
export async function getUnlockedLectureIds(studentId: string, courseId: string): Promise<Set<string>> {
  const cacheKey = getUnlockedLecturesKey(studentId, courseId);

  // Try Cache
  const cachedIds = await getCache<string[]>(cacheKey);
  if (cachedIds !== null) {
    return new Set(cachedIds);
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch all lectures for this course ordered strictly by week_number, then order_index
  const { data: lectures, error: lecturesError } = await adminSupabase
    .from("lectures")
    .select("id, title")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true })
    .order("order_index", { ascending: true });

  const unlockedSet = new Set<string>();

  if (lecturesError || !lectures || lectures.length === 0) {
    return unlockedSet;
  }

  // 2. Fetch all completed progress records for this student in this course
  const { data: progresses, error: progressError } = await adminSupabase
    .from("progress")
    .select("lecture_id, completed")
    .eq("student_id", studentId)
    .eq("completed", true);

  const completedLectureIds = new Set<string>(
    progressError || !progresses ? [] : progresses.map((p) => p.lecture_id)
  );

  // 3. Compute unlocked chain
  // First lecture is always unlocked
  unlockedSet.add(lectures[0].id);

  for (let i = 1; i < lectures.length; i++) {
    const previousLectureId = lectures[i - 1].id;
    // Current lecture is unlocked if the previous one is completed
    if (completedLectureIds.has(previousLectureId)) {
      unlockedSet.add(lectures[i].id);
    } else {
      // Once we hit a locked lecture, all subsequent lectures in linear order are locked
      break;
    }
  }

  // Save Cache
  await setCache(cacheKey, Array.from(unlockedSet), 3600);

  return unlockedSet;
}

/**
 * Checks if a specific lecture is unlocked for a student.
 */
export async function isLectureUnlocked(
  studentId: string,
  courseId: string,
  lectureId: string
): Promise<boolean> {
  const unlockedIds = await getUnlockedLectureIds(studentId, courseId);
  return unlockedIds.has(lectureId);
}
