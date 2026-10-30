import { z } from 'zod';
import { evaluate } from './expr';

/** Un "beat" es un instante de la experiencia: qué cuadritos se ven, qué medidas y qué se dice. */
export const Beat = z.object({
  tiles: z.string(),                       // predicado sobre c (columna), r (fila), i (índice) y variables
  marks: z.object({ left: z.string().optional(), top: z.string().optional() }).default({}),
  say: z.string().optional(),              // expresión mostrada como lenguaje simbólico
  count: z.boolean().default(false),       // enciende los cuadritos uno a uno contándolos
  accent: z.boolean().default(false),      // resalta el resultado
  ms: z.number().default(2000),
});

export const Spec = z.object({
  id: z.string(),
  version: z.literal(1),
  vars: z.record(z.object({ min: z.number(), max: z.number(), value: z.number() })),
  grid: z.object({ cols: z.string(), rows: z.string() }),
  timeline: z.array(Beat).min(1),
});

export type Beat = z.infer<typeof Beat>;
export type Spec = z.infer<typeof Spec>;

export const defaults = (s: Spec) =>
  Object.fromEntries(Object.entries(s.vars).map(([k, v]) => [k, v.value])) as Record<string, number>;

/** Valida forma (Zod) y que todas las expresiones se puedan evaluar con los valores por defecto. */
export function parseSpec(raw: unknown): Spec {
  const s = Spec.parse(raw);
  for (const k of Object.keys(s.vars))
    if (['c', 'r', 'i', 'k'].includes(k)) throw new Error(`Variable reservada: ${k}`);
  const sc = { ...defaults(s), c: 0, r: 0, i: 0, k: 0 };
  evaluate(s.grid.cols, sc); evaluate(s.grid.rows, sc);
  for (const b of s.timeline) {
    evaluate(b.tiles, sc);
    for (const e of [b.say, b.marks.left, b.marks.top]) if (e) evaluate(e, sc);
  }
  return s;
}
