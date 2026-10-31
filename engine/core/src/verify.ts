import { evaluate, type Scope } from './expr.js';
import type { Spec } from './spec.js';

const combos = (s: Spec) => {
  let out: Record<string, number>[] = [{}];
  for (const [k, d] of Object.entries(s.vars)) {
    const vals = [...new Set([d.min, d.value, Math.round((d.min + d.max) / 2), d.max])];
    out = out.flatMap((o) => vals.map((v) => ({ ...o, [k]: v })));
  }
  return out.slice(0, 200);
};

/** Verificador semántico: ¿lo que se ve coincide con lo que se dice? Devuelve la lista de problemas. */
export function verify(s: Spec): string[] {
  const errs: string[] = [];
  const add = (m: string) => { if (errs.length < 6 && !errs.includes(m)) errs.push(m); };
  const num = (e: string, sc: Scope) => Number(evaluate(e, sc));
  const L = (v: Record<string, number>) => ({ ...v, c: 0, r: 0, i: 0, k: 0 });
  for (const b of s.timeline)
    for (const e of [b.say, b.marks.left, b.marks.top])
      for (const m of (e ?? '').matchAll(/"([^"]*)"/g))
        if (/\p{L}/u.test(m[1])) add(`Words are not allowed ("${m[1]}"): symbols and numbers only`);
  for (const v of combos(s)) {
    const tag = JSON.stringify(v);
    for (const c of s.claims) if (!evaluate(c, L(v))) add(`claim is false for ${tag}: ${c}`);
    if (s.solid) {
      const side = num(s.solid.side, L(v));
      if (!Number.isInteger(side) || side < 1 || side > 8) add(`cube side must be an integer 1..8 (${tag})`);
      s.timeline.forEach((b, j) => {
        const l = b.lit ? num(b.lit, L(v)) : 0, f = b.fold ? num(b.fold, L(v)) : 1;
        if (!Number.isInteger(l) || l < 0 || l > 6) add(`beat ${j}: lit must be an integer 0..6`);
        if (!(f >= 0 && f <= 1)) add(`beat ${j}: fold must be within 0..1`);
      });
      continue;
    }
    const cols = num(s.grid!.cols, L(v)), rows = num(s.grid!.rows, L(v));
    if (![cols, rows].every((x) => Number.isInteger(x) && x >= 1 && x <= 30)) { add(`grid sizes must be integers 1..30 (${tag})`); continue; }
    s.timeline.forEach((b, j) => {
      let n = 0, col0 = 0, row0 = 0;
      for (let i = 0; i < cols * rows; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        if (evaluate(b.tiles, { ...v, c, r, i, k: 0 })) { n++; if (c === 0) col0++; if (r === 0) row0++; }
      }
      if (b.shows === undefined) add(`beat ${j}: "shows" (expected number of visible tiles) is required`);
      else { const e = num(b.shows, L(v)); if (e !== n) add(`beat ${j} ${tag}: ${n} tiles are visible but shows=${e}`); }
      if (b.count && b.say) { const q = num(b.say, L(v)); if (q !== n) add(`beat ${j} ${tag}: counted number ${q} ≠ ${n} visible tiles`); }
      if (b.marks.left !== undefined && col0) { const m = num(b.marks.left, L(v)); if (m !== col0) add(`beat ${j} ${tag}: left mark ${m} ≠ ${col0} visible tiles in the first column`); }
      if (b.marks.top !== undefined && row0) { const m = num(b.marks.top, L(v)); if (m !== row0) add(`beat ${j} ${tag}: top mark ${m} ≠ ${row0} visible tiles in the first row`); }
    });
  }
  return errs;
}
