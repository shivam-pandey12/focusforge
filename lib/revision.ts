import { getDateKey } from "@/lib/date";
import type { AssignmentPriority, RevisionPlan, RevisionStatus, RevisionType } from "@/types";

export const REVISION_TYPES: RevisionType[] = [
  "Theory",
  "Formula",
  "Question Practice",
  "Mistake Review",
  "Full Chapter"
];

export const REVISION_PRIORITIES: AssignmentPriority[] = ["Low", "Medium", "High"];
export const REVISION_STATUSES: RevisionStatus[] = ["Pending", "Done", "Skipped"];

export function getRevisionDueDate(plan: Pick<RevisionPlan, "dueDate" | "revisionDate" | "nextRevisionDate">): string {
  return plan.dueDate?.trim() || plan.revisionDate?.trim() || plan.nextRevisionDate?.trim() || "";
}

export function getRevisionStatus(plan: Pick<RevisionPlan, "status" | "completed">): RevisionStatus {
  if (plan.status && REVISION_STATUSES.includes(plan.status)) {
    return plan.status;
  }

  return plan.completed ? "Done" : "Pending";
}

export function getRevisionPriority(plan: Pick<RevisionPlan, "priority">): AssignmentPriority {
  return plan.priority && REVISION_PRIORITIES.includes(plan.priority) ? plan.priority : "Medium";
}

export function getRevisionType(plan: Pick<RevisionPlan, "revisionType">): RevisionType {
  return plan.revisionType && REVISION_TYPES.includes(plan.revisionType) ? plan.revisionType : "Theory";
}

export function isRevisionActive(plan: RevisionPlan): boolean {
  return getRevisionStatus(plan) === "Pending";
}

export function getRevisionCompletedDate(plan: RevisionPlan): string | null {
  if (plan.completedAt && typeof plan.completedAt.toDate === "function") {
    return getDateKey(plan.completedAt.toDate());
  }

  return plan.lastRevisedDate?.trim() || null;
}

export function getRevisionSubjectLabel(plan: RevisionPlan): string {
  return plan.subject?.trim() || "No subject";
}

export function getRevisionTopicLabel(plan: RevisionPlan): string {
  return [plan.chapterName, plan.topicName].filter(Boolean).join(" / ");
}
