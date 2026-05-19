"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import FeatureLockedCard from "@/components/FeatureLockedCard";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { useSyllabus } from "@/hooks/useSyllabus";
import { formatShortDate, getTodayDateKey } from "@/lib/date";
import {
  MOCK_EXAM_TYPES,
  MOCK_MISTAKE_TAGS,
  MOCK_PERFORMANCE_LEVELS,
  getMockWeakAreas
} from "@/lib/mockAnalytics";
import type {
  MockMistakeTag,
  MockPerformanceLevel,
  MockSubjectBreakdown,
  MockTestResult,
  MockTimeAnalysis,
  MockTopicAnalysis,
  SyllabusSubject
} from "@/types";

type SubjectBreakdownForm = Omit<MockSubjectBreakdown, "percentage" | "accuracy">;
type TopicAnalysisForm = MockTopicAnalysis;
type MockFormState = {
  title: string;
  examType: string;
  subjectId: string;
  subject: string;
  subjectColor: string;
  subjectIcon: string;
  score: number;
  totalMarks: number;
  percentile: string;
  rank: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeTakenMinutes: number;
  testDate: string;
  subjectBreakdowns: SubjectBreakdownForm[];
  topicAnalyses: TopicAnalysisForm[];
  mistakeTags: MockMistakeTag[];
  timeAnalysis: MockTimeAnalysis;
  notes: string;
};

const defaultForm: MockFormState = {
  title: "",
  examType: "JEE Main",
  subjectId: "",
  subject: "",
  subjectColor: "",
  subjectIcon: "",
  score: 0,
  totalMarks: 300,
  percentile: "",
  rank: "",
  totalQuestions: 90,
  correctAnswers: 0,
  wrongAnswers: 0,
  timeTakenMinutes: 180,
  testDate: getTodayDateKey(),
  subjectBreakdowns: [],
  topicAnalyses: [],
  mistakeTags: [],
  timeAnalysis: {
    totalTimeSpentMinutes: null,
    timePressure: false,
    slowSubject: "",
    rushedSubject: "",
    notes: ""
  },
  notes: ""
};

function pickSubject(subjects: SyllabusSubject[], subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId) ?? null;
}

function rowMetric(row: Pick<SubjectBreakdownForm, "score" | "totalMarks" | "attempted" | "correct">) {
  const percentage = row.totalMarks > 0 ? Math.round((row.score / row.totalMarks) * 1000) / 10 : 0;
  const accuracy = row.attempted > 0 ? Math.round((row.correct / row.attempted) * 1000) / 10 : 0;

  return { percentage, accuracy };
}

function toForm(test: MockTestResult): MockFormState {
  return {
    title: test.title,
    examType: test.examType ?? "Custom",
    subjectId: test.subjectId ?? "",
    subject: test.subject ?? "",
    subjectColor: test.subjectColor ?? "",
    subjectIcon: test.subjectIcon ?? "",
    score: test.score,
    totalMarks: test.totalMarks,
    percentile: test.percentile ? String(test.percentile) : "",
    rank: test.rank ? String(test.rank) : "",
    totalQuestions: test.totalQuestions,
    correctAnswers: test.correctAnswers,
    wrongAnswers: test.wrongAnswers,
    timeTakenMinutes: test.timeTakenMinutes,
    testDate: test.testDate,
    subjectBreakdowns: test.subjectBreakdowns.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      subject: row.subject,
      subjectColor: row.subjectColor,
      subjectIcon: row.subjectIcon,
      score: row.score,
      totalMarks: row.totalMarks,
      attempted: row.attempted,
      correct: row.correct,
      incorrect: row.incorrect,
      skipped: row.skipped,
      timeSpentMinutes: row.timeSpentMinutes,
      notes: row.notes
    })),
    topicAnalyses: test.topicAnalyses,
    mistakeTags: test.mistakeTags,
    timeAnalysis: test.timeAnalysis ?? defaultForm.timeAnalysis,
    notes: test.notes ?? ""
  };
}

function formInput(form: MockFormState) {
  return {
    ...form,
    percentile: form.percentile || null,
    rank: form.rank || null,
    subjectBreakdowns: form.subjectBreakdowns,
    topicAnalyses: form.topicAnalyses,
    timeAnalysis: form.timeAnalysis
  };
}

function toggleTag(tags: MockMistakeTag[], tag: MockMistakeTag): MockMistakeTag[] {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}

function MockTestsContent() {
  const { user, loading: authLoading } = useAuth();
  const dataReady = useDeferredDataStart();
  const plan = usePlan(dataReady ? user?.uid : undefined);
  const hasAccess = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const syllabus = useSyllabus(dataReady && hasAccess ? user?.uid : undefined);
  const mockTests = useMockTests(dataReady && hasAccess ? user?.uid : undefined);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState<MockFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const attempted = form.correctAnswers + form.wrongAnswers;
  const skipped = Math.max(0, form.totalQuestions - attempted);
  const percentage = form.totalMarks > 0 ? Math.round((form.score / form.totalMarks) * 1000) / 10 : 0;
  const accuracy = attempted > 0 ? Math.round((form.correctAnswers / attempted) * 1000) / 10 : 0;
  const recentChart = useMemo(() => mockTests.tests.slice(0, 6).reverse(), [mockTests.tests]);

  if (authLoading || !user) {
    return <LoadingState label="Loading mock tests" />;
  }

  if (!plan.ready || plan.loading) {
    return (
      <>
        <Navbar email={user.email} />
        <main className="page-shell">
          <LoadingState label="Checking plan access" mode="inline" />
        </main>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navbar email={user.email} />
        <main className="page-shell">
          <FeatureLockedCard
            feature="advancedMockAnalytics"
            description="Advanced mock test analytics are available on Forge Pro and Forge Elite. Your existing attempts stay safe behind the same account."
          />
        </main>
      </>
    );
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function selectMainSubject(subjectId: string) {
    const subject = pickSubject(syllabus.subjects, subjectId);

    setForm({
      ...form,
      subjectId,
      subject: subject?.name ?? "",
      subjectColor: subject?.color ?? "",
      subjectIcon: subject?.icon ?? ""
    });
  }

  function editTest(test: MockTestResult) {
    setEditingId(test.id);
    setForm(toForm(test));
    setActionError(null);
    setSuccess(null);
  }

  function duplicateTest(test: MockTestResult) {
    setEditingId(null);
    setForm({
      ...toForm(test),
      title: `${test.title} copy`,
      testDate: getTodayDateKey()
    });
    setActionError(null);
    setSuccess("Template duplicated. Review the date and save when ready.");
  }

  function addSubjectRow() {
    const firstSubject = syllabus.subjects[0];

    setForm({
      ...form,
      subjectBreakdowns: [
        ...form.subjectBreakdowns,
        {
          id: `subject-${Date.now()}`,
          subjectId: firstSubject?.id ?? "",
          subject: firstSubject?.name ?? "",
          subjectColor: firstSubject?.color ?? "",
          subjectIcon: firstSubject?.icon ?? "",
          score: 0,
          totalMarks: 100,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          timeSpentMinutes: null,
          notes: ""
        }
      ]
    });
  }

  function updateSubjectRow(index: number, nextRow: SubjectBreakdownForm) {
    setForm({
      ...form,
      subjectBreakdowns: form.subjectBreakdowns.map((row, rowIndex) => rowIndex === index ? nextRow : row)
    });
  }

  function addTopicRow() {
    const firstSubject = syllabus.subjects[0];

    setForm({
      ...form,
      topicAnalyses: [
        ...form.topicAnalyses,
        {
          id: `topic-${Date.now()}`,
          subjectId: firstSubject?.id ?? "",
          subject: firstSubject?.name ?? "",
          subjectColor: firstSubject?.color ?? "",
          subjectIcon: firstSubject?.icon ?? "",
          chapterId: "",
          chapterName: "",
          topicId: "",
          topicName: "",
          performanceLevel: "Weak",
          attempted: null,
          correct: null,
          incorrect: null,
          skipped: null,
          mistakeTags: [],
          notes: ""
        }
      ]
    });
  }

  function updateTopicRow(index: number, nextRow: TopicAnalysisForm) {
    setForm({
      ...form,
      topicAnalyses: form.topicAnalyses.map((row, rowIndex) => rowIndex === index ? nextRow : row)
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await mockTests.saveTest(editingId, formInput(form));
        setSuccess("Mock test updated.");
      } else {
        await mockTests.createTest(formInput(form));
        setSuccess("Mock test saved.");
      }

      resetForm();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save mock test.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(test: MockTestResult) {
    const confirmed = await confirm({
      eyebrow: "Delete mock",
      title: `Delete "${test.title}"?`,
      description: "This removes the mock analytics record only. Marks entries, backlog, revision, and battle-plan data stay separate.",
      confirmLabel: "Delete mock",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await mockTests.removeTest(test.id);
      if (editingId === test.id) {
        resetForm();
      }
      setSuccess("Mock test deleted.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete mock test.");
    }
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Mock tests"
          title="Serious mock analytics for exam repair."
          subtitle="Keep detailed mock results separate from basic marks, then turn weak subjects, mistakes, and time pressure into explicit repair actions."
          action={<Link className="btn-secondary" href="/docs#mock-analytics">Mock analytics guide</Link>}
        />

        {mockTests.error || syllabus.error ? <StatusMessage tone="error">{mockTests.error ?? syllabus.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="grid gap-5 md:grid-cols-5">
          <MetricCard label="Mocks" value={mockTests.summary.totalMocks} detail="Deep attempts recorded." />
          <MetricCard label="Average" value={`${mockTests.summary.averageScore}%`} detail="Across mock tests." tone="gold" />
          <MetricCard label="Trend" value={mockTests.summary.scoreTrend} detail="Latest vs previous." />
          <MetricCard label="Weakest subject" value={mockTests.summary.weakestSubject?.subject ?? "None"} detail={mockTests.summary.weakestSubject?.reason ?? "Needs mock data."} />
          <MetricCard label="Top mistake" value={mockTests.summary.biggestMistakeType ?? "None"} detail={`${mockTests.summary.timePressureFrequency} time-pressure mocks`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[28rem_1fr]">
          <form className="card space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
            <SectionHeader eyebrow={editingId ? "Edit result" : "New result"} title="Basic result" />
            <label className="grid gap-2">
              <span className="label">Test name</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Full syllabus mock 1" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Exam type</span>
                <select className="input" value={form.examType} onChange={(event) => setForm({ ...form, examType: event.target.value })}>
                  {MOCK_EXAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="label">Main subject optional</span>
                <select className="input" value={form.subjectId} onChange={(event) => selectMainSubject(event.target.value)}>
                  <option value="">Full mock / no subject</option>
                  {syllabus.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Score" value={form.score} onChange={(value) => setForm({ ...form, score: value })} />
              <NumberField label="Total marks" value={form.totalMarks} onChange={(value) => setForm({ ...form, totalMarks: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Percentile optional</span>
                <input className="input" min={0} max={100} type="number" value={form.percentile} onChange={(event) => setForm({ ...form, percentile: event.target.value })} />
              </label>
              <label className="grid gap-2">
                <span className="label">Rank optional</span>
                <input className="input" min={1} type="number" value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="Questions" value={form.totalQuestions} onChange={(value) => setForm({ ...form, totalQuestions: value })} />
              <NumberField label="Correct" value={form.correctAnswers} onChange={(value) => setForm({ ...form, correctAnswers: value })} />
              <NumberField label="Incorrect" value={form.wrongAnswers} onChange={(value) => setForm({ ...form, wrongAnswers: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Duration minutes" value={form.timeTakenMinutes} onChange={(value) => setForm({ ...form, timeTakenMinutes: value })} />
              <label className="grid gap-2">
                <span className="label">Test date</span>
                <input className="input" type="date" value={form.testDate} onChange={(event) => setForm({ ...form, testDate: event.target.value })} />
              </label>
            </div>
            <div className="rounded-3xl border border-forge-line bg-forge-surfaceAlt/70 p-4 text-sm font-semibold text-forge-muted">
              {percentage}% score / {accuracy}% accuracy / {attempted} attempted / {skipped} skipped
            </div>

            <SectionHeader eyebrow="Subject breakdown" title="Subject rows" action={<button className="btn-secondary" type="button" onClick={addSubjectRow}>Add subject</button>} />
            <div className="grid gap-4">
              {form.subjectBreakdowns.length === 0 ? <p className="text-sm font-semibold text-forge-muted">Optional, but useful for weakest-subject analytics.</p> : null}
              {form.subjectBreakdowns.map((row, index) => (
                <SubjectBreakdownEditor
                  key={row.id}
                  row={row}
                  subjects={syllabus.subjects}
                  onChange={(nextRow) => updateSubjectRow(index, nextRow)}
                  onRemove={() => setForm({ ...form, subjectBreakdowns: form.subjectBreakdowns.filter((_, rowIndex) => rowIndex !== index) })}
                />
              ))}
            </div>

            <SectionHeader eyebrow="Chapter/topic weakness" title="Weakness rows" action={<button className="btn-secondary" type="button" onClick={addTopicRow}>Add weakness</button>} />
            <div className="grid gap-4">
              {form.topicAnalyses.length === 0 ? <p className="text-sm font-semibold text-forge-muted">Add Weak or Critical chapters/topics to power repair suggestions.</p> : null}
              {form.topicAnalyses.map((row, index) => (
                <TopicAnalysisEditor
                  chapters={syllabus.chapters}
                  key={row.id}
                  row={row}
                  subjects={syllabus.subjects}
                  topics={syllabus.topics}
                  onChange={(nextRow) => updateTopicRow(index, nextRow)}
                  onRemove={() => setForm({ ...form, topicAnalyses: form.topicAnalyses.filter((_, rowIndex) => rowIndex !== index) })}
                />
              ))}
            </div>

            <SectionHeader eyebrow="Time & mistakes" title="Review signals" />
            <div className="grid gap-2 sm:grid-cols-2">
              {MOCK_MISTAKE_TAGS.map((tag) => (
                <label className="flex items-center gap-2 rounded-2xl border border-forge-line bg-white px-3 py-2 text-sm font-semibold text-forge-muted" key={tag}>
                  <input checked={form.mistakeTags.includes(tag)} type="checkbox" onChange={() => setForm({ ...form, mistakeTags: toggleTag(form.mistakeTags, tag) })} />
                  {tag}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-forge-line bg-white px-3 py-2 text-sm font-semibold text-forge-muted">
              <input checked={form.timeAnalysis.timePressure} type="checkbox" onChange={(event) => setForm({ ...form, timeAnalysis: { ...form.timeAnalysis, timePressure: event.target.checked } })} />
              Time pressure affected this mock
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="label">Slow subject optional</span>
                <input className="input" value={form.timeAnalysis.slowSubject ?? ""} onChange={(event) => setForm({ ...form, timeAnalysis: { ...form.timeAnalysis, slowSubject: event.target.value } })} />
              </label>
              <label className="grid gap-2">
                <span className="label">Rushed subject optional</span>
                <input className="input" value={form.timeAnalysis.rushedSubject ?? ""} onChange={(event) => setForm({ ...form, timeAnalysis: { ...form.timeAnalysis, rushedSubject: event.target.value } })} />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="label">Reflection notes</span>
              <textarea className="input min-h-28 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="What went wrong? What should be repaired before the next mock?" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Saving" : editingId ? "Save mock" : "Add mock"}
              </button>
              {editingId ? <button className="btn-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>

          <section className="space-y-5">
            <div className="card p-6">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <input className="input" value={mockTests.searchQuery} onChange={(event) => mockTests.setSearchQuery(event.target.value)} placeholder="Search tests, mistakes, topics" />
                <select className="input" value={mockTests.subjectFilter} onChange={(event) => mockTests.setSubjectFilter(event.target.value)}>
                  <option value="">All subjects</option>
                  {mockTests.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
                <select className="input" value={mockTests.examTypeFilter} onChange={(event) => mockTests.setExamTypeFilter(event.target.value)}>
                  <option value="">All exams</option>
                  {mockTests.examTypes.map((examType) => <option key={examType} value={examType}>{examType}</option>)}
                </select>
                <select className="input" value={mockTests.dateRangeFilter} onChange={(event) => mockTests.setDateRangeFilter(event.target.value as typeof mockTests.dateRangeFilter)}>
                  <option value="all">All dates</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                </select>
                <select className="input" value={mockTests.weaknessFilter} onChange={(event) => mockTests.setWeaknessFilter(event.target.value as typeof mockTests.weaknessFilter)}>
                  <option value="all">All results</option>
                  <option value="weak">Weakness only</option>
                </select>
                <select className="input" value={mockTests.sortMode} onChange={(event) => mockTests.setSortMode(event.target.value as typeof mockTests.sortMode)}>
                  <option value="newest">Newest</option>
                  <option value="lowest">Lowest score</option>
                  <option value="highest">Highest score</option>
                </select>
              </div>
            </div>

            {mockTests.loading || syllabus.loading || !dataReady ? (
              <LoadingState label="Loading mock analytics" mode="inline" />
            ) : mockTests.tests.length === 0 ? (
              <EmptyState title="No mock tests yet" description="Add your first detailed mock result to unlock report-level repair suggestions." />
            ) : (
              <>
                <article className="card p-6 sm:p-8">
                  <SectionHeader eyebrow="Trend" title={mockTests.summary.scoreTrend === "Not enough data" ? "Trend needs another mock" : `${mockTests.summary.scoreTrend} score trend`} />
                  <div className="mt-6 grid grid-cols-6 gap-3">
                    {recentChart.map((test) => (
                      <div className="flex min-h-40 flex-col justify-end gap-2" key={test.id}>
                        <div className="rounded-t-2xl bg-forge-gold" style={{ height: `${Math.max(12, test.percentage * 1.3)}px` }} title={`${test.title}: ${test.percentage}%`} />
                        <p className="truncate text-center text-xs font-bold text-forge-muted">{formatShortDate(test.testDate)}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <div className="space-y-3">
                  {mockTests.filteredTests.map((test) => (
                    <MockTestCard
                      key={test.id}
                      test={test}
                      onDelete={() => handleDelete(test)}
                      onDuplicate={() => duplicateTest(test)}
                      onEdit={() => editTest(test)}
                    />
                  ))}
                  {mockTests.filteredTests.length === 0 ? <EmptyState title="No mocks match" description="Reset filters or add another detailed mock result." /> : null}
                  {!mockTests.searchQuery && !mockTests.subjectFilter && !mockTests.examTypeFilter && mockTests.hasMore ? (
                    <button className="btn-secondary w-full" type="button" onClick={mockTests.loadMore}>
                      Load more mock tests
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </section>
      </main>
      {confirmDialog}
    </>
  );
}

function SubjectBreakdownEditor({
  row,
  subjects,
  onChange,
  onRemove
}: {
  row: SubjectBreakdownForm;
  subjects: SyllabusSubject[];
  onChange: (row: SubjectBreakdownForm) => void;
  onRemove: () => void;
}) {
  const metrics = rowMetric(row);

  function selectSubject(subjectId: string) {
    const subject = pickSubject(subjects, subjectId);
    onChange({
      ...row,
      subjectId,
      subject: subject?.name ?? "",
      subjectColor: subject?.color ?? "",
      subjectIcon: subject?.icon ?? ""
    });
  }

  return (
    <article className="rounded-3xl border border-forge-line bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="label">Subject</span>
          <select className="input" value={row.subjectId ?? ""} onChange={(event) => selectSubject(event.target.value)}>
            <option value="">Manual subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label">Subject snapshot</span>
          <input className="input" value={row.subject} onChange={(event) => onChange({ ...row, subject: event.target.value })} required />
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <NumberField label="Score" value={row.score} onChange={(value) => onChange({ ...row, score: value })} />
        <NumberField label="Total" value={row.totalMarks} onChange={(value) => onChange({ ...row, totalMarks: value })} />
        <NumberField label="Attempted" value={row.attempted} onChange={(value) => onChange({ ...row, attempted: value })} />
        <NumberField label="Correct" value={row.correct} onChange={(value) => onChange({ ...row, correct: value })} />
        <NumberField label="Incorrect" value={row.incorrect} onChange={(value) => onChange({ ...row, incorrect: value })} />
        <NumberField label="Skipped" value={row.skipped} onChange={(value) => onChange({ ...row, skipped: value })} />
        <NumberField label="Minutes" value={row.timeSpentMinutes ?? 0} onChange={(value) => onChange({ ...row, timeSpentMinutes: value })} />
      </div>
      <p className="mt-3 text-sm font-semibold text-forge-muted">{metrics.percentage}% score / {metrics.accuracy}% accuracy</p>
      <button className="btn-ghost mt-3" type="button" onClick={onRemove}>Remove subject row</button>
    </article>
  );
}

function TopicAnalysisEditor({
  row,
  subjects,
  chapters,
  topics,
  onChange,
  onRemove
}: {
  row: TopicAnalysisForm;
  subjects: SyllabusSubject[];
  chapters: { id: string; subjectId: string; name: string }[];
  topics: { id: string; chapterId: string; name: string }[];
  onChange: (row: TopicAnalysisForm) => void;
  onRemove: () => void;
}) {
  const subjectChapters = chapters.filter((chapter) => chapter.subjectId === row.subjectId);
  const chapterTopics = topics.filter((topic) => topic.chapterId === row.chapterId);

  function selectSubject(subjectId: string) {
    const subject = pickSubject(subjects, subjectId);
    onChange({
      ...row,
      subjectId,
      subject: subject?.name ?? "",
      subjectColor: subject?.color ?? "",
      subjectIcon: subject?.icon ?? "",
      chapterId: "",
      chapterName: "",
      topicId: "",
      topicName: ""
    });
  }

  function selectChapter(chapterId: string) {
    const chapter = chapters.find((item) => item.id === chapterId);
    onChange({ ...row, chapterId, chapterName: chapter?.name ?? "", topicId: "", topicName: "" });
  }

  function selectTopic(topicId: string) {
    const topic = topics.find((item) => item.id === topicId);
    onChange({ ...row, topicId, topicName: topic?.name ?? "" });
  }

  return (
    <article className="rounded-3xl border border-forge-line bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="label">Subject</span>
          <select className="input" value={row.subjectId ?? ""} onChange={(event) => selectSubject(event.target.value)}>
            <option value="">Manual subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label">Performance</span>
          <select className="input" value={row.performanceLevel} onChange={(event) => onChange({ ...row, performanceLevel: event.target.value as MockPerformanceLevel })}>
            {MOCK_PERFORMANCE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="label">Chapter optional</span>
          <select className="input" value={row.chapterId ?? ""} onChange={(event) => selectChapter(event.target.value)}>
            <option value="">No chapter</option>
            {subjectChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label">Topic optional</span>
          <select className="input" value={row.topicId ?? ""} onChange={(event) => selectTopic(event.target.value)}>
            <option value="">No topic</option>
            {chapterTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 grid gap-2">
        <span className="label">Subject snapshot</span>
        <input className="input" value={row.subject} onChange={(event) => onChange({ ...row, subject: event.target.value })} required />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {MOCK_MISTAKE_TAGS.map((tag) => (
          <label className="flex items-center gap-2 rounded-2xl border border-forge-line bg-forge-surfaceAlt/50 px-3 py-2 text-sm font-semibold text-forge-muted" key={tag}>
            <input checked={row.mistakeTags.includes(tag)} type="checkbox" onChange={() => onChange({ ...row, mistakeTags: toggleTag(row.mistakeTags, tag) })} />
            {tag}
          </label>
        ))}
      </div>
      <label className="mt-3 grid gap-2">
        <span className="label">Why this is weak</span>
        <textarea className="input min-h-20" value={row.notes ?? ""} onChange={(event) => onChange({ ...row, notes: event.target.value })} />
      </label>
      <button className="btn-ghost mt-3" type="button" onClick={onRemove}>Remove weakness row</button>
    </article>
  );
}

function MockTestCard({
  test,
  onEdit,
  onDuplicate,
  onDelete
}: {
  test: MockTestResult;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const weakAreas = getMockWeakAreas(test);

  return (
    <article className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-forge-text">{test.title}</h3>
          <p className="mt-2 text-base text-forge-muted">
            {formatShortDate(test.testDate)} / {test.subject || "Full mock"} / {test.examType || "Practice"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="badge badge-open">{test.percentage}%</span>
          {weakAreas.length > 0 ? <span className="badge badge-warning">{weakAreas.length} weak signal{weakAreas.length === 1 ? "" : "s"}</span> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MiniMetric label="Accuracy" value={`${test.accuracy}%`} />
        <MiniMetric label="Attempted" value={test.attemptedQuestions} />
        <MiniMetric label="Skipped" value={test.skippedQuestions} />
        <MiniMetric label="Minutes" value={test.timeTakenMinutes} />
      </div>
      {test.notes ? <p className="mt-4 text-base leading-7 text-forge-muted">{test.notes}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="btn-primary" href={`/mock-tests/${encodeURIComponent(test.id)}`}>Open report</Link>
        <button className="btn-ghost" type="button" onClick={onEdit}>Edit</button>
        <button className="btn-ghost" type="button" onClick={onDuplicate}>Duplicate</button>
        <button className="btn-ghost" type="button" onClick={onDelete}>Delete</button>
      </div>
    </article>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2">
      <span className="label">{label}</span>
      <input className="input" min="0" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-forge-line bg-white p-4">
      <p className="text-sm font-bold text-forge-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-forge-text">{value}</p>
    </div>
  );
}

export default function MockTestsPage() {
  return (
    <AuthGuard>
      <MockTestsContent />
    </AuthGuard>
  );
}
