import { evaluate } from '../../../engine/core/src/expr.js';
import { inspect, defaults, type Spec } from '../../../engine/core/src/spec.js';
import { EXAMPLES } from './examples.js';

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required });
const fn = (name: string, description: string, parameters: unknown) => ({ type: 'function', function: { name, description, parameters } });
const SPEC = { type: 'object', description: 'The experience spec', additionalProperties: true };

export const TOOLS = [
  fn('example', 'Get a complete, valid example spec. ids: square-root, rectangle-area (2D grid), cube-area (3D cube).', obj({ id: { type: 'string' } }, ['id'])),
  fn('calc', 'Exact arithmetic: numbers and + - * / % ( ) only. Use it to double-check every number you plan to show.', obj({ expression: { type: 'string' } }, ['expression'])),
  fn('preview', 'Render a draft spec as text: every beat as an ASCII grid (# visible, . hidden) plus marks and symbols, using default variable values. LOOK at it before submitting.', obj({ spec: SPEC }, ['spec'])),
  fn('check', 'Run the verifier on a draft spec: schema, expressions, symbols-only language, claims, and whether what is visible matches what is said/marked. Returns OK or the list of problems.', obj({ spec: SPEC }, ['spec'])),
  fn('submit', 'Submit the FINAL spec. Only accepted if the verifier passes; otherwise the problems are returned so you can fix them.', obj({ spec: SPEC }, ['spec'])),
  fn('cannot_represent', 'Use when the concept cannot be shown truthfully with a unit-square grid or a cube.', obj({ reason: { type: 'string' } }, ['reason'])),
];

const asSpec = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);

function preview(spec: Spec): string {
  const v = defaults(spec), out: string[] = [`vars ${JSON.stringify(v)}`];
  const val = (e?: string) => (e ? String(evaluate(e, { ...v, c: 0, r: 0, i: 0, k: 0 })) : '-');
  const cols = spec.grid ? Number(val(spec.grid.cols)) : 0, rows = spec.grid ? Number(val(spec.grid.rows)) : 0;
  spec.timeline.forEach((b, j) => {
    out.push(`beat ${j}: say=${val(b.say)} left=${val(b.marks.left)} top=${val(b.marks.top)}${b.count ? ' (counts tiles)' : ''}${b.accent ? ' (accent)' : ''}`);
    if (spec.solid) out.push(`  cube side=${val(spec.solid.side)} fold=${val(b.fold)} litFaces=${val(b.lit)}`);
    else for (let r = 0; r < rows; r++) {
      let line = '  ';
      for (let c = 0; c < cols; c++) line += evaluate(b.tiles, { ...v, c, r, i: r * cols + c, k: 0 }) ? '# ' : '. ';
      out.push(line);
    }
  });
  return out.join('\n');
}

export type ToolResult = { text: string; done?: Spec; unsupported?: boolean };

export function runTool(name: string, args: any): ToolResult {
  try {
    if (name === 'example') return { text: JSON.stringify(EXAMPLES[args.id] ?? `unknown id; use: ${Object.keys(EXAMPLES).join(', ')}`) };
    if (name === 'calc') return { text: String(evaluate(String(args.expression), {})) };
    if (name === 'cannot_represent') return { text: '', unsupported: true };
    const r = inspect(asSpec(args.spec));
    if (name === 'check') return { text: r.errors.length ? 'PROBLEMS:\n' + r.errors.join('\n') : 'OK' };
    if (name === 'preview') return { text: r.spec ? preview(r.spec) + (r.errors.length ? '\nPROBLEMS:\n' + r.errors.join('\n') : '') : 'PROBLEMS:\n' + r.errors.join('\n') };
    if (name === 'submit') return r.errors.length || !r.spec ? { text: 'REJECTED:\n' + r.errors.join('\n') } : { text: 'accepted', done: r.spec };
    return { text: `unknown tool ${name}` };
  } catch (e) { return { text: `tool error: ${String(e).slice(0, 200)}` }; }
}
