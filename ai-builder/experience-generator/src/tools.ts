import { evaluate } from '../../../engine/core/src/expr.js';
import { inspect, defaults, type Spec } from '../../../engine/core/src/spec.js';
import { EXAMPLES } from './examples.js';

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required });
const fn = (name: string, description: string, parameters: unknown) => ({ type: 'function', function: { name, description, parameters } });
const SPEC = { type: 'object', description: 'The experience spec as a JSON object' };

export const TOOLS = [
  fn('example', 'Get another complete, valid example spec (the rectangle-area one is already in your instructions). ids: square-root, rectangle-area (2D grid), cube-area (3D cube).', obj({ id: { type: 'string' } }, ['id'])),
  fn('calc', 'Exact arithmetic.', obj({ expression: { type: 'string' } }, ['expression'])),
  fn('preview', 'Show a draft as ASCII per beat (# visible, . hidden) with marks and symbols.', obj({ spec: SPEC }, ['spec'])),
  fn('check', 'Verify a spec (schema, symbols-only, claims, visible tiles vs numbers shown). If it passes it is ACCEPTED and you are done; otherwise returns the problems.', obj({ spec: SPEC }, ['spec'])),
  fn('submit', 'Same as check.', obj({ spec: SPEC }, ['spec'])),
  fn('cannot_represent', 'The concept cannot be shown with a grid or a cube.', obj({ reason: { type: 'string' } }, ['reason'])),
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
    if (name === 'check') return r.errors.length || !r.spec ? { text: 'PROBLEMS:\n' + r.errors.join('\n') } : { text: 'OK', done: r.spec };
    if (name === 'preview') return { text: r.spec ? preview(r.spec) + (r.errors.length ? '\nPROBLEMS:\n' + r.errors.join('\n') : '') : 'PROBLEMS:\n' + r.errors.join('\n') };
    if (name === 'submit') return r.errors.length || !r.spec ? { text: 'REJECTED:\n' + r.errors.join('\n') } : { text: 'accepted', done: r.spec };
    return { text: `unknown tool ${name}` };
  } catch (e) { return { text: `tool error: ${String(e).slice(0, 200)}` }; }
}
