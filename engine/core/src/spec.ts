import { z } from 'zod';
import { evaluate } from './expr.js';
import { verify } from './verify.js';

/** Un "beat" es un instante de la experiencia: qué cuadritos se ven, qué medidas y qué se dice. */
export const Beat = z.object({
  tiles: z.string().default('true'),                      // predicado sobre c (columna), r (fila), i (índice) y variables
  marks: z.object({ left: z.string().optional(), top: z.string().optional() }).default({}),
  say: z.string().optional(),              // expresión mostrada como lenguaje simbólico
  shows: z.string().optional(),            // nº esperado de cuadritos visibles (verificación)
  fold: z.string().optional(),             // cubo: 0 = desplegado … 1 = cerrado
  lit: z.string().optional(),              // cubo: caras encendidas 0..6
  count: z.boolean().default(false),       // enciende los cuadritos uno a uno contándolos
  accent: z.boolean().default(false),      // resalta el resultado
  ms: z.number().default(2000),
});

export const Spec = z.object({
  id: z.string(),
  version: z.literal(1),
  vars: z.record(z.object({ min: z.number(), max: z.number(), value: z.number() })),
  grid: z.object({ cols: z.string(), rows: z.string() }).optional(),
  solid: z.object({ kind: z.literal('cube'), side: z.string() }).optional(),
  claims: z.array(z.string()).default([]),   // verdades matemáticas que deben cumplirse para todo valor
  timeline: z.array(Beat).min(1),
}).refine((s) => !!s.grid !== !!s.solid, 'Exactly one of grid or solid');

export type Beat = z.infer<typeof Beat>;
export type Spec = z.infer<typeof Spec>;

export const defaults = (s: Spec) =>
  Object.fromEntries(Object.entries(s.vars).map(([k, v]) => [k, v.value])) as Record<string, number>;

/** Forma (Zod) + expresiones + verificación semántica. Nunca lanza: devuelve los errores. */
export function inspect(raw: unknown): { spec?: Spec; errors: string[] } {
  let s: Spec;
  try {
    s = Spec.parse(raw);
    for (const k of Object.keys(s.vars)) if (['c', 'r', 'i', 'k'].includes(k)) throw new Error(`Reserved variable: ${k}`);
    const sc = { ...defaults(s), c: 0, r: 0, i: 0, k: 0 };
    if (s.grid) { evaluate(s.grid.cols, sc); evaluate(s.grid.rows, sc); }
    if (s.solid) evaluate(s.solid.side, sc);
    for (const b of s.timeline) for (const e of [b.tiles, b.say, b.marks.left, b.marks.top, b.shows, b.fold, b.lit]) if (e) evaluate(e, sc);
  } catch (e) { return { errors: [String(e).slice(0, 400)] }; }
  try { return { spec: s, errors: verify(s) }; } catch (e) { return { spec: s, errors: [String(e).slice(0, 300)] }; }
}

export function parseSpec(raw: unknown): Spec {
  const r = inspect(raw);
  if (r.errors.length || !r.spec) throw new Error(r.errors.join('; '));
  return r.spec;
}
