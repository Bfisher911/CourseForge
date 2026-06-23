---
name: RocketCourse
description: Canvas-first AI course builder with a cosmic-dark, rocket-fast interface.
colors:
  bg-deep-space: "#05060f"
  bg-2: "#080a1c"
  bg-3: "#0c0f2a"
  midnight: "#101b5f"
  violet-deep: "#1a1450"
  surface-solid: "#11142e"
  ink: "#eef2ff"
  ink-dim: "#c4ccf2"
  muted: "#98a3d6"
  subtle: "#6f7aae"
  cyan: "#22e6ff"
  cyan-strong: "#00c8ec"
  pink: "#ff2ea6"
  pink-strong: "#ff0f93"
  orange: "#ff8a00"
  orchid: "#c77dff"
  indigo: "#6a5bff"
  laser-yellow: "#d7ff00"
  success: "#4be8a8"
  warning: "#ffb43d"
  danger: "#ff5d73"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "9px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "22px"
  "6": "30px"
  "7": "44px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "#05071a"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 11px"
  card-surface:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
---

# Design System: RocketCourse

## 1. Overview

**Creative North Star: "The Mission Console"**

RocketCourse is a deep-space flight deck for building Canvas courses. The surface
is a near-black cosmos (`#05060f`) lit by luminous instrument readouts: cyan,
hot-pink, and laser-yellow signals that mean something, against violet-tinted
glass panels. The feeling is a confident launch console, not a toy and not an
enterprise spreadsheet. Personality runs hottest at the edges — the launch loader,
empty states, the "ready for launch" export moment — and cools to a calm,
legible cockpit inside the editor so an instructor can actually think.

The system explicitly rejects three things. It is **not** a generic edu/LMS
template (no beige, boxy, Blackboard-admin blandness). It is **not** sterile
enterprise SaaS (no anonymous blue-gray dashboard, no three identical feature
cards). And it is **not** overstimulating gaming/crypto neon (the glow is a
supporting accent, never the whole screen shouting). The neon is the brand's
signature *because* it is rationed.

**Key Characteristics:**
- Deep-space dark canvas with violet-tinted glass surfaces (`backdrop-filter` glass).
- Neon accent vocabulary (cyan / pink / orange / orchid / laser-yellow) used for
  signal, not decoration.
- Space Grotesk display headers over an Inter body/UI workhorse.
- Plasma-gradient primary actions; restrained, legible interior.
- Rocket motif: orbital rings, swirl glow, rocket-trail accent line, launch loader.

## 2. Colors

A luminous neon palette on a deep-space ground: cool by default, with warm
signals (orange, pink) reserved for emphasis and state.

### Primary
- **Plasma Indigo** (#6a5bff): the anchor of the primary action gradient and the
  brand's "violet" core; carries the `--grad-plasma` CTA from cyan through indigo
  to hot-pink.
- **Signal Cyan** (#22e6ff): the default `--accent`. Primary focus rings, current
  selection, links, active state, and luminous borders.

### Secondary
- **Hot Pink** (#ff2ea6): the rocket-trail / energy accent; second voice in
  gradients and high-emphasis brand moments. Rationed, never a body color.
- **Solar Orange** (#ff8a00) and **Orchid** (#c77dff): tertiary signal accents for
  category color, badges, and gradient mid-tones.
- **Laser Yellow** (#d7ff00): the highest-energy accent; used sparingly for a
  single bright pop (`--grad-laser`).

### Neutral
- **Ink** (#eef2ff): primary text on dark surfaces.
- **Ink Dim** (#c4ccf2): secondary text, ghost-button labels — still a real
  reading color.
- **Muted** (#98a3d6) / **Subtle** (#6f7aae): metadata, captions, table headers.
  These are the contrast watch-zone (see Do's and Don'ts).
- **Deep Space** (#05060f), **BG-2/3** (#080a1c / #0c0f2a), **Midnight** (#101b5f):
  background layers. **Surface Solid** (#11142e) and the translucent
  `--surface` / `--elevated` glasses are the panel layers.

### Semantic
- **Success** (#4be8a8), **Warning** (#ffb43d), **Danger** (#ff5d73): status,
  always paired with text/icon, never color-only.

### Named Rules
**The Rationed-Neon Rule.** Neon is signal, not surface. On any editor screen,
saturated accent (cyan/pink/orange/yellow at full strength) covers roughly ≤10% of
the pixels: actions, current selection, status, one hero moment. The moment two
accents fight for attention in a working panel, one is wrong.

**The Glow-on-State Rule.** Glows (`--glow-cyan`, `--glow-plasma`) belong on
hover/focus/primary action, not at rest on every card. A panel that glows before
the user touches it is overstimulation.

## 3. Typography

**Display Font:** Space Grotesk (with Inter, system-ui fallback)
**Body / UI Font:** Inter (with ui-sans-serif, system-ui, -apple-system)

**Character:** A geometric, slightly quirky grotesk for headers and brand moments
paired with the neutral, hyper-legible Inter for all working UI. The pairing is a
real contrast axis (characterful display + neutral workhorse), not two similar
sans fonts.

### Hierarchy
- **Display** (Space Grotesk, 600–700, clamp up to ~2.4rem, line-height ~1.1):
  page/section titles, brand wordmark fallback, stat figures, launch labels.
- **Headline / Title** (Space Grotesk or Inter 600, 18–26px): card titles, tab
  headings, blog post titles.
- **Body** (Inter, 400, 14–16px, line-height 1.6–1.7): prose, descriptions,
  help text. Cap reading measure at 65–75ch.
- **Label** (Inter, 600, 12px, letter-spacing 0.04em, often uppercase): table
  headers, eyebrows, status pills, form labels.

### Named Rules
**The Workhorse Rule.** Space Grotesk is for titles and brand moments only. Buttons,
data, table cells, form labels, and dense UI use Inter. A display font in a data
cell is a product-UI tell.

## 4. Elevation

A hybrid system: tonal layering (deep-space → glass surface → elevated) does most
of the depth work, with soft, dark, large-radius shadows for floating elements and
luminous glows reserved for state. Surfaces are translucent glass
(`backdrop-filter: saturate(150%) blur(16px)`), so depth reads through blur and
tone as much as through shadow.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 18px 44px rgba(4,6,22,0.55)`): resting elevation for
  panels and modals.
- **Soft** (`0 12px 30px rgba(0,0,0,0.38)`): subtle lift for menus, popovers.
- **Glow Plasma / Cyan / Pink** (`--glow-*`): luminous state shadows for the
  primary action and hover/focus — never resting decoration.

### Named Rules
**The Glass-Has-a-Floor Rule.** Translucent surfaces always sit on the deep-space
ground or a solid fallback (`--surface-solid` #11142e), never on another glass
panel. Glass-on-glass muddies contrast and stacks blur cost.

## 5. Components

### Buttons
- **Shape:** pill-ish rounded rectangle (9px, `--radius-sm`), min-height 44px,
  font-weight 700, `white-space: nowrap`.
- **Primary:** plasma gradient (`--grad-plasma`) with dark ink text
  (`--accent-ink` #05071a) and `--glow-plasma`. Hover lifts `translateY(-2px)`,
  shifts the gradient, and brightens.
- **Secondary:** translucent indigo fill + `--line-strong` border + glass blur;
  hover shifts border to cyan.
- **Ghost:** transparent, `--ink-dim` label; hover fills faint indigo and brightens
  text.
- **Danger:** rose→magenta gradient, white text.
- **Disabled:** opacity 0.5, no transform/shadow, slight grayscale.

### Inputs / Fields
- **Style:** `--surface-2` / `--surface-solid` fill, `--line` 1px border, 9px
  radius, Inter 14px, `--ink` text.
- **Focus:** border shifts to cyan (`--rc-cyan`) + soft focus ring
  (`--focus-ring-soft`). No outline removal without a replacement ring.
- **Labels:** above the input, 12–13px, 600 weight, `--ink-dim`.

### Cards / Containers (Panels)
- **Corner Style:** 14px (`--radius`) for panels, 20px (`--radius-lg`) for feature
  cards.
- **Background:** `--rc-card-bg` gradient or `--surface`; 1px `--line` border.
- **Shadow Strategy:** resting `--shadow-card`; cyan border + `translateY(-2px)` on
  hover for interactive cards.
- **Internal Padding:** 16–18px.

### Navigation (Tabs + Rail)
- **Editor tabs** (`.tabs`) + a left **rail** of labeled sections. Active state
  uses the cyan accent and a clear current indicator; labels are always text
  (icon-only is not used for primary nav).
- **Top bar:** sticky, 70px, glass gradient, `--line` bottom border, z-index 30.

### Status Pills
- Capsule (`--radius-pill`), 11.5px 600 label, tinted background + matching border
  per state (success teal, warning amber, danger rose). State is carried by color
  **and** text, never color alone.

### Signature: Launch Loader & Rocket Trail
- The `.rc-loader` (orbiting rings + floating mark + pulse glow) and `.rc-trail`
  (animated gradient hairline) are the brand's signature motion. Both fully
  collapse under `prefers-reduced-motion`. Use them at genuine "launch" moments
  (app boot, export), not as ambient page decoration.

## 6. Do's and Don'ts

### Do:
- **Do** keep neon as signal: actions, current selection, status, one hero moment
  per screen (the Rationed-Neon Rule, ≤10% saturated accent in working panels).
- **Do** use Space Grotesk for titles and brand moments; **Inter for all buttons,
  data, labels, and dense UI** (the Workhorse Rule).
- **Do** verify `--muted` (#98a3d6) and `--subtle` (#6f7aae) hit ≥4.5:1 on their
  actual surface before using them for readable body text; bump toward `--ink-dim`
  if close.
- **Do** reserve glows for hover/focus/primary state; surfaces are calm at rest
  (the Glow-on-State Rule).
- **Do** pair every status color with text or an icon.
- **Do** collapse all orbital/float/spin/trail motion under
  `prefers-reduced-motion`.

### Don't:
- **Don't** look like a **generic edu/LMS template** — no beige, boxy,
  Blackboard-admin surfaces.
- **Don't** look like **sterile enterprise SaaS** — no anonymous blue-gray
  dashboard, no three identical icon-heading-text feature cards in a row.
- **Don't** tip into **overstimulating gaming/crypto neon** — no glow on every
  card, no gradient text on body copy, no carnival of competing accents.
- **Don't** use gradient text (`background-clip: text`) for anything except the
  brand wordmark fallback; emphasis comes from weight/size/color.
- **Don't** put glass on glass; translucent panels sit on the deep-space ground or
  `--surface-solid`.
- **Don't** use a display font (Space Grotesk) in data cells, table content, or
  form labels.
- **Don't** convey state by color alone.
