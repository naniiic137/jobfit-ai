import { TAXONOMY, type SkillDef } from './taxonomy';

/** Lower-case, strip accents, unify quotes/dashes. Length is preserved per char where possible. */
export function normalize(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-');
}

export function stripAccents(text: string): string {
  // NFD splits "é" into "e" + combining accent; we then drop the combining marks.
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex that matches a term as a whole "token", where tokens may
 * contain characters like "+", "#", "." and "/" (C++, C#, Node.js, CI/CD).
 * - Not preceded by a letter/digit/+/#/@ or a dot that is glued to a word (".net" in "asp.net").
 * - Not followed by a letter/digit/+/# (so "Java" does not match "JavaScript"),
 *   nor by ".x" (so "node" does not match "node.js" twice), but a sentence-final "." is fine.
 */
function termRegex(term: string, flags: string): RegExp {
  const body = escapeRegex(term).replace(/\\?\s+/g, '[\\s-]+');
  return new RegExp(`(?<![\\p{L}\\p{N}+#@_.])${body}(?![\\p{L}\\p{N}+#_]|[.\\-/][\\p{L}\\p{N}])`, flags);
}

interface CompiledSkill {
  def: SkillDef;
  insensitive: RegExp[];
  sensitive: RegExp[];
}

let compiled: CompiledSkill[] | null = null;

function compile(): CompiledSkill[] {
  if (compiled) return compiled;
  compiled = TAXONOMY.map((def) => {
    const terms = new Set<string>((def.aliases ?? []).map((a) => normalize(a)));
    if (!def.labelIsAmbiguous) terms.add(normalize(def.label));
    return {
      def,
      insensitive: [...terms].map((t) => termRegex(t, 'gu')),
      sensitive: (def.caseSensitive ?? []).map((t) => termRegex(t, 'gu')),
    };
  });
  return compiled;
}

export interface SkillHit {
  id: string;
  /** The text as written in the source (used to mirror the ad's wording). */
  surface: string;
  /** Index in the normalized text. */
  index: number;
}

export interface ExtractedSkill {
  def: SkillDef;
  hits: SkillHit[];
}

/**
 * Find every taxonomy skill mentioned in `text`.
 * Returns one entry per skill (in first-mention order) with all its hits.
 */
export function extractSkills(text: string): ExtractedSkill[] {
  const original = stripAccents(text).replace(/[–—]/g, '-');
  const lower = normalize(text);
  const found = new Map<string, ExtractedSkill>();

  for (const c of compile()) {
    const hits: SkillHit[] = [];
    for (const re of c.insensitive) {
      re.lastIndex = 0;
      for (const m of lower.matchAll(re)) {
        hits.push({ id: c.def.id, index: m.index, surface: original.slice(m.index, m.index + m[0].length) });
      }
    }
    for (const re of c.sensitive) {
      for (const m of original.matchAll(re)) {
        // "Go" at the start of a sentence is almost always the verb; require a tech-ish neighbour.
        if (!looksTechnical(original, m.index, m[0].length)) continue;
        hits.push({ id: c.def.id, index: m.index, surface: m[0] });
      }
    }
    if (hits.length) {
      hits.sort((a, b) => a.index - b.index);
      found.set(c.def.id, { def: c.def, hits });
    }
  }

  return [...found.values()].sort((a, b) => a.hits[0]!.index - b.hits[0]!.index);
}

/** Heuristic for case-sensitive ambiguous words: must sit in a list/tech context. */
function looksTechnical(text: string, index: number, length: number): boolean {
  const before = text.slice(Math.max(0, index - 3), index);
  const after = text.slice(index + length, index + length + 3);
  const sentenceStart = /(^|[.!?]\s+|\n\s*)$/.test(text.slice(Math.max(0, index - 4), index));
  const listy = /[,/(:|•·]\s*$/.test(before) || /^\s*[,/)|]/.test(after) || /^\s*(and|et|or|ou)\s/i.test(after);
  return listy || !sentenceStart;
}

/** Return the full line of `text` that contains character `index`. */
export function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const endIdx = text.indexOf('\n', index);
  return text.slice(start, endIdx === -1 ? text.length : endIdx).trim();
}

/** A short, human-friendly quote around a hit (used as evidence). */
export function snippetAt(text: string, index: number, max = 110): string {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const rawLine = lineAt(text, index);
  const bullet = rawLine.match(/^[-*•·▪◦\s]+/)?.[0].length ?? 0;
  const line = rawLine.slice(bullet);
  if (line.length <= max) return line;
  // Position of the hit inside the cleaned line (the line was trimmed, so re-locate it).
  const leading = text.slice(lineStart).length - text.slice(lineStart).trimStart().length;
  const rel = Math.max(0, index - lineStart - leading - bullet);
  let from = Math.max(0, rel - 30);
  from = Math.min(from, Math.max(0, line.length - max));
  const to = Math.min(line.length, from + max);
  return `${from > 0 ? '…' : ''}${line.slice(from, to).trim()}${to < line.length ? '…' : ''}`;
}

/** Index of the "best" hit to quote: prefer a bullet point over a summary or a skills list. */
export function bestEvidenceIndex(text: string, hits: SkillHit[]): number {
  const bulletHit = hits.find((h) => /^[-*•·▪◦]\s/.test(lineAt(text, h.index)));
  return (bulletHit ?? hits[0]!).index;
}
