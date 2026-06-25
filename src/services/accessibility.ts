// Accessibility tiers for generated courses:
//  • applyAccessibilityTier — when a course opts into "AAA", darken the themed link/heading/body
//    colors until they clear the stricter WCAG AAA contrast ratio (7:1 normal), so every generated
//    page reads for low-vision users. Returns an adjusted Theme; AA (default) is unchanged.
//  • colorblindSafetyReport — simulate the three dichromacies on the theme's key color pairs and
//    flag any that could collapse, so a chosen palette doesn't rely on hue alone.
// Pure color math (utils/color); no rendering here.

import { contrastRatio, darken, parseHex, type Rgb } from "../utils/color";
import type { Theme } from "../types";

const AAA_NORMAL = 7; // WCAG AAA contrast for normal text

/** Darken `color` until it clears `target` contrast on `bg` (bounded so it never loops forever). */
const darkenToContrast = (color: string, bg: string, target: number): string => {
  let current = color;
  for (let i = 0; i < 24 && contrastRatio(current, bg) < target; i += 1) {
    current = darken(current, 0.06);
  }
  return current;
};

/**
 * Adjust a theme for the requested accessibility tier. "AAA" deepens the link/heading accent and the
 * body text so generated content clears AAA contrast on white/soft. "AA" (or unset) returns the
 * theme unchanged (the presets already pass AA).
 */
export const applyAccessibilityTier = (theme: Theme, tier: "AA" | "AAA" | undefined): Theme => {
  if (tier !== "AAA") return theme;
  return {
    ...theme,
    accentDark: darkenToContrast(theme.accentDark, "#ffffff", AAA_NORMAL),
    contrastText: darkenToContrast(theme.contrastText, theme.soft || "#ffffff", AAA_NORMAL)
  };
};

// Widely-used dichromacy approximation matrices (operate on sRGB channels).
const DICHROMACY: Record<string, number[][]> = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758]
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7]
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525]
  ]
};

const simulate = (hex: string, m: number[][]): Rgb | null => {
  const c = parseHex(hex);
  if (!c) return null;
  return {
    r: m[0][0] * c.r + m[0][1] * c.g + m[0][2] * c.b,
    g: m[1][0] * c.r + m[1][1] * c.g + m[1][2] * c.b,
    b: m[2][0] * c.r + m[2][1] * c.g + m[2][2] * c.b
  };
};

const distance = (a: Rgb, b: Rgb): number => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

export interface ColorblindReport {
  safe: boolean;
  warnings: string[];
}

/**
 * Check that the theme's meaningful color pairs stay distinguishable under each dichromacy (i.e. the
 * design doesn't rely on hue alone). Well-built themes lean on lightness, which survives color
 * blindness, so most pass; this flags the exceptions.
 */
export const colorblindSafetyReport = (theme: Theme): ColorblindReport => {
  const gradientFrom = theme.gradientFrom ?? theme.accent;
  const gradientTo = theme.gradientTo ?? theme.accentDark;
  const pairs: Array<[string, string, string]> = [
    ["Accent fill vs page background", theme.accent, theme.soft],
    ["Heading color vs page background", theme.accentDark, theme.soft],
    ["Hero gradient start vs end", gradientFrom, gradientTo]
  ];
  // Below this simulated RGB distance, two colors may be hard to tell apart.
  const THRESHOLD = 22;
  const warnings: string[] = [];
  for (const [label, a, b] of pairs) {
    for (const [type, matrix] of Object.entries(DICHROMACY)) {
      const sa = simulate(a, matrix);
      const sb = simulate(b, matrix);
      if (sa && sb && distance(sa, sb) < THRESHOLD) {
        warnings.push(`${label} may be hard to distinguish (${type}).`);
      }
    }
  }
  return { safe: warnings.length === 0, warnings };
};
