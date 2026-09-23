import { describe, expect, it } from 'vitest';
import { buildContext } from './offline';
import { GOLDEN } from './golden.fixtures';

const NOW = new Date('2026-09-23T10:00:00Z');

interface Counts {
  tp: number;
  fp: number;
  fn: number;
  importanceOk: number;
  matchTp: number;
  matchFp: number;
  matchFn: number;
}

const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(7);

/**
 * Golden-set evaluation of the offline analyzer.
 * - Extraction: which skills the ad asks for (precision / recall on skill ids).
 * - Importance: required vs nice-to-have, on correctly extracted skills.
 * - Matching: "the CV proves it" claims. Precision here is the honesty metric:
 *   every false positive is experience the tool would wrongly credit.
 */
function evaluate() {
  const total: Counts = { tp: 0, fp: 0, fn: 0, importanceOk: 0, matchTp: 0, matchFp: 0, matchFn: 0 };
  const rows: string[] = [];
  const errors: string[] = [];
  for (const c of GOLDEN) {
    const ctx = buildContext(c.cv, c.job, c.lang, NOW);
    const n: Counts = { tp: 0, fp: 0, fn: 0, importanceOk: 0, matchTp: 0, matchFp: 0, matchFn: 0 };
    const predicted = new Map(ctx.jobSkills.map((s) => [s.id, s]));
    for (const [id, s] of predicted) {
      const exp = c.expected[id];
      const inCv = ctx.cvSkills.has(id);
      if (!exp) {
        n.fp++;
        errors.push(`${c.name}: extra skill ${id}`);
        if (inCv) n.matchFp++;
        continue;
      }
      n.tp++;
      if (exp[0] === s.importance) n.importanceOk++;
      else errors.push(`${c.name}: ${id} is ${s.importance}, expected ${exp[0]}`);
      if (inCv && exp[1]) n.matchTp++;
      else if (inCv && !exp[1]) {
        n.matchFp++;
        errors.push(`${c.name}: ${id} wrongly credited to the CV`);
      } else if (!inCv && exp[1]) {
        n.matchFn++;
        errors.push(`${c.name}: ${id} missed in the CV`);
      }
    }
    for (const [id, [, inCv]] of Object.entries(c.expected)) {
      if (predicted.has(id)) continue;
      n.fn++;
      if (inCv) n.matchFn++;
      if (!id.startsWith('x:')) errors.push(`${c.name}: missed skill ${id}`);
    }
    for (const k of Object.keys(total) as Array<keyof Counts>) total[k] += n[k];
    rows.push(
      `${c.name.padEnd(38)} ${pct(ratio(n.tp, n.tp + n.fp))} ${pct(ratio(n.tp, n.tp + n.fn))} ${pct(ratio(n.importanceOk, n.tp))} ${pct(ratio(n.matchTp, n.matchTp + n.matchFp))} ${pct(ratio(n.matchTp, n.matchTp + n.matchFn))}`,
    );
  }
  const metrics = {
    precision: ratio(total.tp, total.tp + total.fp),
    recall: ratio(total.tp, total.tp + total.fn),
    importance: ratio(total.importanceOk, total.tp),
    matchPrecision: ratio(total.matchTp, total.matchTp + total.matchFp),
    matchRecall: ratio(total.matchTp, total.matchTp + total.matchFn),
  };
  const header = `${'case'.padEnd(38)} ${'ext P'.padStart(7)} ${'ext R'.padStart(7)} ${'import'.padStart(7)} ${'match P'.padStart(7)} ${'match R'.padStart(7)}`;
  const overall = `${'ALL (micro-average)'.padEnd(38)} ${pct(metrics.precision)} ${pct(metrics.recall)} ${pct(metrics.importance)} ${pct(metrics.matchPrecision)} ${pct(metrics.matchRecall)}`;
  const report = [
    'Golden set — offline analyzer',
    header,
    ...rows,
    '-'.repeat(header.length),
    overall,
    `(${total.tp + total.fn} labelled skills; recall counts ${Object.values(GOLDEN).flatMap((c) => Object.keys(c.expected)).filter((k) => k.startsWith('x:')).length} skills outside the taxonomy as misses)`,
    ...(errors.length ? ['', 'Differences:', ...errors.map((e) => `  - ${e}`)] : []),
  ].join('\n');
  return { metrics, report, errors };
}

describe('golden set', () => {
  const { metrics, report } = evaluate();

  it('prints precision / recall', () => {
    // Printed on purpose so the numbers show up in the test output and CI logs.
    console.log(`\n${report}\n`);
    expect(report).toContain('ALL (micro-average)');
  });

  it('never credits a skill the CV does not prove (match precision = 100%)', () => {
    expect(metrics.matchPrecision).toBe(1);
  });

  it('keeps extraction quality above the regression floor', () => {
    expect(metrics.precision).toBeGreaterThanOrEqual(0.95);
    expect(metrics.recall).toBeGreaterThanOrEqual(0.85);
    expect(metrics.importance).toBeGreaterThanOrEqual(0.9);
    expect(metrics.matchRecall).toBeGreaterThanOrEqual(0.9);
  });
});
