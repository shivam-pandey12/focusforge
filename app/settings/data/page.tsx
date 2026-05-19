"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { clearAllStudyData, requestAccountDeletion } from "@/lib/firebase/firestore";
import { canUseFeature } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { useDataExport } from "@/hooks/useDataExport";
import { usePlan } from "@/hooks/usePlan";

function DataControlsContent() {
  const { user } = useAuth();
  const plan = usePlan(user?.uid);
  const canExport = canUseFeature(plan.plan, "dataExport");
  const exportData = useDataExport(canExport ? user?.uid : undefined);
  const [clearConfirm, setClearConfirm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clearData() {
    if (!user?.uid || clearConfirm !== "CLEAR STUDY DATA") {
      setError("Type CLEAR STUDY DATA to confirm.");
      return;
    }

    setBusy(true);
    setSuccess(null);
    setError(null);

    try {
      const deleted = await clearAllStudyData(user.uid);
      setSuccess(`Cleared ${deleted} study records. Billing, payment, and audit records were not touched.`);
      setClearConfirm("");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not clear study data.");
    } finally {
      setBusy(false);
    }
  }

  async function requestDeletion() {
    if (!user?.uid || deleteConfirm !== "REQUEST DELETE ACCOUNT") {
      setError("Type REQUEST DELETE ACCOUNT to confirm.");
      return;
    }

    setBusy(true);
    setSuccess(null);
    setError(null);

    try {
      await requestAccountDeletion(user.uid, user.email, deleteReason);
      setSuccess("Account deletion request saved. Support will review it. Payment records may be retained for legal/accounting reasons.");
      setDeleteConfirm("");
      setDeleteReason("");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not request account deletion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Data controls"
          title="Export, clear, or request account deletion safely."
          subtitle="These controls protect billing and audit records while giving you control over study data."
        />
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
        {error || exportData.error ? <StatusMessage tone="error">{error ?? exportData.error}</StatusMessage> : null}

        {canExport ? (
          <section className="card p-6 sm:p-8">
            <SectionHeader title="Download full data" subtitle="Generate a local JSON backup in your browser. No backend file is created." />
            <button className="btn-primary mt-6" disabled={exportData.loading} type="button" onClick={exportData.exportFullJson}>
              {exportData.loading ? "Preparing export" : "Download full FocusForge JSON"}
            </button>
          </section>
        ) : (
          <FeatureLockedCard
            feature="dataExport"
            title="Full export is a Forge Pro feature"
            description="Your data stays safe. Upgrade when you want complete downloadable backups."
          />
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="card p-6 sm:p-8">
            <SectionHeader title="Clear all study data" subtitle="Deletes productivity records only. Billing and payment records stay safe." />
            <p className="mt-4 text-base leading-7 text-forge-muted">
              This clears tasks, sessions, notes, homework, exams, marks, backlog, battle plans, timetable, revisions, syllabus, habits, mock tests, goals, journal, reviews, reminders, templates, and streaks. It does not delete billing, payment, admin audit, support, feedback, or account-deletion records.
            </p>
            <label className="mt-5 grid gap-2">
              <span className="label">Type CLEAR STUDY DATA</span>
              <input className="input" value={clearConfirm} onChange={(event) => setClearConfirm(event.target.value)} />
            </label>
            <button className="btn-danger mt-5" disabled={busy} type="button" onClick={clearData}>
              Clear study data
            </button>
          </article>

          <article className="card p-6 sm:p-8">
            <SectionHeader title="Request account deletion" subtitle="Creates a review request instead of deleting auth/payment records immediately." />
            <p className="mt-4 text-base leading-7 text-forge-muted">
              Payment records may be retained for legal, accounting, and support reasons. This phase does not perform direct Firebase Auth deletion.
            </p>
            <label className="mt-5 grid gap-2">
              <span className="label">Reason optional</span>
              <textarea className="input min-h-24" value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} />
            </label>
            <label className="mt-5 grid gap-2">
              <span className="label">Type REQUEST DELETE ACCOUNT</span>
              <input className="input" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
            </label>
            <button className="btn-danger mt-5" disabled={busy} type="button" onClick={requestDeletion}>
              Request account deletion
            </button>
          </article>
        </section>
      </main>
    </>
  );
}

export default function DataControlsPage() {
  return (
    <AuthGuard>
      <DataControlsContent />
    </AuthGuard>
  );
}
