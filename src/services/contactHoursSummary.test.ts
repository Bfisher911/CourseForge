import { describe, expect, it } from "vitest";
import type { CourseProject } from "../types";
import { sampleProject } from "./courseGenerator";
import {
  actualWorkloadEstimate,
  categorySum,
  contactHoursBreakdown,
  contactHoursIssues,
  contactHoursSummary,
  expectedTotalHours,
  recalculateContactHours,
  updateContactHour,
  updateJustification
} from "./contactHoursSummary";

const clone = (course: CourseProject): CourseProject => structuredClone(course);

describe("contact hours summary — snapshot", () => {
  it("summarizes a balanced, generated workload plan", () => {
    const summary = contactHoursSummary(sampleProject);
    expect(summary.totalHours).toBe(Math.round(sampleProject.contactHours.totalHours));
    expect(summary.categorySum).toBe(summary.totalHours);
    expect(summary.sumsMatch).toBe(true);
    expect(summary.expectedTotal).toBe(expectedTotalHours(sampleProject));
    expect(summary.variancePct).toBe(0);
    expect(summary.status).toBe("Balanced");
  });

  it("breaks the plan into six categories whose percentages cover the whole plan", () => {
    const breakdown = contactHoursBreakdown(sampleProject);
    expect(breakdown).toHaveLength(6);
    expect(breakdown.reduce((sum, category) => sum + category.hours, 0)).toBe(categorySum(sampleProject.contactHours));
    const pctSum = breakdown.reduce((sum, category) => sum + category.pct, 0);
    expect(pctSum).toBeGreaterThanOrEqual(98);
    expect(pctSum).toBeLessThanOrEqual(102);
  });

  it("estimates actual workload from generated modules and assignments", () => {
    const actual = actualWorkloadEstimate(sampleProject);
    expect(actual.moduleWorkload).toBeGreaterThan(0);
    expect(actual.assignmentEstimate).toBeGreaterThan(0);
  });

  it("reports no error-level issues for the generated sample", () => {
    expect(contactHoursIssues(sampleProject).filter((issue) => issue.severity === "error")).toHaveLength(0);
  });
});

describe("contact hours summary — issues", () => {
  it("flags a missing workload total", () => {
    const course = clone(sampleProject);
    course.contactHours = { ...course.contactHours, instructionalTime: 0, readingMediaTime: 0, assignmentTime: 0, discussionTime: 0, quizStudyTime: 0, finalProjectTime: 0, totalHours: 0 };
    expect(contactHoursIssues(course).some((issue) => issue.id === "no-total" && issue.severity === "error")).toBe(true);
  });

  it("flags categories that do not sum to the stored total", () => {
    const course = clone(sampleProject);
    course.contactHours = { ...course.contactHours, totalHours: course.contactHours.totalHours + 50 };
    const issue = contactHoursIssues(course).find((entry) => entry.id === "sum-mismatch");
    expect(issue?.severity).toBe("warning");
  });

  it("flags a thin justification", () => {
    const course = clone(sampleProject);
    course.contactHours = { ...course.contactHours, justification: "short" };
    expect(contactHoursIssues(course).some((issue) => issue.id === "thin-justification")).toBe(true);
  });

  it("flags an implausibly heavy weekly load", () => {
    const course = clone(sampleProject);
    course.settings = { ...course.settings, lengthWeeks: 1 };
    expect(contactHoursIssues(course).some((issue) => issue.id === "high-week")).toBe(true);
  });
});

describe("contact hours summary — mutations", () => {
  it("updates a category and keeps the total as the sum of categories", () => {
    const updated = updateContactHour(clone(sampleProject), "assignmentTime", 999, "2026-01-01T00:00:00.000Z");
    expect(updated.contactHours.assignmentTime).toBe(999);
    expect(updated.contactHours.totalHours).toBe(categorySum(updated.contactHours));
    expect(updated.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("clamps negative category hours to zero", () => {
    const clamped = updateContactHour(clone(sampleProject), "discussionTime", -5);
    expect(clamped.contactHours.discussionTime).toBe(0);
  });

  it("updates the justification text", () => {
    const updated = updateJustification(clone(sampleProject), "Estimated using the Carnegie unit across all six workload categories.");
    expect(updated.contactHours.justification).toContain("Carnegie");
  });

  it("recalculates the plan from credit hours back to the standard model", () => {
    const mangled = updateContactHour(clone(sampleProject), "instructionalTime", 5);
    const restored = recalculateContactHours(mangled);
    expect(restored.contactHours.totalHours).toBe(sampleProject.settings.creditHours * 45);
    expect(categorySum(restored.contactHours)).toBe(restored.contactHours.totalHours);
  });
});
