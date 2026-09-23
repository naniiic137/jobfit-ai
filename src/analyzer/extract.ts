import { IMPLIES, TAXONOMY, TAXONOMY_BY_ID, type SkillDef } from './taxonomy';

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

const BEFORE = String.raw`(?<![\p{L}\p{N}+#@_.])`;
const AFTER = String.raw`(?![\p{L}\p{N}+#_]|[.\-/][\p{L}\p{N}])`;
/** Versioned names may be followed by "-4o" / ".5" / " 3" ("GPT-4o", "Llama 3.1"). */
const AFTER_VERSIONED = String.raw`(?![\p{L}\p{N}+#_]|[.\-/]\p{L})`;

/** Regex source for one term; spaces also match hyphens ("full stack" ~ "full-stack"). */
function termBody(term: string): string {
  return escapeRegex(term).replace(/\s+/g, String.raw`[\s-]+`);
}

/** The key used to map a matched surface back to its term. */
function collapse(s: string): string {
  return normalize(s).replace(/[\s-]+/g, ' ');
}

/**
 * Tokens may contain characters like "+", "#", "." and "/" (C++, C#, Node.js, CI/CD).
 * - Not preceded by a letter/digit/+/#/@ or a dot that is glued to a word (".net" in "asp.net").
 * - Not followed by a letter/digit/+/# (so "Java" does not match "JavaScript"),
 *   nor by ".x" (so "node" does not match "node.js" twice), but a sentence-final "." is fine.
 */
function termRegex(term: string, flags: string, versioned = false): RegExp {
  return new RegExp(`${BEFORE}${termBody(term)}${versioned ? AFTER_VERSIONED : AFTER}`, flags);
}

interface Compiled {
  /** Every case-insensitive term of every skill in ONE alternation, longest first. */
  insensitive: RegExp;
  byTerm: Map<string, SkillDef[]>;
  sensitive: Array<{ def: SkillDef; re: RegExp; acronym: boolean }>;
}

let compiled: Compiled | null = null;
const variantSets = new Map<string, Set<string>>();

/**
 * One big regex instead of hundreds of small ones: much faster, and because
 * alternatives are tried longest-first, a longer term wins at each position
 * ("github actions" before "github").
 */
function compile(): Compiled {
  if (compiled) return compiled;
  const byTerm = new Map<string, SkillDef[]>();
  const sensitive: Compiled['sensitive'] = [];
  for (const def of TAXONOMY) {
    const terms = new Set<string>([...(def.aliases ?? []), ...(def.variants ?? [])].map((a) => normalize(a)));
    if (!def.labelIsAmbiguous) terms.add(normalize(def.label));
    for (const t of terms) {
      const key = collapse(t);
      const defs = byTerm.get(key) ?? [];
      if (!defs.includes(def)) defs.push(def);
      byTerm.set(key, defs);
    }
    for (const t of def.caseSensitive ?? []) {
      sensitive.push({ def, re: termRegex(t, 'gu', def.versioned), acronym: /^[A-Z]{3,}$/.test(t) });
    }
  }
  const alternatives = [...byTerm.keys()].sort((a, b) => b.length - a.length).map(termBody);
  compiled = { insensitive: new RegExp(`${BEFORE}(?:${alternatives.join('|')})${AFTER}`, 'gu'), byTerm, sensitive };
  return compiled;
}

/**
 * Normalized spellings that are pure variants of a skill's name (its label and
 * `variants`, never its aliases). Rewriting one of these into another is only
 * a spelling change; rewriting anything else could change the product.
 */
export function spellingsOf(id: string): ReadonlySet<string> {
  let set = variantSets.get(id);
  if (!set) {
    const def = TAXONOMY_BY_ID.get(id);
    set = new Set(def ? [def.label, ...(def.variants ?? [])].map(collapse) : []);
    variantSets.set(id, set);
  }
  return set;
}

/** True when `surface` is just a spelling of skill `id` ("ReactJS" for React), not an alias ("Java 17"). */
export function isSpellingOf(id: string, surface: string): boolean {
  return spellingsOf(id).has(collapse(surface));
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

export interface ExtractOptions {
  /**
   * Skip the context checks for ambiguous words. Use it for short labels such
   * as a skill name returned by an LLM ("Go", "Claude"), never for free text.
   */
  loose?: boolean;
}

/**
 * Find every taxonomy skill mentioned in `text`.
 * Returns one entry per skill (in first-mention order) with all its hits.
 * When two skills overlap, the longer mention wins: "GitHub Actions" is the
 * CI/CD tool, not also "GitHub"; "React Native" is not also "React".
 */
export function extractSkills(text: string, opts: ExtractOptions = {}): ExtractedSkill[] {
  const original = stripAccents(text).replace(/[–—]/g, '-');
  const lower = normalize(text);
  const all: Array<SkillHit & { def: SkillDef; end: number }> = [];

  const c = compile();
  for (const m of lower.matchAll(c.insensitive)) {
    const surface = original.slice(m.index, m.index + m[0].length);
    for (const def of c.byTerm.get(collapse(m[0])) ?? []) {
      all.push({ id: def.id, def, index: m.index, end: m.index + m[0].length, surface });
    }
  }
  for (const { def, re, acronym } of c.sensitive) {
    for (const m of original.matchAll(re)) {
      if (!opts.loose) {
        if (def.context) {
          if (!hasContext(original, m.index, m[0].length, def.context)) continue;
        } else if (!acronym && !looksTechnical(original, m.index, m[0].length)) {
          // "Go" at the start of a sentence is almost always the verb; require a tech-ish neighbour.
          continue;
        }
      }
      all.push({ id: def.id, def, index: m.index, end: m.index + m[0].length, surface: m[0] });
    }
  }

  const kept = all.filter(
    (h) => !all.some((o) => o.id !== h.id && o.index <= h.index && o.end >= h.end && o.end - o.index > h.end - h.index),
  );

  const found = new Map<string, ExtractedSkill>();
  for (const h of kept) {
    const entry = found.get(h.id) ?? { def: h.def, hits: [] };
    entry.hits.push({ id: h.id, index: h.index, surface: h.surface });
    found.set(h.id, entry);
  }
  for (const e of found.values()) e.hits.sort((a, b) => a.index - b.index);
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

/**
 * Names such as "Claude" or "Gemini" only count when the same line talks about
 * AI (API, model, LLM…) or the name carries a version ("GPT-4o", "Llama 3").
 */
function hasContext(text: string, index: number, length: number, context: RegExp): boolean {
  if (/^[\s-]?\d/.test(text.slice(index + length, index + length + 2))) return true;
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const endIdx = text.indexOf('\n', index);
  const line = text.slice(start, endIdx === -1 ? text.length : endIdx);
  const rel = index - start;
  const rest = `${line.slice(0, rel)} ${line.slice(rel + length)}`;
  return context.test(rest);
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

/** "Amel Karray", "Jean-Luc Picard": 2–4 capitalised words, nothing else. */
export function looksLikeName(line: string): boolean {
  const l = line.trim();
  return l.length <= 40 && /^[\p{Lu}][\p{L}'-]+(\s+[\p{L}'-]+){1,3}$/u.test(l);
}

const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
// Bare domains need a common TLD. "socket.io" and "character.ai" are tech
// names, so .io/.ai only count with a path, a scheme or "www.".
const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s,;·|]+|\b(?:[\p{L}\p{N}-]+\.)+(?:com|org|net|dev|me|app|fr|tn|co|be|ca|de|uk|info|page)\b(?:\/[^\s,;·|]*)?|\b(?:[\p{L}\p{N}-]+\.)+(?:io|ai)\/[^\s,;·|]*/giu;

/**
 * Blank out the parts of a CV that are about the person, not their skills:
 * the name line at the top, e-mail addresses and URLs ("github.com/claude-dev").
 * Replaced with spaces so every index still maps to the original text.
 */
export function maskPersonalInfo(cv: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  let out = cv.replace(EMAIL_RE, blank).replace(URL_RE, blank);
  const firstLine = out.match(/^\s*([^\n]*)/);
  if (firstLine && looksLikeName(firstLine[1]!)) {
    const start = firstLine[0].length - firstLine[1]!.length;
    out = out.slice(0, start) + blank(firstLine[1]!) + out.slice(start + firstLine[1]!.length);
  }
  return out;
}

/** Skills of a CV, ignoring its header (name, e-mail, links). */
export function extractCvSkills(cv: string): ExtractedSkill[] {
  return extractSkills(maskPersonalInfo(cv));
}

/**
 * Skills found in the CV, plus skills they imply (MySQL ⇒ SQL). An implied
 * skill reuses the hits of the skill that proves it, so its evidence quote is real.
 */
export function cvSkillMap(cv: string): Map<string, ExtractedSkill> {
  const map = new Map(extractCvSkills(cv).map((s) => [s.def.id, s]));
  // Follow implications transitively (NestJS ⇒ TypeScript ⇒ JavaScript).
  const queue = [...map.keys()];
  while (queue.length) {
    const id = queue.shift()!;
    const ex = map.get(id)!;
    for (const impliedId of IMPLIES[id] ?? []) {
      const def = TAXONOMY_BY_ID.get(impliedId);
      if (def && !map.has(impliedId)) {
        map.set(impliedId, { def, hits: ex.hits });
        queue.push(impliedId);
      }
    }
  }
  return map;
}
