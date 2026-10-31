import { parseSpec, type Spec } from '@engine/core';
import squareRoot from './mathematics/square-roots/spec.json';
import rectangle from './mathematics/arithmetic/rectangle-area/spec.json';

export type Entry = { domain: string; glyph: string; spec: Spec };

/** Registro de la biblioteca: cada entrada es una especificación validada. */
export const LIBRARY: Entry[] = [
  { domain: 'mathematics', glyph: '√', spec: parseSpec(squareRoot) },
  { domain: 'mathematics', glyph: '▭', spec: parseSpec(rectangle) },
];
