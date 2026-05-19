"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePlan } from "@/hooks/usePlan";
import { useStudyTemplates } from "@/hooks/useStudyTemplates";
import type { StudyTemplate, StudyTemplateType } from "@/types";

const TEMPLATE_TYPES: { value: StudyTemplateType; label: string }[] = [
  { value: "focus", label: "Focus session" },
  { value: "dailyRoutine", label: "Daily routine" },
  { value: "weeklyTimetable", label: "Weekly timetable" },
  { value: "revisionCycle", label: "Revision cycle" },
  { value: "examPrep", label: "Exam preparation" }
];

function countItems(template: StudyTemplate): number {
  return (
    (template.config.tasks?.length ?? 0) +
    (template.config.timetableBlocks?.length ?? 0) +
    (template.config.revisions?.length ?? 0) +
    (template.config.habits?.length ?? 0)
  );
}

function TemplatesContent() {
  const { user } = useAuth();
  const plan = usePlan(user?.uid);
  const hasAccess = plan.hasFeature("templates");
  const templates = useStudyTemplates(hasAccess ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [filter, setFilter] = useState<"all" | StudyTemplateType>("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "focus" as StudyTemplateType,
    taskTitle: "",
    subject: "",
    duration: 25
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleTemplates = useMemo(
    () => templates.templates.filter((template) => filter === "all" || template.type === filter),
    [filter, templates.templates]
  );

  if (!plan.ready || plan.loading) {
    return (
      <>
        <Navbar email={user?.email} />
        <main className="page-shell">
          <LoadingState label="Checking plan access" mode="inline" />
        </main>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navbar email={user?.email} />
        <main className="page-shell">
          <FeatureLockedCard
            feature="templates"
            description="Study templates are part of Forge Pro. Existing custom templates stay safe and can be unlocked again by upgrading."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm({ title: "", description: "", type: "focus", taskTitle: "", subject: "", duration: 25 });
    setEditingId(null);
  }

  function editTemplate(template: StudyTemplate) {
    const firstTask = template.config.tasks?.[0];
    setEditingId(template.id);
    setForm({
      title: template.title,
      description: template.description,
      type: template.type,
      taskTitle: firstTask?.title ?? "",
      subject: firstTask?.subject ?? "",
      duration: firstTask?.duration ?? 25
    });
  }

  async function saveCustomTemplate() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        config: {
          tasks: form.taskTitle.trim()
            ? [{ title: form.taskTitle.trim(), subject: form.subject.trim(), duration: Number(form.duration) || 25 }]
            : []
        }
      };

      if (editingId) {
        await templates.saveTemplate(editingId, payload);
        setMessage("Template updated.");
      } else {
        await templates.createTemplate(payload);
        setMessage("Template created.");
      }

      resetForm();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate(template: StudyTemplate) {
    setError(null);
    setMessage(null);

    if (countItems(template) > 3) {
      const confirmed = await confirm({
        eyebrow: "Apply template",
        title: `Apply "${template.title}"?`,
        description: `This will create ${countItems(template)} study records from the template. You can still edit or delete the created items later.`,
        confirmLabel: "Apply template",
        tone: "warning"
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      const created = await templates.applyTemplate(template);
      setMessage(`${template.title} applied. ${created} item${created === 1 ? "" : "s"} created.`);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not apply template.");
    }
  }

  async function deleteTemplate(templateId: string) {
    setError(null);
    setMessage(null);

    try {
      await templates.removeTemplate(templateId);
      setMessage("Template deleted.");
      if (editingId === templateId) {
        resetForm();
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Could not delete template.");
    }
  }

  return (
    <>
      <Navbar email={user?.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Templates"
          title="Start from a proven study shape."
          subtitle="Apply system templates or save your own reusable routines for tasks, timetables, revisions, and habits."
        />

        {templates.error || error ? <StatusMessage tone="error">{error ?? templates.error}</StatusMessage> : null}
        {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="card p-6">
            <SectionHeader title={editingId ? "Edit custom template" : "Create custom template"} subtitle="This quick builder creates a reusable task template." />
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="label">Template title</span>
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Physics practice block" />
              </label>
              <label className="grid gap-2">
                <span className="label">Description</span>
                <textarea className="input min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What this template creates" />
              </label>
              <label className="grid gap-2">
                <span className="label">Type</span>
                <select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as StudyTemplateType })}>
                  {TEMPLATE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
                <label className="grid gap-2">
                  <span className="label">Task title</span>
                  <input className="input" value={form.taskTitle} onChange={(event) => setForm({ ...form, taskTitle: event.target.value })} placeholder="Solve mechanics questions" />
                </label>
                <label className="grid gap-2">
                  <span className="label">Minutes</span>
                  <input className="input" min={5} type="number" value={form.duration} onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })} />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="label">Subject</span>
                <input className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Physics" />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="btn-primary" disabled={saving} type="button" onClick={saveCustomTemplate}>
                  {saving ? "Saving" : editingId ? "Update template" : "Create template"}
                </button>
                {editingId ? <button className="btn-secondary" type="button" onClick={resetForm}>Cancel edit</button> : null}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <SectionHeader
              title="Template gallery"
              subtitle="System templates are always available. Custom templates sync with your account."
              action={
                <select className="input min-w-48" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
                  <option value="all">All templates</option>
                  {TEMPLATE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              }
            />
            {templates.loading ? (
              <LoadingState label="Loading templates" mode="inline" />
            ) : visibleTemplates.length === 0 ? (
              <EmptyState title="No templates yet" description="Create a small reusable task template or switch filters." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleTemplates.map((template) => (
                  <article className="interactive-card" key={template.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="badge">{template.isSystemTemplate ? "System" : "Custom"}</span>
                        <h3 className="mt-4 text-xl font-bold text-forge-text">{template.title}</h3>
                      </div>
                      <span className="badge">{countItems(template)} items</span>
                    </div>
                    <p className="mt-3 min-h-14 text-base leading-7 text-forge-muted">{template.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="btn-primary" type="button" onClick={() => applyTemplate(template)}>Apply</button>
                      {!template.isSystemTemplate ? (
                        <>
                          <button className="btn-secondary" type="button" onClick={() => editTemplate(template)}>Edit</button>
                          <button className="btn-danger" type="button" onClick={() => deleteTemplate(template.id)}>Delete</button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

export default function TemplatesPage() {
  return (
    <AuthGuard>
      <TemplatesContent />
    </AuthGuard>
  );
}
