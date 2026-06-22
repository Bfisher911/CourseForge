import { describe, expect, it } from "vitest";
import type { CourseProject } from "../types";
import { sampleProject } from "./courseGenerator";
import { buildReadinessReport } from "./readiness";
import {
  addOutcome,
  buildOverviewModel,
  courseHealthSummary,
  courseStructureSummary,
  deleteOutcome,
  exportReadinessSummary,
  isOrphanOutcome,
  moveOutcome,
  orphanOutcomes,
  outcomeAlignment,
  overviewDesignChecks,
  tabForCheck,
  updateOutcome
} from "./overviewSummary";

const clone = (course: CourseProject): CourseProject => structuredClone(course);

describe("overview summary — outcome management", () => {
  it("adds an outcome with a unique, sequential CLO code", () => {
    const next = addOutcome(clone(sampleProject), { id: "outcome_new", timestamp: "2026-01-01T00:00:00.000Z" });
    const created = next.outcomes.find((outcome) => outcome.id === "outcome_new");

    expect(next.outcomes).toHaveLength(sampleProject.outcomes.length + 1);
    expect(created?.text).toBe("");
    expect(created?.alignedModuleIds).toEqual([]);
    expect(new Set(next.outcomes.map((outcome) => outcome.code)).size).toBe(next.outcomes.length);
    expect(next.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("deletes an outcome and scrubs its id from aligned assessments and rubrics", () => {
    const course = clone(sampleProject);
    const aligned = course.assignments.find((assignment) => assignment.alignedOutcomeIds.length > 0);
    const outcomeId = aligned?.alignedOutcomeIds[0] ?? course.outcomes[0].id;

    const deleted = deleteOutcome(course, outcomeId, "2026-01-01T00:00:00.000Z");

    expect(deleted.outcomes.some((outcome) => outcome.id === outcomeId)).toBe(false);
    expect(deleted.assignments.every((assignment) => !assignment.alignedOutcomeIds.includes(outcomeId))).toBe(true);
    expect(deleted.discussions.every((discussion) => !discussion.alignedOutcomeIds.includes(outcomeId))).toBe(true);
    expect(deleted.quizzes.every((quiz) => !quiz.alignedOutcomeIds.includes(outcomeId))).toBe(true);
    expect(deleted.rubrics.every((rubric) => !rubric.alignedOutcomeIds.includes(outcomeId))).toBe(true);
  });

  it("reorders outcomes and no-ops at the boundaries", () => {
    const course = clone(sampleProject);
    const first = course.outcomes[0].id;
    const second = course.outcomes[1].id;

    const movedDown = moveOutcome(course, first, "down");
    expect(movedDown.outcomes[0].id).toBe(second);
    expect(movedDown.outcomes[1].id).toBe(first);

    const noop = moveOutcome(course, first, "up");
    expect(noop.outcomes.map((outcome) => outcome.id)).toEqual(course.outcomes.map((outcome) => outcome.id));
  });

  it("updates an outcome's code, text, and Bloom level", () => {
    const course = clone(sampleProject);
    const id = course.outcomes[0].id;
    const updated = updateOutcome(course, id, { code: "CLO X", text: "Evaluate competing claims.", bloomLevel: "Evaluate" });
    const outcome = updated.outcomes.find((entry) => entry.id === id);

    expect(outcome?.code).toBe("CLO X");
    expect(outcome?.text).toBe("Evaluate competing claims.");
    expect(outcome?.bloomLevel).toBe("Evaluate");
  });

  it("detects orphaned outcomes consistently with the readiness report", () => {
    const course = clone(sampleProject);
    const orphan = { id: "outcome_orphan", code: "CLO Z", text: "Float with no alignment.", bloomLevel: "Apply", alignedModuleIds: [] };
    course.outcomes = [...course.outcomes, orphan];

    expect(isOrphanOutcome(course, orphan)).toBe(true);
    expect(orphanOutcomes(course).some((outcome) => outcome.id === "outcome_orphan")).toBe(true);
    expect(orphanOutcomes(course).length).toBe(buildReadinessReport(course).checks.find((check) => check.id === "orphaned-outcomes")?.passed ? 0 : orphanOutcomes(course).length);
  });

  it("reports an outcome's alignment across modules and assessments", () => {
    const course = clone(sampleProject);
    const aligned = course.assignments.find((assignment) => assignment.alignedOutcomeIds.length > 0);
    if (aligned) {
      const alignment = outcomeAlignment(course, aligned.alignedOutcomeIds[0]);
      expect(alignment.assignments.some((assignment) => assignment.id === aligned.id)).toBe(true);
      expect(alignment.total).toBeGreaterThan(0);
    }
  });
});

describe("overview summary — snapshots & checks", () => {
  it("summarizes course structure counts", () => {
    const structure = courseStructureSummary(sampleProject);

    expect(structure.modules).toBe(sampleProject.modules.length);
    expect(structure.pages).toBe(sampleProject.pages.length);
    expect(structure.assignments).toBe(sampleProject.assignments.length);
    expect(structure.outcomes).toBe(sampleProject.outcomes.length);
    expect(structure.gradeWeightTotal).toBe(Math.round(sampleProject.assignmentGroups.reduce((sum, group) => sum + group.weight, 0)));
  });

  it("builds a health summary from the readiness report with capped, severity-sorted lists", () => {
    const report = buildReadinessReport(sampleProject);
    const health = courseHealthSummary(sampleProject, report);

    expect(health.score).toBe(report.score);
    expect(health.total).toBe(report.checks.length);
    expect(health.strengths.length).toBeLessThanOrEqual(5);
    expect(health.attention.length).toBeLessThanOrEqual(5);
    // attention is required-first: no recommended item precedes a required one
    const firstRecommended = health.attention.findIndex((item) => item.severity === "recommended");
    if (firstRecommended >= 0) {
      expect(health.attention.slice(firstRecommended).every((item) => item.severity === "recommended")).toBe(true);
    }
    health.attention.forEach((item) => expect(typeof item.tab).toBe("string"));
  });

  it("summarizes export readiness with grade weights and orphan count", () => {
    const summary = exportReadinessSummary(sampleProject);

    expect(summary.gradeWeightTotal).toBe(courseStructureSummary(sampleProject).gradeWeightTotal);
    expect(summary.gradeWeightOk).toBe(summary.gradeWeightTotal === 100);
    expect(summary.orphanedOutcomes).toBe(orphanOutcomes(sampleProject).length);
    expect(["Ready", "Needs review", "Blocked"]).toContain(summary.status);
  });

  it("produces ten Overview design checks and flags missing identity data", () => {
    const checks = overviewDesignChecks(sampleProject);
    expect(checks).toHaveLength(10);
    checks.forEach((check) => expect(["pass", "warn", "fail"]).toContain(check.status));

    const empty = clone(sampleProject);
    empty.description = "";
    empty.outcomes = [];
    const degraded = overviewDesignChecks(empty);
    expect(degraded.find((check) => check.id === "description")?.status).toBe("fail");
    expect(degraded.find((check) => check.id === "outcomes-present")?.status).toBe("fail");
  });

  it("routes readiness checks to the tab that fixes them", () => {
    expect(tabForCheck("objective-measurable")).toBe("Overview");
    expect(tabForCheck("orphaned-outcomes")).toBe("Overview");
    expect(tabForCheck("weights")).toBe("Gradebook Setup");
    expect(tabForCheck("assignment-groups")).toBe("Gradebook Setup");
    expect(tabForCheck("assignment-quality")).toBe("Assignments");
    expect(tabForCheck("discussion-quality")).toBe("Discussions");
    expect(tabForCheck("quiz-quality")).toBe("Quizzes");
    expect(tabForCheck("rubric-depth")).toBe("Rubrics");
    expect(tabForCheck("page-quality")).toBe("Pages");
    expect(tabForCheck("homepage")).toBe("Homepage");
    expect(tabForCheck("syllabus-outcomes")).toBe("Syllabus");
    expect(tabForCheck("workload")).toBe("Contact Hours");
    expect(tabForCheck("module-refs")).toBe("Modules");
  });

  it("assembles the full overview model in one call", () => {
    const model = buildOverviewModel(sampleProject);
    expect(model.structure.modules).toBeGreaterThan(0);
    expect(model.health.total).toBeGreaterThan(0);
    expect(model.designChecks).toHaveLength(10);
    expect(model.exportReadiness.score).toBe(model.health.score);
  });
});
