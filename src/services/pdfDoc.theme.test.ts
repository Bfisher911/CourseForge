import { describe, expect, it } from "vitest";
import { PdfDoc, hexToRgb } from "./pdfDoc";

describe("hexToRgb", () => {
  it("parses #rrggbb to a 0-1 triple", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });
  it("parses #rgb shorthand", () => {
    expect(hexToRgb("#f00")).toEqual([1, 0, 0]);
  });
  it("returns null for unparseable input", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb("")).toBeNull();
    expect(hexToRgb("#12")).toBeNull();
  });
});

describe("PdfDoc theming", () => {
  it("carries the theme accent into the rendered PDF content stream", () => {
    const pdf = new PdfDoc().theme("#ff0000", "#990000").title("Themed Doc").heading("A Section").bullet("a point").build();
    // The accent (#ff0000 -> [1,0,0]) is used for the title rule and the bullet marker.
    expect(pdf).toContain("1 0 0");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("falls back to the brand palette when no theme is set, still a valid PDF", () => {
    const pdf = new PdfDoc().title("Plain").build();
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("ignores an unparseable accent and stays a valid PDF", () => {
    const pdf = new PdfDoc().theme("garbage").title("X").build();
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
  });
});
