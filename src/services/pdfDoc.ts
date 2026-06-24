// ============================================================================
// Minimal, dependency-free PDF document builder
// ----------------------------------------------------------------------------
// A tiny hand-rolled PDF 1.4 writer shared by the course, quiz, answer-key, and
// syllabus PDF exports. Supports two Helvetica weights, text color, horizontal
// rules, drawn bullets with hanging indent, mixed-weight segments (key/value
// rows), centered lines, and a page footer — enough for a polished reading copy
// without any dependency.
//
// All text is reduced to printable ASCII before writing, and the content stream
// is pure ASCII, so the JS string length equals the byte length and the declared
// /Length never desyncs (the Blob serializes as UTF-8).
// ============================================================================

import { stripHtml } from "../utils/text";

export type Rgb = [number, number, number];

export interface PdfSegment {
  text: string;
  bold?: boolean;
  color?: Rgb;
}

export interface PdfLine {
  text: string;
  size: number;
  bold?: boolean;
  color?: Rgb;
  /** Extra x offset from the left margin. */
  indent?: number;
  /** Center the line horizontally. */
  center?: boolean;
  /** Draw a square marker before the text and hang-indent wrapped continuation. */
  bullet?: boolean;
  /** Color for the drawn bullet marker (defaults to the accent). */
  bulletColor?: Rgb;
  /** Render a horizontal rule at this position (text ignored). */
  rule?: boolean;
  ruleColor?: Rgb;
  /** Mixed-weight runs on one line (e.g. a bold label + regular value). */
  segments?: PdfSegment[];
  /** Extra vertical space added after the line. */
  spaceAfter?: number;
}

export interface PdfOptions {
  /** Footer text (a page counter is appended automatically). */
  footer?: string;
}

const PAGE_W = 612;
const PAGE_H = 792;
const PAGE_TOP = 748;
const PAGE_BOTTOM = 64;
const LEFT = 56;
const RIGHT = PAGE_W - 56;
const CONTENT_W = RIGHT - LEFT;

// Brand-ish print palette.
const INK: Rgb = [0.13, 0.16, 0.22];
const HEADING: Rgb = [0.16, 0.2, 0.46];
const MUTED: Rgb = [0.42, 0.46, 0.56];
const RULE: Rgb = [0.82, 0.84, 0.9];
const ACCENT: Rgb = [0.13, 0.45, 0.78];

/** Parse a #rgb / #rrggbb hex color into a 0–1 Rgb triple, or null if unparseable. */
export const hexToRgb = (hex: string): Rgb | null => {
  const value = String(hex || "").trim().replace(/^#/, "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255];
};

const pdfAsciiSafe = (value: string): string =>
  value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[•✓✔→]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");

const pdfEscape = (value: string): string =>
  pdfAsciiSafe(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const lineHeight = (size: number): number => Math.round(size * 1.4) + 2;

// Approx Helvetica advance width (regular ~0.5em, bold ~0.54em average).
const textWidth = (text: string, size: number, bold = false): number => text.length * size * (bold ? 0.54 : 0.5);

const rgb = (c: Rgb): string => `${c[0]} ${c[1]} ${c[2]}`;

/** Greedy word-wrap to the available width (optionally reduced by a hanging indent). */
export const wrap = (text: string, size: number, widthPx: number = CONTENT_W): string[] => {
  const max = Math.max(12, Math.floor(widthPx / (size * 0.5)));
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const words = clean.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      out.push(current);
      current = word.length > max ? word.slice(0, max) : word;
    } else {
      current = candidate.length > max ? candidate.slice(0, max) : candidate;
    }
  }
  if (current) out.push(current);
  return out;
};

// Paginate by accumulated height, then render each page's content stream from the top.
export const createMultiPagePdf = (lines: PdfLine[], options: PdfOptions = {}): string => {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = PAGE_TOP;
  for (const line of lines) {
    const lh = lineHeight(line.size) + (line.spaceAfter ?? 0);
    if (y - lh < PAGE_BOTTOM && current.length) {
      pages.push(current);
      current = [];
      y = PAGE_TOP;
    }
    current.push(line);
    y -= lh;
  }
  if (current.length) pages.push(current);
  if (!pages.length) pages.push([{ text: "", size: 11 }]);

  const renderLine = (line: PdfLine, py: number): string => {
    if (line.rule) {
      const c = line.ruleColor ?? RULE;
      return `${rgb(c)} RG 0.8 w ${LEFT + (line.indent ?? 0)} ${py + 5} m ${RIGHT} ${py + 5} l S`;
    }
    const parts: string[] = [];
    const baseX = LEFT + (line.indent ?? 0);

    if (line.segments && line.segments.length) {
      let x = baseX;
      for (const seg of line.segments) {
        const font = seg.bold ? "/F2" : "/F1";
        parts.push(`${rgb(seg.color ?? INK)} rg BT ${font} ${line.size} Tf ${x} ${py} Td (${pdfEscape(seg.text)}) Tj ET`);
        x += textWidth(seg.text, line.size, seg.bold);
      }
      return parts.join("\n");
    }

    let x = baseX;
    if (line.bullet) {
      parts.push(`${rgb(line.bulletColor ?? ACCENT)} rg ${baseX} ${py + 2} 3 3 re f`);
      x = baseX + 12;
    }
    if (line.center) {
      x = (PAGE_W - textWidth(line.text, line.size, line.bold)) / 2;
    }
    const font = line.bold ? "/F2" : "/F1";
    parts.push(`${rgb(line.color ?? INK)} rg BT ${font} ${line.size} Tf ${x} ${py} Td (${pdfEscape(line.text)}) Tj ET`);
    return parts.join("\n");
  };

  const contentFor = (pageLines: PdfLine[], pageNum: number, pageCount: number): string => {
    let py = PAGE_TOP;
    const parts: string[] = [];
    for (const line of pageLines) {
      parts.push(renderLine(line, py));
      py -= lineHeight(line.size) + (line.spaceAfter ?? 0);
    }
    // Footer: a thin rule + centered "footer · Page X of N".
    const footerText = `${options.footer ? `${options.footer}   ` : ""}Page ${pageNum} of ${pageCount}`;
    const fx = (PAGE_W - textWidth(footerText, 8.5)) / 2;
    parts.push(`${rgb(RULE)} RG 0.6 w ${LEFT} 48 m ${RIGHT} 48 l S`);
    parts.push(`${rgb(MUTED)} rg BT /F1 8.5 Tf ${fx} 36 Td (${pdfEscape(footerText)}) Tj ET`);
    return parts.join("\n");
  };

  // Object graph: 1 Catalog, 2 Pages, 3 Font F1, 4 Font F2, then 2 objects per page.
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  pages.forEach((pageLines, index) => {
    const content = contentFor(pageLines, index + 1, pages.length);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return body;
};

/** Wrap a raw PDF document string in a downloadable Blob. */
export const pdfBlobFrom = (pdf: string): Blob => new Blob([pdf], { type: "application/pdf" });

/**
 * Accumulates typographic lines fluently, then renders a PDF. Keeps the PDF exporters consistent
 * without each re-implementing heading/paragraph/bullet spacing + color.
 */
export class PdfDoc {
  private lines: PdfLine[] = [];
  private footer?: string;
  // Per-document palette: defaults to the brand print colors; theme() overrides with the course theme
  // so an exported PDF matches the course's Canvas pages (headings + rules + bullets pick up the accent).
  private headingColor: Rgb = HEADING;
  private accentColor: Rgb = ACCENT;

  /** Carry the course theme into the PDF: heading = accentDark, rules/bullets = accent. */
  theme(accentHex: string, accentDarkHex?: string): this {
    const accent = hexToRgb(accentHex);
    const heading = accentDarkHex ? hexToRgb(accentDarkHex) : null;
    if (accent) this.accentColor = accent;
    this.headingColor = heading ?? accent ?? this.headingColor;
    return this;
  }

  /** Set a running footer (course/quiz name); a page counter is appended automatically. */
  setFooter(text: string): this {
    this.footer = text;
    return this;
  }

  /** Centered, bold document title with an accent rule beneath it. */
  title(text: string): this {
    this.lines.push({ text: "", size: 8 });
    wrap(text, 24).forEach((part) => this.lines.push({ text: part, size: 24, bold: true, color: this.headingColor, center: true }));
    this.lines.push({ text: "", size: 4, rule: true, ruleColor: this.accentColor, spaceAfter: 4 });
    return this;
  }

  /** A subtitle / eyebrow under the title (centered, muted, caps-ish). */
  subtitle(text: string): this {
    this.lines.push({ text, size: 11, color: MUTED, center: true, spaceAfter: 6 });
    return this;
  }

  /** Section heading: bold, brand color, with a light rule beneath. */
  heading(text: string, size = 15): this {
    this.lines.push({ text: "", size: 8 });
    wrap(text, size).forEach((part) => this.lines.push({ text: part, size, bold: true, color: this.headingColor }));
    this.lines.push({ text: "", size: 2, rule: true, ruleColor: RULE, spaceAfter: 4 });
    return this;
  }

  /** Sub-heading: bold, ink color, modest space above. No rule. */
  subheading(text: string, size = 12.5): this {
    this.lines.push({ text: "", size: 5 });
    wrap(text, size).forEach((part) => this.lines.push({ text: part, size, bold: true, color: INK }));
    return this;
  }

  /** Plain paragraph; HTML is stripped to readable text. */
  para(text: string, size = 11): this {
    const clean = stripHtml(text).replace(/\s+/g, " ").trim();
    if (clean) wrap(clean, size).forEach((part) => this.lines.push({ text: part, size, color: INK }));
    return this;
  }

  /** Muted note paragraph. */
  note(text: string, size = 9.5): this {
    const clean = stripHtml(text).replace(/\s+/g, " ").trim();
    if (clean) wrap(clean, size).forEach((part) => this.lines.push({ text: part, size, color: MUTED }));
    return this;
  }

  /**
   * Render an HTML fragment with basic structure: headings, paragraphs, and list items. Uses a
   * deterministic block-level regex (no DOMParser) so output is identical in the browser and tests.
   */
  html(htmlStr: string): this {
    const src = htmlStr || "";
    const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    let emitted = 0;
    while ((match = re.exec(src)) !== null) {
      const tag = match[1].toLowerCase();
      const text = stripHtml(match[2]).replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (tag === "li") this.bullet(text);
      else if (/^h[1-6]$/.test(tag)) this.subheading(text);
      else this.para(text);
      emitted += 1;
    }
    if (!emitted) {
      const fallback = stripHtml(src).replace(/\s+/g, " ").trim();
      if (fallback) this.para(fallback);
    }
    return this;
  }

  /** Bullet with a drawn marker and hanging indent so wrapped lines align. */
  bullet(text: string, size = 11): this {
    // Strip a leading marker the source text may already carry (hyphen, dash, bullet, or a
    // decorative checkmark/arrow glyph from HTML checklists) so we don't draw a double bullet.
    const clean = stripHtml(text)
      .replace(/\s+/g, " ")
      .replace(/^\s*[-*–—•·▪◦✓✔→]\s*/, "")
      .trim();
    const parts = wrap(clean, size, CONTENT_W - 12);
    parts.forEach((part, index) => {
      this.lines.push(
        index === 0 ? { text: part, size, color: INK, bullet: true, bulletColor: this.accentColor } : { text: part, size, color: INK, indent: 12 }
      );
    });
    return this;
  }

  /** A bold label + regular value on one line (e.g. "Instructor:  Dr. Fisher"). */
  keyValue(label: string, value: string, size = 11): this {
    this.lines.push({
      text: "",
      size,
      segments: [
        { text: `${label}  `, bold: true, color: INK },
        { text: stripHtml(value).replace(/\s+/g, " ").trim(), color: INK }
      ]
    });
    return this;
  }

  /** A horizontal rule. */
  rule(color: Rgb = RULE): this {
    this.lines.push({ text: "", size: 2, rule: true, ruleColor: color, spaceAfter: 4 });
    return this;
  }

  /** Vertical space. */
  spacer(size = 8): this {
    this.lines.push({ text: "", size });
    return this;
  }

  /** Raw line at a given size. */
  raw(text: string, size = 11): this {
    wrap(text, size).forEach((part) => this.lines.push({ text: part, size, color: INK }));
    return this;
  }

  /** A blank answer-writing area: several ruled lines. */
  answerSpace(rows = 4): this {
    for (let i = 0; i < rows; i += 1) {
      this.lines.push({ text: "", size: 12, rule: true, ruleColor: [0.7, 0.72, 0.8], spaceAfter: 10 });
    }
    return this;
  }

  build(): string {
    return createMultiPagePdf(this.lines, { footer: this.footer });
  }

  blob(): Blob {
    return pdfBlobFrom(this.build());
  }
}
