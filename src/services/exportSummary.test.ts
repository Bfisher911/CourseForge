import { describe, expect, it } from "vitest";
import type { CourseProject, ExportValidationReport } from "../types";
import { sampleProject } from "./courseGenerator";
import { buildImsccZip, validateImsccZip } from "./imsccExport";
import { buildReadinessReport } from "./readiness";
import {
  buildImportChecklistText,
  buildValidationReportJson,
  exportChecklist,
  exportConfidence,
  groupValidationIssues,
  packageContents,
  tabForExportIssue,
  toRichIssue
} from "./exportSummary";

const clone = (course: CourseProject): CourseProject => structuredClone(course);
const issue = (id: string, severity: "error" | "warning" = "error") => ({ id, message: `message for ${id}`, severity });

describe("export summary — checklist", () => {
  it("passes the core checklist items for a generated course", () => {
    const checklist = exportChecklist(sampleProject);
    expect(checklist).toHaveLength(15);
    ["metadata", "homepage", "syllabus", "modules", "pages", "assignment-groups", "outcomes", "weights", "module-refs", "unsafe-html"].forEach((id) => {
      expect(checklist.find((item) => item.id === id)?.status, id).toBe("pass");
    });
  });

  it("fails the checklist items that map to real problems", () => {
    const course = clone(sampleProject);
    course.pages = course.pages.map((page) => ({ ...page, frontPage: false }));
    course.pages[0] = { ...course.pages[0], bodyHtml: `${course.pages[0].bodyHtml}<script>alert(1)</script>` };
    course.assignmentGroups = course.assignmentGroups.map((group) => ({ ...group, weight: 1 }));
    course.modules = course.modules.map((module, index) => (index === 0 && module.items.length ? { ...module, items: [{ ...module.items[0], refId: "missing_ref" }, ...module.items.slice(1)] } : module));
    const checklist = exportChecklist(course);

    expect(checklist.find((item) => item.id === "homepage")?.status).toBe("fail");
    expect(checklist.find((item) => item.id === "unsafe-html")?.status).toBe("fail");
    expect(checklist.find((item) => item.id === "weights")?.status).toBe("fail");
    expect(checklist.find((item) => item.id === "module-refs")?.status).toBe("fail");
  });

  it("routes each checklist item to the tab that fixes it", () => {
    const byId = new Map(exportChecklist(sampleProject).map((item) => [item.id, item.tab]));
    expect(byId.get("homepage")).toBe("Homepage");
    expect(byId.get("weights")).toBe("Gradebook Setup");
    expect(byId.get("pages")).toBe("Pages");
    expect(byId.get("outcomes")).toBe("Overview");
  });
});

describe("export summary — issue enrichment", () => {
  it("routes export issues to the tab that fixes them", () => {
    expect(tabForExportIssue("duplicate-resource-x")).toBe("Export");
    expect(tabForExportIssue("malformed-xml-imsmanifest.xml")).toBe("Export");
    expect(tabForExportIssue("empty-required-course_settings/module_meta.xml")).toBe("Export");
    expect(tabForExportIssue("unsafe-html-page_1")).toBe("Pages");
    expect(tabForExportIssue("missing-assignment-a1")).toBe("Assignments");
    expect(tabForExportIssue("assignment-group-total")).toBe("Gradebook Setup");
    expect(tabForExportIssue("broken-module-ref-i1")).toBe("Modules");
    expect(tabForExportIssue("quiz-quality-q1-stem")).toBe("Quizzes");
  });

  it("enriches an issue with a category, why, and fix", () => {
    const rich = toRichIssue(issue("assignment-group-total"));
    expect(rich.tab).toBe("Gradebook Setup");
    expect(rich.category).toBe("Gradebook");
    expect(rich.why.length).toBeGreaterThan(10);
    expect(rich.fix.length).toBeGreaterThan(10);
  });

  it("splits issues into blocking and warnings", () => {
    const report: ExportValidationReport = { valid: false, score: 40, packageName: "x.imscc", checkedAt: "", issues: [issue("a", "error"), issue("b", "warning"), issue("c", "error")], files: [], sandboxImportStatus: "not_tested" };
    const grouped = groupValidationIssues(report);
    expect(grouped.blocking).toHaveLength(2);
    expect(grouped.warnings).toHaveLength(1);
    expect(groupValidationIssues(null)).toEqual({ blocking: [], warnings: [] });
  });
});

describe("export summary — confidence & artifacts", () => {
  it("reports honest confidence states, never claiming Canvas verification", async () => {
    const readiness = buildReadinessReport(sampleProject);
    expect(exportConfidence(null, readiness).localValidation).toBe("Not run");

    const zip = await buildImsccZip(sampleProject);
    const report = await validateImsccZip(sampleProject, zip);
    const confidence = exportConfidence(report, readiness);
    expect(confidence.localValidation).toBe(report.valid ? "Passed" : "Blocked");
    expect(confidence.sandboxLabel).toBe("Not verified");
    expect(confidence.downloadable).toBe(report.valid);
    expect(confidence.packageScore).toBe(report.score);
  });

  it("summarizes package contents", () => {
    const contents = packageContents(sampleProject, null);
    expect(contents.pages).toBe(sampleProject.pages.length);
    expect(contents.assignmentGroups).toBe(sampleProject.assignmentGroups.length);
    expect(contents.files).toBeNull();
  });

  it("builds an honest JSON validation report", async () => {
    const readiness = buildReadinessReport(sampleProject);
    const zip = await buildImsccZip(sampleProject);
    const report = await validateImsccZip(sampleProject, zip);
    const json = JSON.parse(buildValidationReportJson(sampleProject, report, readiness));

    expect(json.canvasSandboxImportStatus).toBe("not_tested");
    expect(json.disclaimer).toMatch(/NOT been verified/i);
    expect(json.localValidation.score).toBe(report.score);
  });

  it("builds a manual Canvas sandbox import checklist that states the verification gap", () => {
    const text = buildImportChecklistText(sampleProject, null);
    expect(text).toMatch(/LOCAL validation only/i);
    expect(text).toMatch(/NOT been verified/i);
    expect(text).toMatch(/Settings → Import Course Content/);
    expect(text).toMatch(/weights total 100%/i);
  });
});
