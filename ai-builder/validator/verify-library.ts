import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inspect } from '../../engine/core/src/spec.js';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f === 'spec.json' ? [join(d, f)] : []));
let bad = 0;
for (const f of walk('knowledge-library')) {
  const { errors } = inspect(JSON.parse(readFileSync(f, 'utf8')));
  console.log(errors.length ? `✗ ${f}\n  ${errors.join('\n  ')}` : `✓ ${f}`);
  bad += errors.length ? 1 : 0;
}
process.exit(bad ? 1 : 0);
