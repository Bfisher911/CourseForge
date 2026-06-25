import { describe, expect, it } from "vitest";
import { applyAccessibilityTier, colorblindSafetyReport } from "./accessibility";
import { contrastRatio } from "../utils/color";
import type { Theme } from "../types";

const theme: Theme = {
  id: "vt-a11y-test",
  name: "A11y Test",
  accent: "#0e7490",
  accentDark: "#0e7490", // ~4.7:1 on white — AA but below AAA (7:1)
  soft: "#ecfeff",
  contrastText: "#0e7490",
  bannerLabel: "A11y Test",
  contrastStatus: "pass",
  gradientFrom: "#0e7490",
  gradientTo: "#1d4ed8"
};

describe("applyAccessibilityTier", () => {
  it("leaves the theme unchanged at AA (or unset)", () => {
    expect(applyAccessibilityTier(theme, "AA")).toBe(theme);
    expect(applyAccessibilityTier(theme, undefined)).toBe(theme);
  });

  it("AAA deepens link/heading + body colors until they clear 7:1", () => {
    expect(contrastRatio(theme.accentDark, "#ffffff")).toBeLessThan(7); // precondition
    const aaa = applyAccessibilityTier(theme, "AAA");
    expect(contrastRatio(aaa.accentDark, "#ffffff")).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(aaa.contrastText, theme.soft)).toBeGreaterThanOrEqual(7);
    // hue is preserved (still a recognizably teal accent family), not blacked out
    expect(aaa.accentDark).not.toBe("#000000");
  });

  it("is stable when already AAA-compliant (no further darkening needed)", () => {
    const dark: Theme = { ...theme, accentDark: "#0b3a47", contrastText: "#0b3a47" };
    const aaa = applyAccessibilityTier(dark, "AAA");
    expect(contrastRatio(aaa.accentDark, "#ffffff")).toBeGreaterThanOrEqual(7);
  });
});

describe("colorblindSafetyReport", () => {
  it("passes a lightness-based theme (distinctions survive color blindness)", () => {
    const report = colorblindSafetyReport(theme);
    expect(report.safe).toBe(true);
    expect(report.warnings).toHaveLength(0);
  });

  it("flags a palette where the accent fill matches the page background", () => {
    const bad: Theme = { ...theme, accent: "#8a8a8a", soft: "#8a8a8a" };
    const report = colorblindSafetyReport(bad);
    expect(report.safe).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/distinguish/i);
  });
});
