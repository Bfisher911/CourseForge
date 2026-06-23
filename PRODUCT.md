# Product

## Register

product

## Users

Higher-ed instructors and instructional designers building or migrating Canvas
courses. Their context: time-pressed, often non-technical, working against a term
deadline, frequently skeptical of "AI course generators" because they've seen
generic output that creates more cleanup than it saves. They arrive with a course
idea, a syllabus, lecture notes, a reading list, or an existing Canvas export, and
they want a real, editable, importable course — not a locked AI blob and not a
toy. The job to be done: go from raw material to a reviewed, export-ready
Canvas-oriented `.imscc` package they can stand behind.

## Product Purpose

RocketCourse turns course source material into editable native Canvas objects
(syllabus, modules, pages, assignments, discussions, quizzes, rubrics, gradebook)
and exports a Canvas-oriented `.imscc` package plus PDFs (course, quizzes, answer
keys, syllabus). AI generates a **first-draft scaffold** that the instructor
reviews and edits; the product's value is the speed of getting to an editable,
trustworthy starting point — and the honesty of never pretending the draft is
finished or "Canvas-verified" when it isn't. Success looks like an instructor
exporting a course they actually trust enough to import and teach.

## Brand Personality

Playful, bold, rocket-fast. Voice is energetic and confident with a sense of
momentum (the rocket is the motif: launch, trajectory, escape velocity), but it
earns the credibility of an academic tool. It is encouraging, never patronizing;
direct, never corporate; honest about limits, never hype. The personality lives
loudest at the edges — landing, loaders, empty states, the moment of export
("ready for launch") — and quiets down inside the editor so the work can breathe.

## Anti-references

- **Generic edu/LMS templates.** Beige, boxy, Blackboard/Canvas-admin blandness
  with no point of view. RocketCourse should never look like the thing instructors
  are trying to escape.
- **Sterile enterprise SaaS.** Anonymous blue-gray dashboards, three identical
  feature cards, zero personality. Familiar is fine; faceless is not.
- **Overstimulating gaming/crypto neon.** Glow on every element, gradient text
  everywhere, a carnival cockpit. The cosmic system is the brand's signature, but
  it is a supporting accent inside the editor, not the whole surface screaming.

## Design Principles

- **First draft, not final word.** Every surface frames AI output as an editable
  scaffold the instructor owns, never a finished or authoritative artifact. Review
  affordances, readiness, and edit access are always one step away.
- **Honest by default.** Claims match reality. "Canvas-oriented / Not verified"
  beats "Canvas-ready" when import isn't proven. Readiness and quality scores are
  shown plainly, including when they're low.
- **Rocket-fast to a real artifact.** Every screen drives toward a usable,
  exportable course. Momentum over ceremony; no decorative friction between intent
  and result.
- **Bold at the edges, calm in the cockpit.** The brand is energetic and
  characterful in marketing, loaders, and empty states; the editor itself stays
  legible, low-noise, and focused so instructors can think. This is how we avoid
  *both* sterile-SaaS blandness and neon overstimulation.
- **Earned trust for educators.** The bar is credibility to a skeptical instructor
  or instructional designer. Confident, specific, and reviewable — not toy-like,
  not anonymous-enterprise.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Body text ≥ 4.5:1 against its surface, large/secondary
text ≥ 3:1 — the live risk is muted blue-gray text (`--muted`, `--subtle`) on
tinted dark glass surfaces, which must be verified per surface, not assumed.
Visible focus indicators on every interactive element (the `--focus-ring` token
exists; ensure it is actually applied app-wide). Honor `prefers-reduced-motion`
for all orbital/float/spin/trail motion (already handled in `brand.css`; hold new
motion to the same standard). Never convey state by color alone — pair status
color with text/icon. Touch targets ≥ 44×44px on interactive controls.
