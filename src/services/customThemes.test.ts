import { describe, expect, it } from "vitest";
import { buildThemeFromCustom } from "./customThemes";
import { darken, contrastRatio } from "../utils/color";

describe("darken", () => {
  it("moves a color toward black and stays valid hex", () => {
    expect(darken("#ffffff", 0.5)).toBe("#808080");
    expect(darken("#276ef1", 0.22)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darken("not-a-color", 0.2)).toBe("not-a-color");
  });
});

describe("buildThemeFromCustom", () => {
  it("maps inputs into a complete app Theme", () => {
    const theme = buildThemeFromCustom({
      name: "Tulane Green",
      primaryColor: "#006747",
      backgroundColor: "#eef7f2",
      textColor: "#0f172a",
      institutionName: "Tulane University"
    });
    expect(theme.id).toBe("custom_tulane-green");
    expect(theme.accent).toBe("#006747");
    expect(theme.soft).toBe("#eef7f2");
    expect(theme.contrastText).toBe("#0f172a");
    expect(theme.bannerLabel).toBe("Tulane University");
    // accentDark is a darker shade of the primary
    expect(contrastRatio(theme.accentDark, "#ffffff")).toBeGreaterThan(contrastRatio(theme.accent, "#ffffff"));
  });

  it("flags low-contrast text/background as review", () => {
    const bad = buildThemeFromCustom({ name: "Low", primaryColor: "#888", backgroundColor: "#ffffff", textColor: "#eeeeee" });
    expect(bad.contrastStatus).toBe("review");
    const good = buildThemeFromCustom({ name: "Good", primaryColor: "#111", backgroundColor: "#ffffff", textColor: "#111111" });
    expect(good.contrastStatus).toBe("pass");
  });

  it("falls back to a default name and banner", () => {
    const theme = buildThemeFromCustom({ name: "  ", primaryColor: "#123456", backgroundColor: "#fff", textColor: "#000" });
    expect(theme.name).toBe("Custom theme");
    expect(theme.bannerLabel).toBe("Custom theme");
  });
});
