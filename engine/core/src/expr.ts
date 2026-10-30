export type Scope = Record<string, number>;
const cache = new Map<string, (...a: number[]) => unknown>();

/** Evaluador restringido para expresiones de especificaciones (v0). Solo variables del alcance. */
export function evaluate(src: string, scope: Scope): number | string | boolean {
  const names = Object.keys(scope);
  const bare = src.replace(/"[^"]*"/g, '""');
  if (/[`\[\]{};\\]/.test(bare)) throw new Error(`Expresión no permitida: ${src}`);
  for (const id of bare.match(/[A-Za-z_$][\w$]*/g) ?? [])
    if (!names.includes(id) && id !== 'true' && id !== 'false')
      throw new Error(`Identificador desconocido «${id}» en: ${src}`);
  const key = names.join(',') + '|' + src;
  let fn = cache.get(key);
  if (!fn) {
    fn = new Function(...names, `"use strict"; return (${src});`) as (...a: number[]) => unknown;
    cache.set(key, fn);
  }
  return fn(...names.map((k) => scope[k])) as number | string | boolean;
}
