// ============================================================================
// Gradebook command-center model
// ----------------------------------------------------------------------------
// Pure, testable helpers that turn a CourseProject's assignment groups + graded
// items into the data the Gradebook Setup tab renders: a per-group breakdown
// (items, points, share of grade), a weight/health summary, gradebook-specific
// issues, and safe mutations (add / delete-with-reassign / edit / rebalance).
// "Graded" matches the readiness definition exactly — every assignment plus any
// discussion or quiz worth more than zero points — so the two views never disagree.
// ============================================================================

import type { AssignmentGroup, CourseProject, EditorTab } from "../types";
import { nowIso } from "../utils/text";

export type GradedItemType = "assignment" | "discussion" | "quiz";

export interface GradedItemRef {
  id: string;
  title: string;
  type: GradedItemType;
  points: number;
}

// Internal: graded items still carrying their group id, for grouping math. "Graded" = every
// assignment plus any discussion or quiz worth more than zero points (matches readiness).
const gradedItemsWithGroup = (course: CourseProject): Array<GradedItemRef & { groupId: string }> => [
  ...course.assignments.map((assignment) => ({ id: assignment.id, title: assignment.title, type: "assignment" as const, points: Number(assignment.points || 0), groupId: assignment.assignmentGroupId })),
  ...course.discussions.filter((discussion) => discussion.points > 0).map((discussion) => ({ id: discussion.id, title: discussion.title, type: "discussion" as const, points: Number(discussion.points || 0), groupId: discussion.assignmentGroupId })),
  ...course.quizzes.filter((quiz) => quiz.points > 0).map((quiz) => ({ id: quiz.id, title: quiz.title, type: "quiz" as const, points: Number(quiz.points || 0), groupId: quiz.assignmentGroupId }))
];

// Every point-bearing item Canvas would put in the gradebook.
export const gradedItems = (course: CourseProject): GradedItemRef[] => gradedItemsWithGroup(course).map(({ groupId: _groupId, ...rest }) => rest);

export interface GroupBreakdown {
  group: AssignmentGroup;
  items: GradedItemRef[];
  itemCount: number;
  pointsTotal: number;
  active: boolean;
}

export const gradebookGroupBreakdown = (course: CourseProject): GroupBreakdown[] => {
  const items = gradedItemsWithGroup(course);
  return course.assignmentGroups.map((group) => {
    const groupItems = items.filter((item) => item.groupId === group.id).map(({ groupId: _groupId, ...rest }) => rest);
    return {
      group,
      items: groupItems,
      itemCount: groupItems.length,
      pointsTotal: groupItems.reduce((sum, item) => sum + item.points, 0),
      active: groupItems.length > 0
    };
  });
};

// Graded items whose assignmentGroupId points at a group that no longer exists — Canvas would
// drop these from weighted grading, so they are surfaced prominently.
export const ungroupedGradedItems = (course: CourseProject): GradedItemRef[] => {
  const groupIds = new Set(course.assignmentGroups.map((group) => group.id));
  return gradedItemsWithGroup(course)
    .filter((item) => !groupIds.has(item.groupId))
    .map(({ groupId: _groupId, ...rest }) => rest);
};

// ---------------------------------------------------------------------------
// Summary + issues
// ---------------------------------------------------------------------------

export interface GradebookSummary {
  status: "Balanced" | "Needs review" | "Blocked";
  weightTotal: number;
  weightOk: boolean;
  groupCount: number;
  activeGroupCount: number;
  gradedItemCount: number;
  pointsTotal: number;
  dropLowestGroups: number;
  ungroupedItems: number;
}

export const gradebookSummary = (course: CourseProject): GradebookSummary => {
  const breakdown = gradebookGroupBreakdown(course);
  const weightTotal = Math.round(course.assignmentGroups.reduce((sum, group) => sum + Number(group.weight || 0), 0));
  const ungrouped = ungroupedGradedItems(course).length;
  const weightOk = weightTotal === 100;
  const zeroWeightActive = breakdown.some((entry) => entry.active && Number(entry.group.weight || 0) === 0);
  const blocked = !weightOk || ungrouped > 0;
  return {
    status: blocked ? "Blocked" : zeroWeightActive ? "Needs review" : "Balanced",
    weightTotal,
    weightOk,
    groupCount: course.assignmentGroups.length,
    activeGroupCount: breakdown.filter((entry) => entry.active).length,
    gradedItemCount: gradedItemsWithGroup(course).length,
    pointsTotal: breakdown.reduce((sum, entry) => sum + entry.pointsTotal, 0),
    dropLowestGroups: course.assignmentGroups.filter((group) => Number(group.dropLowest || 0) > 0).length,
    ungroupedItems: ungrouped
  };
};

export type GradebookIssueSeverity = "error" | "warning";

export interface GradebookIssue {
  id: string;
  severity: GradebookIssueSeverity;
  title: string;
  detail: string;
  tab: EditorTab;
}

export const gradebookIssues = (course: CourseProject): GradebookIssue[] => {
  const issues: GradebookIssue[] = [];
  const breakdown = gradebookGroupBreakdown(course);
  const weightTotal = Math.round(course.assignmentGroups.reduce((sum, group) => sum + Number(group.weight || 0), 0));

  if (course.assignmentGroups.length === 0) {
    issues.push({ id: "no-groups", severity: "error", title: "No assignment groups", detail: "Add at least one weighted assignment group before export.", tab: "Gradebook Setup" });
  }
  if (course.assignmentGroups.length > 0 && weightTotal !== 100) {
    issues.push({
      id: "weight-total",
      severity: "error",
      title: "Weights do not total 100%",
      detail: `Group weights currently total ${weightTotal}%. Rebalance so they sum to exactly 100%.`,
      tab: "Gradebook Setup"
    });
  }
  course.assignmentGroups
    .filter((group) => Number(group.weight || 0) < 0 || Number(group.weight || 0) > 100)
    .forEach((group) => issues.push({ id: `weight-range-${group.id}`, severity: "error", title: "Weight out of range", detail: `${group.name} has a weight outside 0–100%.`, tab: "Gradebook Setup" }));
  breakdown
    .filter((entry) => entry.active && Number(entry.group.weight || 0) === 0)
    .forEach((entry) => issues.push({ id: `zero-weight-${entry.group.id}`, severity: "error", title: "Graded group has 0% weight", detail: `${entry.group.name} holds graded work but is weighted 0%, so that work would not count.`, tab: "Gradebook Setup" }));
  breakdown
    .filter((entry) => !entry.active && Number(entry.group.weight || 0) > 0)
    .forEach((entry) => issues.push({ id: `empty-weighted-${entry.group.id}`, severity: "warning", title: "Weighted group is empty", detail: `${entry.group.name} carries ${entry.group.weight}% weight but has no graded items.`, tab: "Gradebook Setup" }));
  const ungrouped = ungroupedGradedItems(course);
  if (ungrouped.length > 0) {
    issues.push({
      id: "ungrouped-items",
      severity: "error",
      title: "Graded items reference a missing group",
      detail: `${ungrouped.length} graded item(s) point to an assignment group that no longer exists: ${ungrouped.slice(0, 3).map((item) => item.title).join(", ")}.`,
      tab: "Assignments"
    });
  }
  const nameCounts = new Map<string, number>();
  course.assignmentGroups.forEach((group) => nameCounts.set(group.name.trim().toLowerCase(), (nameCounts.get(group.name.trim().toLowerCase()) ?? 0) + 1));
  course.assignmentGroups
    .filter((group) => (nameCounts.get(group.name.trim().toLowerCase()) ?? 0) > 1)
    .forEach((group) => issues.push({ id: `dup-name-${group.id}`, severity: "warning", title: "Duplicate group name", detail: `More than one group is named "${group.name}".`, tab: "Gradebook Setup" }));

  return issues;
};

// ---------------------------------------------------------------------------
// Mutations (pure: course in, course out)
// ---------------------------------------------------------------------------

const touch = (course: CourseProject, timestamp: string): CourseProject => ({ ...course, updatedAt: timestamp });

export const addAssignmentGroup = (course: CourseProject, options: { id?: string; name?: string; timestamp?: string } = {}): CourseProject => {
  const timestamp = options.timestamp ?? nowIso();
  const existing = new Set(course.assignmentGroups.map((group) => group.name.trim().toLowerCase()));
  let name = options.name ?? "New Group";
  let suffix = 2;
  while (existing.has(name.trim().toLowerCase())) {
    name = `${options.name ?? "New Group"} ${suffix}`;
    suffix += 1;
  }
  const group: AssignmentGroup = { id: options.id ?? `group_${Date.now().toString(36)}`, name, weight: 0 };
  return touch({ ...course, assignmentGroups: [...course.assignmentGroups, group] }, timestamp);
};

export const updateAssignmentGroup = (
  course: CourseProject,
  groupId: string,
  patch: Partial<Pick<AssignmentGroup, "name" | "weight" | "dropLowest">>,
  timestamp = nowIso()
): CourseProject =>
  touch({ ...course, assignmentGroups: course.assignmentGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)) }, timestamp);

// Delete a group and reassign its graded items to another group so nothing is orphaned. When no
// target is given, items move to the first remaining group; deleting the only group is refused.
export const deleteAssignmentGroup = (course: CourseProject, groupId: string, reassignToId?: string, timestamp = nowIso()): CourseProject => {
  if (!course.assignmentGroups.some((group) => group.id === groupId)) return course;
  const remaining = course.assignmentGroups.filter((group) => group.id !== groupId);
  if (remaining.length === 0) return course;
  const target = reassignToId && remaining.some((group) => group.id === reassignToId) ? reassignToId : remaining[0].id;
  const reassign = <T extends { assignmentGroupId: string }>(items: T[]): T[] =>
    items.map((item) => (item.assignmentGroupId === groupId ? { ...item, assignmentGroupId: target } : item));
  return touch(
    {
      ...course,
      assignmentGroups: remaining,
      assignments: reassign(course.assignments),
      discussions: reassign(course.discussions),
      quizzes: reassign(course.quizzes)
    },
    timestamp
  );
};

// Distribute exactly 100% across groups, proportional to their current weights (even split when
// all current weights are zero). Groups that hold graded work are weighted; empty groups are zeroed
// when at least one active group exists. Rounding drift is absorbed by the largest fractional parts
// so the result is integers summing to exactly 100.
export const rebalanceWeights = (course: CourseProject, timestamp = nowIso()): CourseProject => {
  if (course.assignmentGroups.length === 0) return course;
  const breakdown = gradebookGroupBreakdown(course);
  const activeIds = new Set(breakdown.filter((entry) => entry.active).map((entry) => entry.group.id));
  const targets = activeIds.size > 0 ? course.assignmentGroups.filter((group) => activeIds.has(group.id)) : course.assignmentGroups;
  const currentSum = targets.reduce((sum, group) => sum + Math.max(0, Number(group.weight || 0)), 0);
  const raw = targets.map((group) => (currentSum > 0 ? (Math.max(0, Number(group.weight || 0)) / currentSum) * 100 : 100 / targets.length));
  const weights = raw.map((value) => Math.floor(value));
  let remainder = 100 - weights.reduce((sum, value) => sum + value, 0);
  const byFraction = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i += 1) weights[byFraction[i % byFraction.length].index] += 1;
  const weightByGroupId = new Map(targets.map((group, index) => [group.id, weights[index]]));
  return touch(
    {
      ...course,
      assignmentGroups: course.assignmentGroups.map((group) => ({ ...group, weight: weightByGroupId.has(group.id) ? weightByGroupId.get(group.id)! : 0 }))
    },
    timestamp
  );
};
