import { describe, expect, it } from "vitest";
import type { CourseProject } from "../types";
import { slugify } from "../utils/text";
import { buildImsccZip, validateImsccZip } from "./imsccExport";
import {
  PAGE_TEMPLATES,
  buildPageTemplateHtml,
  changePageModule,
  createPage,
  deletePage,
  duplicatePage,
  restorePage,
  sanitizePageHtmlForPreview,
  unsafeHtmlReasons,
  validatePagePlan
} from "./pageBuilder";
import { sampleProject } from "./courseGenerator";

const clone = (course: CourseProject): CourseProject => structuredClone(course);

const targetModuleFor = (course: CourseProject, sourceModuleId: string | undefined) => {
  const target = course.modules.find((module) => module.id !== sourceModuleId && module.kind === "content") ?? course.modules.find((module) => module.id !== sourceModuleId);
  expect(target).toBeDefined();
  return target!;
};

describe("page builder", () => {
  it("generates Canvas-safe page templates with a clear H1 and section headings", () => {
    const course = clone(sampleProject);
    const page = course.pages.find((item) => item.moduleId) ?? course.pages[0];

    expect(PAGE_TEMPLATES).toHaveLength(8);
    PAGE_TEMPLATES.forEach((template) => {
      const html = buildPageTemplateHtml(template.id, course, page);

      expect(html.match(/<h1\b/gi) ?? []).toHaveLength(1);
      expect(html.match(/<h2\b/gi)?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(html).not.toMatch(/<script|javascript:|\son[a-z]+\s*=/i);
    });
  });

  it("creates and duplicates pages with unique slugs and matching module items", () => {
    const created = createPage(clone(sampleProject), {
      templateId: "resource-list",
      pageId: "page_unit_created",
      timestamp: "2026-01-01T00:00:00.000Z",
      title: "Module Resource List"
    });
    const page = created.pages.find((item) => item.id === "page_unit_created");

    expect(page).toBeDefined();
    expect(created.modules.some((module) => module.items.some((item) => item.type === "page" && item.refId === "page_unit_created"))).toBe(true);
    expect(validatePagePlan(created).issues.filter((issue) => issue.pageId === "page_unit_created" && issue.severity === "error")).toHaveLength(0);

    const duplicated = duplicatePage(created, "page_unit_created", { stamp: "unit", timestamp: "2026-01-01T00:00:00.000Z" });
    const copy = duplicated.pages.find((item) => item.id === "page_unit_created_copy_unit");

    expect(copy).toBeDefined();
    expect(copy?.slug).not.toBe(page?.slug);
    expect(copy?.frontPage).toBe(false);
    expect(duplicated.modules.some((module) => module.items.some((item) => item.type === "page" && item.refId === copy?.id))).toBe(true);
  });

  it("keeps page module moves aligned with module items and schedule entries", () => {
    const course = clone(sampleProject);
    const page = course.pages.find((item) => item.moduleId && item.slug !== "syllabus") ?? course.pages[0];
    const target = targetModuleFor(course, page.moduleId);

    const moved = changePageModule(course, page.id, target.id, "2026-01-01T00:00:00.000Z");
    const moduleItems = moved.modules.flatMap((module) => module.items.filter((item) => (item.type === "page" || item.type === "syllabus") && item.refId === page.id).map((item) => ({ moduleId: module.id, item })));

    expect(moved.pages.find((item) => item.id === page.id)?.moduleId).toBe(target.id);
    expect(moduleItems).toHaveLength(1);
    expect(moduleItems[0].moduleId).toBe(target.id);
    moved.schedule.filter((entry) => entry.itemId === page.id).forEach((entry) => expect(entry.moduleId).toBe(target.id));
    expect(validatePagePlan(moved).issues.filter((issue) => /module-mismatch/.test(issue.id))).toHaveLength(0);
  });

  it("guards required page deletion and restores snapshots with module placement", () => {
    const course = clone(sampleProject);
    const required = course.pages.find((page) => page.frontPage) ?? course.pages[0];
    const guarded = deletePage(course, required.id);

    expect(guarded.pages.some((page) => page.id === required.id)).toBe(true);

    const deleted = deletePage(course, required.id, true);
    expect(deleted.pages.some((page) => page.id === required.id)).toBe(false);
    expect(deleted.modules.some((module) => module.items.some((item) => item.refId === required.id))).toBe(false);

    const restored = restorePage(deleted, required, "2026-01-01T00:00:00.000Z");
    expect(restored.pages.some((page) => page.id === required.id)).toBe(true);
    expect(restored.modules.some((module) => module.id === required.moduleId && module.items.some((item) => item.refId === required.id))).toBe(true);
  });

  it("flags unsafe HTML, weak accessibility, duplicate slugs, and module mismatches", () => {
    const course = clone(sampleProject);
    const page = course.pages[0];
    const duplicateSlug = course.pages[1]?.slug ?? "syllabus";
    course.pages = course.pages.map((item) =>
      item.id === page.id
        ? {
            ...item,
            title: "Weak page",
            slug: duplicateSlug,
            moduleId: "missing_module",
            bodyHtml: '<h1>Weak page</h1><h3>Skipped heading</h3><p><a href="#">here</a></p><img src="x"><script>alert(1)</script>',
            publishState: "published"
          }
        : item
    );

    const validation = validatePagePlan(course);
    const ids = validation.issues.filter((issue) => issue.pageId === page.id).map((issue) => issue.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        `${page.id}-slug-duplicate`,
        `${page.id}-heading-order-1`,
        `${page.id}-unsafe-html`,
        `${page.id}-image-alt`,
        `${page.id}-substance`,
        `${page.id}-module-missing`,
        `${page.id}-link-text`,
        `${page.id}-placeholder-links`
      ])
    );
  });

  it("exports created pages and fails validation for unsafe page HTML", async () => {
    const course = createPage(clone(sampleProject), {
      templateId: "lecture-notes",
      pageId: "page_export_created",
      timestamp: "2026-01-01T00:00:00.000Z",
      title: "Exported Lecture Notes"
    });
    const page = course.pages.find((item) => item.id === "page_export_created");
    expect(page).toBeDefined();

    const zip = await buildImsccZip(course);
    expect(zip.file(`wiki_content/${slugify(page?.slug || page?.title || "")}.html`)).toBeTruthy();

    const broken = clone(course);
    broken.pages = broken.pages.map((item) => (item.id === "page_export_created" ? { ...item, bodyHtml: `${item.bodyHtml}<script>alert(1)</script>` } : item));
    const report = await validateImsccZip(broken, await buildImsccZip(broken));

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.id.includes("page-quality") && issue.severity === "error")).toBe(true);
  });

  it("names every Canvas-hostile construct so the editor can show specific reasons", () => {
    expect(unsafeHtmlReasons("<p>Clean and safe.</p>")).toEqual([]);
    expect(unsafeHtmlReasons("<style>h1{color:red}</style>")).toContain("style blocks (Canvas strips these)");
    expect(unsafeHtmlReasons('<link rel="stylesheet" href="x.css">')).toContain("link elements (Canvas strips these)");
    expect(unsafeHtmlReasons('<base href="https://x">')).toContain("base elements");
    expect(unsafeHtmlReasons('<iframe src="https://x"></iframe>')).toContain("frames");
    expect(unsafeHtmlReasons('<a href="data:text/html,<b>x</b>">x</a>')).toContain("data:text/html URLs");
    expect(unsafeHtmlReasons('<p onclick="x()">x</p>')).toContain("inline event handlers");
  });

  it("flags new unsafe constructs as export blockers and lists them in the detail", () => {
    const course = clone(sampleProject);
    const page = course.pages[0];
    course.pages = course.pages.map((item) =>
      item.id === page.id
        ? { ...item, bodyHtml: "<h1>Styled</h1><style>h1{color:red}</style><p>Enough descriptive student-facing text to clear the substance threshold for this page body.</p>" }
        : item
    );
    const unsafe = validatePagePlan(course).issues.find((issue) => issue.id === `${page.id}-unsafe-html`);

    expect(unsafe?.severity).toBe("error");
    expect(unsafe?.detail).toContain("style blocks");
  });

  it("strips Canvas-hostile markup from the preview so it matches what Canvas renders", () => {
    const dirty =
      '<h1>Hi</h1><style>h1{color:red}</style><iframe src="https://x"></iframe>' +
      '<img src="data:text/html,<b>x</b>" alt="x"><a href="javascript:alert(1)">x</a><p onclick="x()">ok</p>';
    const clean = sanitizePageHtmlForPreview(dirty);

    expect(clean).not.toMatch(/<style|<iframe|onclick=|javascript:|data:text\/html/i);
    expect(clean).toContain("Hi");
    expect(clean).toContain("ok");
  });

  it("flags accessibility gaps: empty headings, header-less tables, vague and new-tab links", () => {
    const course = clone(sampleProject);
    const page = course.pages[0];
    course.pages = course.pages.map((item) =>
      item.id === page.id
        ? {
            ...item,
            slug: "a11y-sample-page",
            moduleId: undefined,
            bodyHtml:
              "<h1>Accessibility sample</h1><h2></h2>" +
              "<table><tr><td>No header cells in this data table at all</td></tr></table>" +
              '<p><a href="https://example.com">this page</a> and <a href="https://example.com" target="_blank">a new window opens</a></p>' +
              "<p>Enough descriptive student-facing text to clear the substance threshold for this validation case.</p>"
          }
        : item
    );
    const ids = validatePagePlan(course).issues.filter((issue) => issue.pageId === page.id).map((issue) => issue.id);

    expect(ids).toEqual(expect.arrayContaining([`${page.id}-empty-heading`, `${page.id}-table-headers`, `${page.id}-link-text`, `${page.id}-link-target`]));
  });

  it("does not flag tables that have header cells or are marked layout-only", () => {
    const course = clone(sampleProject);
    const page = course.pages[0];
    course.pages = course.pages.map((item) =>
      item.id === page.id
        ? {
            ...item,
            slug: "table-ok-page",
            moduleId: undefined,
            bodyHtml:
              "<h1>Tables</h1>" +
              '<table><thead><tr><th scope="col">Week</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>' +
              '<table role="presentation"><tr><td>layout only</td></tr></table>' +
              "<p>Enough descriptive student-facing text to clear the substance threshold for this validation case.</p>"
          }
        : item
    );
    const ids = validatePagePlan(course).issues.filter((issue) => issue.pageId === page.id).map((issue) => issue.id);

    expect(ids).not.toContain(`${page.id}-table-headers`);
  });

  it("flags two pages that export to the same wiki_content path without double-counting", () => {
    const course = clone(sampleProject);
    const target = course.pages.find((entry) => entry.slug)!;
    const collider = course.pages.find((entry) => entry.id !== target.id)!;
    course.pages = course.pages.map((entry) => (entry.id === collider.id ? { ...entry, slug: "", title: target.slug.replace(/-/g, " ") } : entry));

    const ids = validatePagePlan(course).issues.filter((issue) => issue.pageId === collider.id).map((issue) => issue.id);

    expect(ids).toContain(`${collider.id}-slug-collision`);
    expect(ids).not.toContain(`${collider.id}-slug-duplicate`);
  });

  it("keeps generated sample pages clean under the new safety and accessibility checks", () => {
    const ids = validatePagePlan(sampleProject).issues.map((issue) => issue.id);

    ["unsafe-html", "empty-heading", "table-headers", "slug-collision", "link-target"].forEach((suffix) => {
      expect(ids.some((id) => id.endsWith(`-${suffix}`))).toBe(false);
    });
  });
});
