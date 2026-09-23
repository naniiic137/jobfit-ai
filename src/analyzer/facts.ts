import { looksLikeName, normalize } from './extract';

const BULLET_RE = /^\s*([-*•·▪◦►]|\d+[.)])\s+/;

export interface CvFacts {
  name: string | null;
  bullets: string[];
  /** Lines that look like project names/descriptions. */
  projects: string[];
  /** Approximate total years of professional experience, if it can be read. */
  years: number | null;
}

export interface JobFacts {
  title: string | null;
  company: string | null;
  minYears: number | null;
}

export function cvFacts(cv: string, now = new Date()): CvFacts {
  const lines = cv.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? '';
  const name = looksLikeName(first) ? first : null;

  const bullets = lines.filter((l) => BULLET_RE.test(l)).map((l) => l.replace(BULLET_RE, '').trim()).filter((l) => l.length >= 25);

  const projects: string[] = [];
  let inProjects = false;
  for (const l of lines) {
    const n = normalize(l);
    if (/^(personal |side |academic )?projects?:?$|^projets?( personnels| academiques)?:?$/.test(n)) {
      inProjects = true;
      continue;
    }
    if (inProjects && /^[\p{Lu}\s&]{4,}:?$/u.test(l) && !BULLET_RE.test(l)) inProjects = false; // next UPPERCASE heading
    if (inProjects && l.length > 3) projects.push(l.replace(BULLET_RE, ''));
  }

  return { name, bullets, projects, years: estimateYears(cv, now) };
}

/**
 * Explicit "3 years of experience" wins; otherwise sum date ranges like
 * "2022 – 2024" or "03/2023 - Present". Returns null when nothing is found.
 */
export function estimateYears(cv: string, now = new Date()): number | null {
  const n = normalize(cv);
  const explicit = n.match(/(\d{1,2})\+?\s*(years?|yrs|ans|annees)\s+(of\s+)?(professional\s+)?(experience|d'experience|de experience)/);
  if (explicit) return Number(explicit[1]);

  const range = /(?:(\d{1,2})\/)?((?:19|20)\d{2})\s*(?:-|to|a|au)\s*(?:(\d{1,2})\/)?((?:19|20)\d{2}|present|now|current|today|aujourd'hui|actuel|en cours)/g;
  let months = 0;
  for (const m of experienceBlock(n).matchAll(range)) {
    const startY = Number(m[2]);
    const startM = m[1] ? Number(m[1]) : 1;
    const isOpen = !/^\d/.test(m[4]!);
    const endY = isOpen ? now.getFullYear() : Number(m[4]);
    const endM = isOpen ? now.getMonth() + 1 : m[3] ? Number(m[3]) : startM;
    let span = (endY - startY) * 12 + (endM - startM);
    if (span === 0 && !isOpen) span = 6; // "2023 - 2023": count half a year
    if (span > 0 && span < 12 * 45) months += span;
  }
  return months > 0 ? Math.round((months / 12) * 10) / 10 : null;
}

/**
 * Only date ranges under an "Experience" heading count (education dates would
 * otherwise inflate the total). Falls back to the whole CV when no heading exists.
 */
function experienceBlock(normalizedCv: string): string {
  const lines = normalizedCv.split('\n');
  const isHeading = (l: string) => l.trim().length > 0 && l.trim().length < 45 && !BULLET_RE.test(l);
  const start = lines.findIndex((l) => isHeading(l) && /^(work |professional )?experiences?( professionnelles?)?:?$|^work history:?$|^employment:?$|^parcours professionnel:?$/.test(l.trim()));
  if (start === -1) return normalizedCv;
  const endRel = lines.slice(start + 1).findIndex((l) => isHeading(l) && /^(education|formation|projects?|projets?|skills|competences|certifications?|languages|langues|interests|centres d'interet)\b/.test(l.trim()));
  return lines.slice(start + 1, endRel === -1 ? undefined : start + 1 + endRel).join('\n');
}

export function jobFacts(job: string): JobFacts {
  const lines = job.split('\n').map((l) => l.trim()).filter(Boolean);
  let title: string | null = null;
  let company: string | null = null;

  for (const l of lines.slice(0, 12)) {
    const kv = l.match(/^(?:\*\*)?(job title|title|position|poste|intitule du poste|role)(?:\*\*)?\s*:\s*(.+)$/i);
    if (kv && !title) title = kv[2]!.trim();
    const co = l.match(/^(?:\*\*)?(company|entreprise|societe|employer|employeur)(?:\*\*)?\s*:\s*(.+)$/i);
    if (co && !company) company = co[2]!.trim();
  }
  if (!title && lines[0] && lines[0].length <= 90) {
    // "Junior Full-Stack Developer at Nimbus Labs" / "Développeur React – Acme (Tunis)"
    const head = lines[0].replace(/^#+\s*/, '');
    const at = head.match(/^(.+?)\s+(?:at|@|chez)\s+(.+?)(?:\s*[(|–-].*)?$/i);
    const dash = head.match(/^(.+?)\s+[–|-]\s+(.+?)(?:\s*[(|].*)?$/);
    if (at) {
      title = at[1]!.trim();
      company ??= at[2]!.trim();
    } else if (dash) {
      title = dash[1]!.trim();
      company ??= dash[2]!.trim();
    } else {
      title = head.trim();
    }
  }

  const years = normalize(job).match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs|ans|annees)\b[^.\n]{0,40}(experience|d'experience)/);
  return { title: clean(title), company: clean(company), minYears: years ? Number(years[1]) : null };
}

function clean(s: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 120) : null;
}
