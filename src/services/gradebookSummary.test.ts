import { describe, expect, it } from "vitest";
import type { CourseProject } from "../types";
import { sampleProject } from "./courseGenerator";
import {
  addAssignmentGroup,
  deleteAssignmentGroup,
  gradebookGroupBreakdown,
  gradebookIssues,
  gradebookSummary,
  gradedItems,
  rebalanceWeights,
  ungroupedGradedItems,
  updateAssignmentGroup
} from "./gradebookSummary";

const clone = (course: CourseProject): CourseProject => structuredClone(course);
const weightSum = (course: CourseProject): number => course.assignmentGroups.reduce((sum, group) => sum + group.weight, 0);

describe("gradebook summary — breakdown & snapshot", () => {
  it("collects every gradebook item (assignments + point-bearing discussions/quizzes)", () => {
    const expected = sampleProject.assignments.length + sampleProject.discussions.filter((discussion) => discussion.points > 0).length + sampleProject.quizzes.filter((quiz) => quiz.points > 0).length;
    expect(gradedItems(sampleProject)).toHaveLength(expected);
  });

  it("breaks groups down with item counts and points", () => {
    const breakdown = gradebookGroupBreakdown(sampleProject);
    expect(breakdown).toHaveLength(sampleProject.assignmentGroups.length);
    breakdown.forEach((entry) => {
      expect(entry.itemCount).toBe(entry.items.length);
      expect(entry.pointsTotal).toBe(entry.items.reduce((sum, item) => sum + item.points, 0));
      expect(entry.active).toBe(entry.items.length > 0);
    });
    const totalItems = breakdown.reduce((sum, entry) => sum + entry.itemCount, 0);
    expect(totalItems).toBe(gradedItems(sampleProject).length - ungroupedGradedItems(sampleProject).length);
  });

  it("summarizes a balanced sample gradebook", () => {
    const summary = gradebookSummary(sampleProject);
    expect(summary.weightTotal).toBe(Math.round(weightSum(sampleProject)));
    expect(summary.weightOk).toBe(summary.weightTotal === 100);
    expect(summary.gradedItemCount).toBe(gradedItems(sampleProject).length);
    expect(["Balanced", "Needs review", "Blocked"]).toContain(summary.status);
  });
});

describe("gradebook summary — issues", () => {
  it("flags weights that do not total 100%", () => {
    const course = clone(sampleProject);
    course.assignmentGroups = course.assignmentGroups.map((group) => ({ ...group, weight: 1 }));
    const issues = gradebookIssues(course);
    expect(issues.some((issue) => issue.id === "weight-total" && issue.severity === "error")).toBe(true);
  });

  it("flags an active group weighted at 0% and routes it to the gradebook", () => {
    const course = clone(sampleProject);
    const active = gradebookGroupBreakdown(course).find((entry) => entry.active)!;
    course.assignmentGroups = course.assignmentGroups.map((group) => (group.id === active.group.id ? { ...group, weight: 0 } : group));
    const issue = gradebookIssues(course).find((entry) => entry.id === `zero-weight-${active.group.id}`);
    expect(issue?.severity).toBe("error");
    expect(issue?.tab).toBe("Gradebook Setup");
  });

  it("flags graded items that reference a missing group", () => {
    const course = clone(sampleProject);
    course.assignments = course.assignments.map((assignment, index) => (index === 0 ? { ...assignment, assignmentGroupId: "missing_group" } : assignment));
    expect(ungroupedGradedItems(course).length).toBeGreaterThan(0);
    const issue = gradebookIssues(course).find((entry) => entry.id === "ungrouped-items");
    expect(issue?.severity).toBe("error");
    expect(issue?.tab).toBe("Assignments");
  });
});

describe("gradebook summary — mutations", () => {
  it("adds a group with a unique name and zero weight", () => {
    const next = addAssignmentGroup(clone(sampleProject), { id: "group_new", timestamp: "2026-01-01T00:00:00.000Z" });
    const created = next.assignmentGroups.find((group) => group.id === "group_new");
    expect(next.assignmentGroups).toHaveLength(sampleProject.assignmentGroups.length + 1);
    expect(created?.weight).toBe(0);
    expect(new Set(next.assignmentGroups.map((group) => group.name.toLowerCase())).size).toBe(next.assignmentGroups.length);
    expect(next.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("updates a group's name, weight, and drop-lowest", () => {
    const id = sampleProject.assignmentGroups[0].id;
    const updated = updateAssignmentGroup(clone(sampleProject), id, { name: "Major Work", weight: 42, dropLowest: 1 });
    const group = updated.assignmentGroups.find((entry) => entry.id === id);
    expect(group?.name).toBe("Major Work");
    expect(group?.weight).toBe(42);
    expect(group?.dropLowest).toBe(1);
  });

  it("deletes a group and reassigns its graded items, refusing to delete the last group", () => {
    const course = clone(sampleProject);
    const source = course.assignmentGroups[0].id;
    const target = course.assignmentGroups[1].id;
    const deleted = deleteAssignmentGroup(course, source, target);

    expect(deleted.assignmentGroups.some((group) => group.id === source)).toBe(false);
    expect(deleted.assignments.every((assignment) => assignment.assignmentGroupId !== source)).toBe(true);
    expect(deleted.discussions.every((discussion) => discussion.assignmentGroupId !== source)).toBe(true);
    expect(deleted.quizzes.every((quiz) => quiz.assignmentGroupId !== source)).toBe(true);
    expect(ungroupedGradedItems(deleted)).toHaveLength(0);

    const single = clone(sampleProject);
    single.assignmentGroups = [single.assignmentGroups[0]];
    expect(deleteAssignmentGroup(single, single.assignmentGroups[0].id).assignmentGroups).toHaveLength(1);
  });

  it("rebalances weights to exactly 100% in whole-number shares", () => {
    const course = clone(sampleProject);
    course.assignmentGroups = course.assignmentGroups.map((group) => ({ ...group, weight: 5 }));
    const balanced = rebalanceWeights(course);
    expect(weightSum(balanced)).toBe(100);
    balanced.assignmentGroups.forEach((group) => expect(Number.isInteger(group.weight)).toBe(true));
    // empty groups are zeroed so weight only sits on groups that hold graded work
    gradebookGroupBreakdown(balanced).forEach((entry) => {
      if (!entry.active) expect(entry.group.weight).toBe(0);
    });
  });

  it("rebalances evenly when all weights start at zero", () => {
    const course = clone(sampleProject);
    course.assignmentGroups = course.assignmentGroups.map((group) => ({ ...group, weight: 0 }));
    const balanced = rebalanceWeights(course);
    expect(weightSum(balanced)).toBe(100);
  });
});
