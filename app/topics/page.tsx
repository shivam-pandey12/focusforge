"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import EmptyState from "@/components/EmptyState";
import LimitReachedNotice from "@/components/LimitReachedNotice";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import StatusMessage from "@/components/StatusMessage";
import { useAuth } from "@/hooks/useAuth";
import { useBacklogItems } from "@/hooks/useBacklogItems";
import { useDeferredDataStart } from "@/hooks/useDeferredDataStart";
import { useMockTests } from "@/hooks/useMockTests";
import { usePlan } from "@/hooks/usePlan";
import { ChapterWithProgress, SubjectWithProgress, useSyllabus } from "@/hooks/useSyllabus";
import type { BacklogItemInput } from "@/lib/firebase/firestore";
import { isAtLimit } from "@/lib/plans";
import type { SyllabusTopic, TopicStudyStatus } from "@/types";

const topicStatuses: TopicStudyStatus[] = ["Not Started", "Learning", "Revised Once", "Weak", "Backlog", "Strong", "Completed"];

function TopicsContent() {
  const { user, loading: authLoading } = useAuth();
  const plan = usePlan(user?.uid);
  const dataReady = useDeferredDataStart();
  const syllabus = useSyllabus(dataReady ? user?.uid : undefined);
  const backlog = useBacklogItems(dataReady ? user?.uid : undefined);
  const canUseMockAnalytics = plan.hasFeature("mockTests") && plan.hasFeature("advancedMockAnalytics");
  const mockTests = useMockTests(dataReady && canUseMockAnalytics ? user?.uid : undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => syllabus.subjectsWithProgress.find((subject) => subject.id === selectedSubjectId) ?? null,
    [selectedSubjectId, syllabus.subjectsWithProgress]
  );
  const selectedChapter = useMemo(
    () => selectedSubject?.chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [selectedChapterId, selectedSubject]
  );
  const subjectLimitReached = isAtLimit(syllabus.subjects.length, plan.limits.subjectsLimit);
  const chapterLimitReached = isAtLimit(selectedSubject?.chapters.length ?? 0, plan.limits.chaptersPerSubjectLimit);
  const topicLimitReached = isAtLimit(selectedChapter?.topics.length ?? 0, plan.limits.topicsPerChapterLimit);
  const mockSignalByTopic = useMemo(() => {
    const signals = new Map<string, string>();

    mockTests.tests.forEach((test) => {
      test.topicAnalyses.forEach((analysis) => {
        if (analysis.topicId && (analysis.performanceLevel === "Weak" || analysis.performanceLevel === "Critical")) {
          signals.set(analysis.topicId, `${analysis.performanceLevel} in ${test.title}`);
        }
      });
    });

    return signals;
  }, [mockTests.tests]);

  useEffect(() => {
    if (!selectedSubjectId && syllabus.subjectsWithProgress.length > 0) {
      setSelectedSubjectId(syllabus.subjectsWithProgress[0].id);
    }
  }, [selectedSubjectId, syllabus.subjectsWithProgress]);

  useEffect(() => {
    if (!selectedSubject) {
      setSelectedChapterId("");
      return;
    }

    if (!selectedSubject.chapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(selectedSubject.chapters[0]?.id ?? "");
    }
  }, [selectedChapterId, selectedSubject]);

  if (authLoading || !user) {
    return <LoadingState label="Loading topics" />;
  }

  async function runAction(action: () => Promise<void>, message: string) {
    setActionError(null);
    setSuccess(null);

    try {
      await action();
      setSuccess(message);
    } catch (currentError) {
      setActionError(currentError instanceof Error ? currentError.message : "Syllabus action failed.");
    }
  }

  async function handleSubjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingSubjectId) {
          await syllabus.saveSubject(editingSubjectId, subjectName);
        } else {
          if (subjectLimitReached) {
            throw new Error("Forge Starter includes 5 subjects. Your existing syllabus data is safe, and Forge Pro unlocks unlimited topic tracking.");
          }

          await syllabus.createSubject(subjectName);
        }
        setSubjectName("");
        setEditingSubjectId(null);
      },
      editingSubjectId ? "Subject updated." : "Subject created."
    );
  }

  async function handleChapterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingChapterId) {
          await syllabus.saveChapter(editingChapterId, chapterName);
        } else {
          if (chapterLimitReached) {
            throw new Error("Forge Starter includes 10 chapters per subject. Your existing chapters are safe, and Forge Pro unlocks unlimited topic tracking.");
          }

          await syllabus.createChapter(selectedSubjectId, chapterName);
        }
        setChapterName("");
        setEditingChapterId(null);
      },
      editingChapterId ? "Chapter updated." : "Chapter created."
    );
  }

  async function handleTopicSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingTopicId) {
          await syllabus.saveTopic(editingTopicId, topicName);
        } else {
          if (topicLimitReached) {
            throw new Error("Forge Starter includes 20 topics per chapter. Your existing topics are safe, and Forge Pro unlocks unlimited topic tracking.");
          }

          await syllabus.createTopic(selectedSubjectId, selectedChapterId, topicName);
        }
        setTopicName("");
        setEditingTopicId(null);
      },
      editingTopicId ? "Topic updated." : "Topic created."
    );
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="page-shell space-y-6">
        <PageHeader
          eyebrow="Topics"
          title="Track the whole syllabus."
          subtitle="Organize subjects into chapters and topics, then turn syllabus progress into something visible."
        />

        {syllabus.error || backlog.error || mockTests.error ? <StatusMessage tone="error">{syllabus.error ?? backlog.error ?? mockTests.error}</StatusMessage> : null}
        {actionError ? <StatusMessage tone="error">{actionError}</StatusMessage> : null}
        {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

        <section className="card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Overall completion</p>
              <h2 className="mt-1 text-3xl font-bold text-forge-text">{syllabus.overallProgress}%</h2>
            </div>
            <div className="w-full sm:max-w-md">
              <ProgressBar value={syllabus.overallProgress} label={`${syllabus.topics.filter((topic) => topic.completed).length}/${syllabus.topics.length} topics complete`} />
            </div>
          </div>
        </section>

        {!dataReady || syllabus.loading || backlog.loading || mockTests.loading ? (
          <LoadingState label="Loading syllabus" mode="inline" />
        ) : syllabus.subjects.length === 0 ? (
          <EmptyState
            title="No syllabus yet"
            description="Create your first subject, then add chapters and topics underneath it."
          />
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[22rem_22rem_1fr]">
          <section className="card p-6">
            <h2 className="text-2xl font-bold text-forge-text">Subjects</h2>
            <form className="mt-4 flex gap-2" onSubmit={handleSubjectSubmit}>
              <input className="input" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Mathematics" />
              <button className="btn-primary shrink-0" type="submit">
                {editingSubjectId ? "Save" : "Add"}
              </button>
            </form>
            {editingSubjectId ? (
              <button className="btn-ghost mt-3" type="button" onClick={() => { setEditingSubjectId(null); setSubjectName(""); }}>
                Cancel edit
              </button>
            ) : null}
            {!editingSubjectId && subjectLimitReached ? (
              <div className="mt-4">
                <LimitReachedNotice
                  currentPlan={plan.plan}
                  limitLabel="Forge Starter includes 5 subjects."
                />
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              {syllabus.subjectsWithProgress.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  onDelete={(item) => runAction(() => syllabus.removeSubject(item.id), "Subject and its chapters deleted.")}
                  onEdit={(item) => { setEditingSubjectId(item.id); setSubjectName(item.name); }}
                  onSelect={(item) => setSelectedSubjectId(item.id)}
                  selected={subject.id === selectedSubjectId}
                  subject={subject}
                />
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-bold text-forge-text">Chapters</h2>
            {selectedSubject ? (
              <>
                <form className="mt-4 flex gap-2" onSubmit={handleChapterSubmit}>
                  <input className="input" value={chapterName} onChange={(event) => setChapterName(event.target.value)} placeholder="Chapter name" />
                  <button className="btn-primary shrink-0" type="submit">
                    {editingChapterId ? "Save" : "Add"}
                  </button>
                </form>
                {editingChapterId ? (
                  <button className="btn-ghost mt-3" type="button" onClick={() => { setEditingChapterId(null); setChapterName(""); }}>
                    Cancel edit
                  </button>
                ) : null}
                {!editingChapterId && chapterLimitReached ? (
                  <div className="mt-4">
                    <LimitReachedNotice
                      currentPlan={plan.plan}
                      limitLabel="Forge Starter includes 10 chapters per subject."
                    />
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  {selectedSubject.chapters.length === 0 ? (
                    <p className="text-base text-forge-muted">No chapters under this subject yet.</p>
                  ) : (
                    selectedSubject.chapters.map((chapter) => (
                      <ChapterCard
                        chapter={chapter}
                        key={chapter.id}
                        onDelete={(item) => runAction(() => syllabus.removeChapter(item.id), "Chapter and its topics deleted.")}
                        onEdit={(item) => { setEditingChapterId(item.id); setChapterName(item.name); }}
                        onSelect={(item) => setSelectedChapterId(item.id)}
                        selected={chapter.id === selectedChapterId}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-base text-forge-muted">Select or create a subject first.</p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-bold text-forge-text">Topics</h2>
            {selectedChapter ? (
              <>
                <form className="mt-4 flex gap-2" onSubmit={handleTopicSubmit}>
                  <input className="input" value={topicName} onChange={(event) => setTopicName(event.target.value)} placeholder="Topic name" />
                  <button className="btn-primary shrink-0" type="submit">
                    {editingTopicId ? "Save" : "Add"}
                  </button>
                </form>
                {editingTopicId ? (
                  <button className="btn-ghost mt-3" type="button" onClick={() => { setEditingTopicId(null); setTopicName(""); }}>
                    Cancel edit
                  </button>
                ) : null}
                {!editingTopicId && topicLimitReached ? (
                  <div className="mt-4">
                    <LimitReachedNotice
                      currentPlan={plan.plan}
                      limitLabel="Forge Starter includes 20 topics per chapter."
                    />
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  <ProgressBar value={selectedChapter.progress} label={`${selectedChapter.completedTopics}/${selectedChapter.totalTopics} topics complete`} />
                  {selectedChapter.topics.length === 0 ? (
                    <p className="pt-3 text-base text-forge-muted">No topics inside this chapter yet.</p>
                  ) : (
                    selectedChapter.topics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        onDelete={(item) => runAction(() => syllabus.removeTopic(item.id), "Topic deleted.")}
                        onEdit={(item) => { setEditingTopicId(item.id); setTopicName(item.name); }}
                        onBacklog={(item) => createOrUpdateBacklog(item)}
                        onStatus={(item, status) => runAction(() => syllabus.setTopicStatus(item.id, status), status === "Backlog" ? "Topic marked backlog. Add/update backlog explicitly if needed." : "Topic status updated.")}
                        onToggle={(item) => runAction(() => syllabus.toggleTopic(item.id, !item.completed), item.completed ? "Topic marked incomplete." : "Topic completed.")}
                        mockSignal={mockSignalByTopic.get(topic.id)}
                        topic={topic}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-base text-forge-muted">Select or create a chapter first.</p>
            )}
          </section>
        </section>
      </main>
    </>
  );

  async function createOrUpdateBacklog(topic: SyllabusTopic) {
    const subject = syllabus.subjects.find((item) => item.id === topic.subjectId);
    const chapter = syllabus.chapters.find((item) => item.id === topic.chapterId);
    const existing = backlog.items.find((item) => item.topicId === topic.id && item.status !== "Cleared");

    await runAction(async () => {
      if (!existing && isAtLimit(backlog.items.length, plan.limits.backlogItemsLimit)) {
        throw new Error("Forge Starter includes 20 backlog items. Open Backlog to clear or edit existing recovery items first.");
      }

      const input: BacklogItemInput = {
        title: topic.name,
        subjectId: topic.subjectId,
        subject: subject?.name ?? "Subject",
        subjectColor: subject?.color,
        subjectIcon: subject?.icon,
        chapterId: topic.chapterId,
        chapterName: chapter?.name ?? "",
        topicId: topic.id,
        topicName: topic.name,
        backlogLevel: existing?.backlogLevel ?? "Medium",
        reason: existing?.reason ?? "Weak Concept",
        targetFinishDate: existing?.targetFinishDate ?? "",
        estimatedMinutes: existing?.estimatedMinutes ?? null,
        status: existing?.status ?? "Not Started",
        priority: existing?.priority ?? "Medium",
        notes: existing?.notes ?? "Created from topic status."
      };

      if (existing) {
        await backlog.saveItem(existing.id, input);
      } else {
        await backlog.createItem(input);
      }
    }, existing ? "Backlog item updated for this topic." : "Backlog item created for this topic.");
  }
}

function SubjectCard({
  subject,
  selected,
  onSelect,
  onEdit,
  onDelete
}: {
  subject: SubjectWithProgress;
  selected: boolean;
  onSelect: (subject: SubjectWithProgress) => void;
  onEdit: (subject: SubjectWithProgress) => void;
  onDelete: (subject: SubjectWithProgress) => void;
}) {
  return (
    <article className={selected ? "rounded-3xl border border-forge-gold bg-[#FFF8EA] p-5 shadow-soft" : "rounded-3xl border border-forge-line bg-white p-5"}>
      <button className="w-full text-left" type="button" onClick={() => onSelect(subject)}>
        <h3 className="font-bold text-forge-text">{subject.name}</h3>
        <div className="mt-3">
          <ProgressBar value={subject.progress} label={`${subject.completedTopics}/${subject.totalTopics} topics`} />
        </div>
      </button>
      <div className="mt-3 flex gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(subject)}>
          Edit
        </button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(subject)}>
          Delete
        </button>
      </div>
    </article>
  );
}

function ChapterCard({
  chapter,
  selected,
  onSelect,
  onEdit,
  onDelete
}: {
  chapter: ChapterWithProgress;
  selected: boolean;
  onSelect: (chapter: ChapterWithProgress) => void;
  onEdit: (chapter: ChapterWithProgress) => void;
  onDelete: (chapter: ChapterWithProgress) => void;
}) {
  return (
    <article className={selected ? "rounded-3xl border border-forge-gold bg-[#FFF8EA] p-5 shadow-soft" : "rounded-3xl border border-forge-line bg-white p-5"}>
      <button className="w-full text-left" type="button" onClick={() => onSelect(chapter)}>
        <h3 className="font-bold text-forge-text">{chapter.name}</h3>
        <div className="mt-3">
          <ProgressBar value={chapter.progress} label={`${chapter.completedTopics}/${chapter.totalTopics} topics`} />
        </div>
      </button>
      <div className="mt-3 flex gap-2">
        <button className="btn-ghost" type="button" onClick={() => onEdit(chapter)}>
          Edit
        </button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(chapter)}>
          Delete
        </button>
      </div>
    </article>
  );
}

function TopicRow({
  topic,
  onToggle,
  onStatus,
  onBacklog,
  mockSignal,
  onEdit,
  onDelete
}: {
  topic: SyllabusTopic;
  onToggle: (topic: SyllabusTopic) => void;
  onStatus: (topic: SyllabusTopic, status: TopicStudyStatus) => void;
  onBacklog: (topic: SyllabusTopic) => void;
  mockSignal?: string;
  onEdit: (topic: SyllabusTopic) => void;
  onDelete: (topic: SyllabusTopic) => void;
}) {
  const status = topic.status ?? (topic.completed ? "Completed" : "Not Started");

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-forge-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-3">
        <input checked={topic.completed} onChange={() => onToggle(topic)} type="checkbox" />
        <span className={topic.completed ? "font-semibold text-forge-muted line-through" : "font-semibold text-forge-text"}>
          {topic.name}
        </span>
      </label>
      {mockSignal ? (
        <p className="text-sm font-semibold text-forge-muted">{mockSignal}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40">
          <span className="sr-only">Topic status</span>
          <select className="input h-11" value={status} onChange={(event) => onStatus(topic, event.target.value as TopicStudyStatus)}>
            {topicStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {status === "Backlog" ? (
          <button className="btn-secondary" type="button" onClick={() => onBacklog(topic)}>
            Add/update backlog
          </button>
        ) : null}
        <button className="btn-ghost" type="button" onClick={() => onEdit(topic)}>
          Edit
        </button>
        <button className="btn-ghost" type="button" onClick={() => onDelete(topic)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function TopicsPage() {
  return (
    <AuthGuard>
      <TopicsContent />
    </AuthGuard>
  );
}
