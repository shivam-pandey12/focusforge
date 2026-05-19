"use client";

import { useCallback, useState } from "react";
import { getMonthDateRange, getTodayDateKey, getWeekDateRange } from "@/lib/date";
import {
  fetchHabitCompletions,
  fetchHabits,
  fetchAssignments,
  fetchBacklogItems,
  fetchDailyBattlePlans,
  fetchExamSchedules,
  fetchMarksEntries,
  fetchMockTests,
  fetchNotes,
  fetchRevisionPlans,
  fetchScheduleProfiles,
  fetchDailyReviews,
  fetchStreak,
  fetchStudyReminders,
  fetchStudyGoals,
  fetchStudyJournals,
  fetchSyllabusChapters,
  fetchSyllabusSubjects,
  fetchSyllabusTopics,
  fetchTimetableBlocks,
  fetchUserProfile,
  fetchUserSessions,
  fetchUserTasks,
  fetchWeeklyReviews,
  getFirestoreErrorMessage,
  getSessionsByDateRange,
  getTasksByDateRange
} from "@/lib/firebase/firestore";

interface UseDataExportResult {
  loading: boolean;
  error: string | null;
  exportSessionsCsv: () => void;
  exportTasksCsv: () => void;
  exportNotesJson: () => void;
  exportAnalyticsJson: () => void;
  exportFullJson: () => void;
}

function csvValue(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "No data\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    lines.push(headers.map((header) => csvValue(row[header])).join(","));
  });

  return `${lines.join("\n")}\n`;
}

function downloadText(filename: string, mimeType: string, content: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useDataExport(userId?: string | null): UseDataExportResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = getTodayDateKey();

  const runExport = useCallback(
    (exporter: (currentUserId: string) => Promise<void>) => {
      if (!userId) {
        setError("Login is required before exporting data.");
        return;
      }

      setLoading(true);
      setError(null);

      exporter(userId)
        .catch((currentError) => setError(getFirestoreErrorMessage(currentError)))
        .finally(() => setLoading(false));
    },
    [userId]
  );

  const exportSessionsCsv = useCallback(() => {
    runExport(async (currentUserId) => {
      const sessions = await fetchUserSessions(currentUserId);
      const rows = sessions.map((session) => ({
        date: session.date,
        taskTitle: session.taskTitle,
        subject: session.subject ?? "",
        duration: session.duration
      }));

      downloadText(`focusforge-sessions-${today}.csv`, "text/csv;charset=utf-8", toCsv(rows));
    });
  }, [runExport, today]);

  const exportTasksCsv = useCallback(() => {
    runExport(async (currentUserId) => {
      const tasks = await fetchUserTasks(currentUserId);
      const rows = tasks.map((task) => ({
        date: task.date,
        title: task.title,
        subject: task.subject ?? "",
        duration: task.duration,
        completed: task.completed ? "yes" : "no"
      }));

      downloadText(`focusforge-tasks-${today}.csv`, "text/csv;charset=utf-8", toCsv(rows));
    });
  }, [runExport, today]);

  const exportNotesJson = useCallback(() => {
    runExport(async (currentUserId) => {
      const notes = await fetchNotes(currentUserId);
      downloadText(`focusforge-notes-${today}.json`, "application/json;charset=utf-8", JSON.stringify(notes, null, 2));
    });
  }, [runExport, today]);

  const exportAnalyticsJson = useCallback(() => {
    runExport(async (currentUserId) => {
      const weekRange = getWeekDateRange();
      const monthRange = getMonthDateRange();
      const [weeklySessions, monthlySessions, monthlyTasks, streak] = await Promise.all([
        getSessionsByDateRange(currentUserId, weekRange.start, weekRange.end),
        getSessionsByDateRange(currentUserId, monthRange.start, monthRange.end),
        getTasksByDateRange(currentUserId, monthRange.start, monthRange.end),
        fetchStreak(currentUserId)
      ]);
      const weeklyStudyTime = weeklySessions.reduce((total, session) => total + session.duration, 0);
      const monthlyStudyTime = monthlySessions.reduce((total, session) => total + session.duration, 0);
      const completedTasks = monthlyTasks.filter((task) => task.completed).length;

      downloadText(
        `focusforge-analytics-${today}.json`,
        "application/json;charset=utf-8",
        JSON.stringify(
          {
            weeklyStudyTime,
            monthlyStudyTime,
            averageDailyStudyTime: Math.round(monthlyStudyTime / Math.max(1, new Date().getDate())),
            longestStreak: streak?.longestStreak ?? streak?.currentStreak ?? 0,
            sessionsThisWeek: weeklySessions.length,
            taskCompletionRate: monthlyTasks.length > 0 ? Math.round((completedTasks / monthlyTasks.length) * 100) : 0
          },
          null,
          2
        )
      );
    });
  }, [runExport, today]);

  const exportFullJson = useCallback(() => {
    runExport(async (currentUserId) => {
      const [
        profile,
        tasks,
        sessions,
        notes,
        assignments,
        examSchedules,
        marksEntries,
        backlogItems,
        dailyBattlePlans,
        timetable,
        scheduleProfiles,
        revisions,
        syllabusSubjects,
        syllabusChapters,
        syllabusTopics,
        goals,
        habits,
        habitCompletions,
        mockTests,
        journal,
        dailyReviews,
        weeklyReviews,
        reminders,
        streak
      ] =
        await Promise.all([
          fetchUserProfile(currentUserId),
          fetchUserTasks(currentUserId),
          fetchUserSessions(currentUserId),
          fetchNotes(currentUserId),
          fetchAssignments(currentUserId),
          fetchExamSchedules(currentUserId),
          fetchMarksEntries(currentUserId),
          fetchBacklogItems(currentUserId),
          fetchDailyBattlePlans(currentUserId),
          fetchTimetableBlocks(currentUserId),
          fetchScheduleProfiles(currentUserId),
          fetchRevisionPlans(currentUserId),
          fetchSyllabusSubjects(currentUserId),
          fetchSyllabusChapters(currentUserId),
          fetchSyllabusTopics(currentUserId),
          fetchStudyGoals(currentUserId),
          fetchHabits(currentUserId),
          fetchHabitCompletions(currentUserId),
          fetchMockTests(currentUserId),
          fetchStudyJournals(currentUserId),
          fetchDailyReviews(currentUserId),
          fetchWeeklyReviews(currentUserId),
          fetchStudyReminders(currentUserId),
          fetchStreak(currentUserId)
        ]);

      downloadText(
        `focusforge-full-data-${today}.json`,
        "application/json;charset=utf-8",
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            profile,
            tasks,
            sessions,
            notes,
            assignments,
            examSchedules,
            marksEntries,
            backlogItems,
            dailyBattlePlans,
            timetable,
            scheduleProfiles,
            revisions,
            syllabus: {
              subjects: syllabusSubjects,
              chapters: syllabusChapters,
              topics: syllabusTopics
            },
            goals,
            habits,
            habitCompletions,
            mockTests,
            journal,
            dailyReviews,
            weeklyReviews,
            reminders,
            streak
          },
          null,
          2
        )
      );
    });
  }, [runExport, today]);

  return {
    loading,
    error,
    exportSessionsCsv,
    exportTasksCsv,
    exportNotesJson,
    exportAnalyticsJson,
    exportFullJson
  };
}
