"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import StatusMessage from "@/components/StatusMessage";
import { addStudyHabit, addStudyTask } from "@/lib/firebase/firestore";
import { getDefaultProfileInput, STUDY_GOAL_OPTIONS } from "@/lib/profileDefaults";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { UserProfileInput } from "@/lib/firebase/firestore";

const STEPS = ["Welcome", "Goal", "Subjects", "Targets", "First move", "Finish"];

function parseSubjects(value: string): string[] {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function OnboardingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile(user?.uid);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserProfileInput>(getDefaultProfileInput());
  const [subjectsText, setSubjectsText] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [firstTask, setFirstTask] = useState("");
  const [firstHabit, setFirstHabit] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.profile) {
      return;
    }

    const nextForm = getDefaultProfileInput(profile.profile);
    setForm(nextForm);
    setSubjectsText(nextForm.subjects.join(", "));
  }, [profile.profile]);

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  function updateForm(partial: Partial<UserProfileInput>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function finishOnboarding(skip = false) {
    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const subjects = parseSubjects(subjectsText);
      const studyGoal = form.studyGoal === "Custom" ? customGoal.trim() || "General productivity" : form.studyGoal;

      await profile.saveProfile({
        ...form,
        studyGoal,
        subjects,
        onboardingCompleted: true
      });

      if (!skip) {
        if (firstTask.trim()) {
          await addStudyTask(user.uid, firstTask.trim(), form.preferredFocusDuration, subjects[0]);
        }

        if (firstHabit.trim()) {
          await addStudyHabit(user.uid, { title: firstHabit.trim(), description: "Created during onboarding." });
        }
      }

      setMessage("Your workspace is ready.");
      router.replace("/dashboard");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not finish onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Navbar email={user?.email} />
    <main className="page-shell min-h-screen space-y-6 py-8">
      <PageHeader
        eyebrow="Launch setup"
        title="Shape FocusForge around your study rhythm."
        subtitle="A short setup helps the dashboard show the right target, reminders, and first action."
        action={
          <button className="btn-secondary" disabled={saving} type="button" onClick={() => finishOnboarding(true)}>
            Skip setup
          </button>
        }
      />

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

      <section className="card p-6 sm:p-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="eyebrow">{STEPS[step]}</p>
            <p className="text-sm font-bold text-forge-muted">{step + 1} of {STEPS.length}</p>
          </div>
          <ProgressBar value={progress} />
        </div>

        {step === 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="section-title">Welcome to a calmer study system.</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-forge-muted">
                FocusForge works best when it knows your target and default focus length. You can change everything
                later from settings.
              </p>
            </div>
            <div className="card-muted p-5">
              <p className="text-lg font-bold text-forge-text">Setup creates</p>
              <ul className="mt-4 space-y-3 text-base font-semibold text-forge-muted">
                <li>Daily study target</li>
                <li>Preferred focus duration</li>
                <li>Subject list</li>
                <li>Optional first task or habit</li>
              </ul>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <label className="grid gap-2">
              <span className="label">Study goal</span>
              <select
                className="input"
                value={form.studyGoal}
                onChange={(event) => updateForm({ studyGoal: event.target.value })}
              >
                {STUDY_GOAL_OPTIONS.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
            </label>
            {form.studyGoal === "Custom" ? (
              <label className="grid gap-2">
                <span className="label">Custom goal</span>
                <input
                  className="input"
                  value={customGoal}
                  onChange={(event) => setCustomGoal(event.target.value)}
                  placeholder="e.g. Finish first semester strong"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <label className="grid gap-2">
            <span className="label">Subjects</span>
            <textarea
              className="input min-h-36"
              value={subjectsText}
              onChange={(event) => setSubjectsText(event.target.value)}
              placeholder="Physics, Chemistry, Mathematics"
            />
            <span className="text-sm font-semibold text-forge-muted">Separate subjects with commas.</span>
          </label>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="label">Daily study target</span>
              <input
                className="input"
                min={15}
                type="number"
                value={form.dailyStudyTargetMinutes}
                onChange={(event) => updateForm({ dailyStudyTargetMinutes: Number(event.target.value) })}
              />
            </label>
            <label className="grid gap-2">
              <span className="label">Preferred focus duration</span>
              <input
                className="input"
                min={5}
                type="number"
                value={form.preferredFocusDuration}
                onChange={(event) => updateForm({ preferredFocusDuration: Number(event.target.value) })}
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="label">First task</span>
              <input
                className="input"
                value={firstTask}
                onChange={(event) => setFirstTask(event.target.value)}
                placeholder="Review physics notes"
              />
            </label>
            <label className="grid gap-2">
              <span className="label">First habit</span>
              <input
                className="input"
                value={firstHabit}
                onChange={(event) => setFirstHabit(event.target.value)}
                placeholder="Solve 20 questions"
              />
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h2 className="section-title">Ready when you are.</h2>
            <p className="max-w-2xl text-lg leading-8 text-forge-muted">
              Finish setup to open your dashboard with your study target, preferred timer, reminders, and first action
              ready.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button className="btn-secondary" disabled={step === 0 || saving} type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" type="button" onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button className="btn-primary" disabled={saving} type="button" onClick={() => finishOnboarding(false)}>
              {saving ? "Saving" : "Finish setup"}
            </button>
          )}
        </div>
      </section>
    </main>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
