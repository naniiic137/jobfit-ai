import { normalize } from './extract';

export type SectionKind = 'intro' | 'required' | 'nice' | 'responsibilities' | 'company' | 'benefits' | 'other';

export interface JobSection {
  kind: SectionKind;
  heading: string | null;
  /** Character offsets in the original text, [start, end). */
  start: number;
  end: number;
}

// Patterns are matched against normalized (lower-case, accent-free) heading text.
const HEADING_PATTERNS: Array<[SectionKind, RegExp]> = [
  ['nice', /\b(nice[\s-]to[\s-]have|bonus( points)?|pluses|a plus|preferred|good to have|would be a plus|atouts?|serait un plus|souhaite(e|s)?|apprecie(e|s)?|optionnel|desirable)\b/],
  ['required', /\b(requirements?|required|must[\s-]haves?|qualifications?|what you (bring|have|need)|who you are|you have|your profile|skills|competences?( requises| techniques)?|profil( recherche)?|votre profil|exigences|prerequis|pre-requis|we are looking for|nous recherchons|ce que nous attendons|stack technique|tech stack|technologies?)\b/],
  ['responsibilities', /\b(responsibilit(y|ies)|what you('| wi)ll do|your role|the role|role|missions?|vos missions|taches|day[\s-]to[\s-]day|what you will be doing|job description|description du poste|le poste)\b/],
  ['benefits', /\b(benefits|perks|what we offer|we offer|nous offrons|avantages|salary|salaire|remuneration|why join)\b/],
  ['company', /\b(about (us|the company|the team)|who we are|a propos|qui sommes[\s-]nous|l'entreprise|notre entreprise|company)\b/],
];

/** Inline markers that downgrade a single line to "nice to have". */
const NICE_INLINE = /\b(nice[\s-]to[\s-]have|is a (big )?plus|are a plus|a plus\b|bonus|preferred|ideally|would be (great|nice|appreciated)|serait un (vrai )?plus|est un plus|un atout|apprecie(e|s)?|souhaite(e|s)?|idealement|optionnel)\b/;
/** Inline markers that upgrade a line to "required". */
const REQUIRED_INLINE = /\b(required|must|mandatory|essential|obligatoire|indispensable|exige|requis(e|es)?|you (have|need)|strong|solid)\b/;

/**
 * Decide whether a line looks like a section heading and what kind it is.
 * A heading is short, not a bullet sentence, and often ends with ":" or is
 * written in Title/UPPER case or markdown (#, **).
 */
export function classifyHeading(line: string): SectionKind | null {
  const raw = line.trim();
  if (!raw || raw.length > 70) return null;
  const isBullet = /^[-*•·▪◦]\s|^\d+[.)]\s/.test(raw);
  const stripped = raw.replace(/^#+\s*|^\*\*|\*\*:?$|:$/g, '').replace(/\*\*/g, '').trim();
  const looksLikeHeading =
    /:$|\*\*:?$/.test(raw) || /^#+\s/.test(raw) || /^\*\*/.test(raw) ||
    (stripped.split(/\s+/).length <= 6 && !/[.;!?]$/.test(stripped));
  if (!looksLikeHeading || (isBullet && !/:$/.test(raw))) return null;
  // "Company: Nimbus Labs" or "Location: Tunis" are key/value lines, not headings.
  if (/:\s*\S/.test(stripped)) return null;
  const n = normalize(stripped);
  for (const [kind, re] of HEADING_PATTERNS) {
    if (re.test(n)) return kind;
  }
  return null;
}

export function detectSections(text: string): JobSection[] {
  const sections: JobSection[] = [];
  let current: JobSection = { kind: 'intro', heading: null, start: 0, end: text.length };
  let offset = 0;
  for (const line of text.split('\n')) {
    const kind = classifyHeading(line);
    if (kind) {
      current.end = offset;
      if (current.end > current.start || current.heading) sections.push(current);
      current = { kind, heading: line.trim().replace(/[:*#]+/g, '').trim(), start: offset, end: text.length };
    }
    offset += line.length + 1;
  }
  current.end = text.length;
  sections.push(current);
  return sections;
}

export function sectionAt(sections: JobSection[], index: number): JobSection {
  return sections.find((s) => index >= s.start && index < s.end) ?? sections[sections.length - 1]!;
}

/**
 * Importance of a mention at a given line, combining the section it lives in
 * with inline markers ("... is a plus"). Returns null when the mention should
 * be ignored (e.g. perks: "free Udemy courses on Docker" is not a requirement).
 */
export function importanceFor(kind: SectionKind, line: string): 'required' | 'nice' | null {
  const n = normalize(line);
  if (NICE_INLINE.test(n)) return 'nice';
  switch (kind) {
    case 'nice':
      return 'nice';
    case 'benefits':
      return null;
    case 'company':
      // Tech mentioned in "about us" hints at the stack but is not a hard requirement.
      return REQUIRED_INLINE.test(n) ? 'required' : 'nice';
    default:
      return 'required';
  }
}
