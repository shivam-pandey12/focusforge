"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import PlanBadge from "@/components/PlanBadge";
import ProfileAvatar from "@/components/ProfileAvatar";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { getDefaultProfileInput, STUDY_GOAL_OPTIONS } from "@/lib/profileDefaults";
import { resizeProfileImage } from "@/lib/profileImage";
import { useAuth } from "@/hooks/useAuth";
import { useDataExport } from "@/hooks/useDataExport";
import { usePlan } from "@/hooks/usePlan";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canUseFeature } from "@/lib/plans";
import type { UserProfileInput } from "@/lib/firebase/firestore";

function parseSubjects(value: string): string[] {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function SettingsContent() {
  const { user } = useAuth();
  const profile = useUserProfile(user?.uid);
  const plan = usePlan(user?.uid);
  const canExport = canUseFeature(plan.plan, "dataExport");
  const exportData = useDataExport(canExport ? user?.uid : undefined);
  const [form, setForm] = useState<UserProfileInput>(getDefaultProfileInput());
  const [subjectsText, setSubjectsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);

  useEffect(() => {
    const defaults = getDefaultProfileInput(profile.profile);
    setForm(defaults);
    setSubjectsText(defaults.subjects.join(", "));
  }, [profile.profile]);

  function updateForm(partial: Partial<UserProfileInput>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await profile.saveProfile({
        ...form,
        subjects: parseSubjects(subjectsText),
        onboardingCompleted: true
      });
      setSuccess("Settings saved.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileImageChange(file?: File) {
    if (!file) {
      return;
    }

    setImageProcessing(true);
    setSuccess(null);
    setError(null);

    try {
      const profileImageDataUrl = await resizeProfileImage(file);
      updateForm({ profileImageDataUrl });
      setSuccess("Profile image ready. Save settings to keep it.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not process profile image.");
    } finally {
      setImageProcessing(false);
    }
  }

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="Tune FocusForge to your routine."
          subtitle="Keep profile, targets, reminders, and exports in one calm place."
        />

        {profile.error || exportData.error || error ? (
          <StatusMessage tone="error">{error ?? profile.error ?? exportData.error}</StatusMessage>
        ) : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6 sm:p-8">
            <SectionHeader title="Profile and study preferences" subtitle="These values power onboarding-aware summaries." />
            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="label">Display name</span>
                <input
                  className="input"
                  value={form.displayName}
                  onChange={(event) => updateForm({ displayName: event.target.value })}
                  placeholder="Your name"
                />
              </label>
              <div className="rounded-3xl border border-forge-line bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar
                      className="h-20 w-20 rounded-3xl text-xl"
                      displayName={form.displayName}
                      email={user?.email}
                      src={form.profileImageDataUrl || user?.photoURL}
                    />
                    <div>
                      <p className="text-lg font-bold text-forge-text">Profile image</p>
                      <p className="mt-1 text-sm font-semibold text-forge-muted">
                        Upload a square avatar or use your Google profile photo.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="btn-secondary cursor-pointer">
                      {imageProcessing ? "Processing" : "Upload image"}
                      <input
                        accept="image/*"
                        className="sr-only"
                        disabled={imageProcessing}
                        type="file"
                        onChange={(event) => handleProfileImageChange(event.target.files?.[0])}
                      />
                    </label>
                    {form.profileImageDataUrl ? (
                      <button className="btn-ghost" type="button" onClick={() => updateForm({ profileImageDataUrl: "" })}>
                        Remove custom
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <label className="grid gap-2">
                <span className="label">Study goal</span>
                <select className="input" value={form.studyGoal} onChange={(event) => updateForm({ studyGoal: event.target.value })}>
                  {STUDY_GOAL_OPTIONS.map((goal) => (
                    <option key={goal} value={goal}>{goal}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Subjects</span>
                <textarea
                  className="input min-h-28"
                  value={subjectsText}
                  onChange={(event) => setSubjectsText(event.target.value)}
                  placeholder="Physics, Chemistry, Mathematics"
                />
              </label>
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
                  <span className="label">Default focus minutes</span>
                  <input
                    className="input"
                    min={5}
                    type="number"
                    value={form.preferredFocusDuration}
                    onChange={(event) => updateForm({ preferredFocusDuration: Number(event.target.value) })}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Week starts on</span>
                <select
                  className="input"
                  value={form.weekStartDay}
                  onChange={(event) => updateForm({ weekStartDay: Number(event.target.value) })}
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </label>
              <button className="btn-primary w-full sm:w-fit" disabled={saving} type="button" onClick={handleSave}>
                {saving ? "Saving" : "Save settings"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <section className="card p-6">
              <SectionHeader title="Reminder preferences" subtitle="In-app reminders work even without browser notifications." />
              <div className="mt-5 grid gap-4">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-forge-line bg-white p-4">
                  <span className="font-bold text-forge-text">Enable daily reminder</span>
                  <input
                    checked={form.notificationEnabled}
                    type="checkbox"
                    onChange={(event) => updateForm({ notificationEnabled: event.target.checked })}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="label">Reminder time</span>
                  <input className="input" type="time" value={form.reminderTime} onChange={(event) => updateForm({ reminderTime: event.target.value })} />
                </label>
                {[
                  ["revisionReminderEnabled", "Revision reminders"],
                  ["habitReminderEnabled", "Habit reminders"],
                  ["taskReminderEnabled", "Task reminders"]
                ].map(([key, label]) => (
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-forge-line bg-white p-4" key={key}>
                    <span className="font-bold text-forge-text">{label}</span>
                    <input
                      checked={Boolean(form[key as keyof UserProfileInput])}
                      type="checkbox"
                      onChange={(event) => updateForm({ [key]: event.target.checked } as Partial<UserProfileInput>)}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <SectionHeader title="Email preferences" subtitle="Email delivery is not connected yet, but these launch settings are ready." />
              <div className="mt-5 grid gap-4">
                {[
                  ["emailNotificationsEnabled", "Enable email notifications"],
                  ["welcomeEmailsEnabled", "Welcome emails"],
                  ["paymentEmailsEnabled", "Payment emails"],
                  ["planExpiryEmailsEnabled", "Plan expiry reminders"],
                  ["weeklySummaryEmailsEnabled", "Weekly summary emails"]
                ].map(([key, label]) => (
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-forge-line bg-white p-4" key={key}>
                    <span className="font-bold text-forge-text">{label}</span>
                    <input
                      checked={Boolean(form[key as keyof UserProfileInput])}
                      type="checkbox"
                      onChange={(event) => updateForm({ [key]: event.target.checked } as Partial<UserProfileInput>)}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <SectionHeader title="Theme" subtitle="Use the header toggle to switch theme instantly." />
              <p className="mt-4 text-base leading-7 text-forge-muted">
                FocusForge keeps your current light/dark preference locally so the app stays comfortable between sessions.
              </p>
            </section>
            <section className="card p-6">
              <SectionHeader title="Plan" subtitle="Manage access and prepare for future payments." />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <PlanBadge plan={plan.plan} />
                <Link className="btn-secondary" href="/settings/billing">Open billing</Link>
              </div>
            </section>
            <section className="card p-6">
              <SectionHeader title="Launch support" subtitle="Docs, support, feedback, updates, and safe data controls." />
              <div className="mt-5 grid gap-3">
                <Link className="btn-secondary w-full" href="/docs">Documentation</Link>
                <Link className="btn-secondary w-full" href="/support">Support</Link>
                <Link className="btn-secondary w-full" href="/feedback">Feedback</Link>
                <Link className="btn-secondary w-full" href="/updates">Updates</Link>
                <Link className="btn-primary w-full" href="/settings/data">Data controls</Link>
              </div>
            </section>
          </div>
        </section>

        {canExport ? (
          <section className="card p-6 sm:p-8">
            <SectionHeader title="Data export" subtitle="Generate local files in your browser. Only your signed-in data is included." />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <button className="btn-secondary" disabled={exportData.loading} type="button" onClick={exportData.exportSessionsCsv}>Sessions CSV</button>
              <button className="btn-secondary" disabled={exportData.loading} type="button" onClick={exportData.exportTasksCsv}>Tasks CSV</button>
              <button className="btn-secondary" disabled={exportData.loading} type="button" onClick={exportData.exportNotesJson}>Notes JSON</button>
              <button className="btn-secondary" disabled={exportData.loading} type="button" onClick={exportData.exportAnalyticsJson}>Analytics JSON</button>
              <button className="btn-primary" disabled={exportData.loading} type="button" onClick={exportData.exportFullJson}>Full export</button>
            </div>
          </section>
        ) : (
          <FeatureLockedCard
            feature="dataExport"
            title="Data export is a Forge Pro feature"
            description="Your study data stays safe. Upgrade to Forge Pro when you want CSV and JSON exports for deeper personal backups."
          />
        )}
      </main>
    </>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
