import { useEffect, useState } from 'react';
import { evaluate, parseSpec, useExperience } from '@engine/core';
import { UnitGrid } from '@engine/renderer-2d';
import squareRoot from '@library/mathematics/square-roots/spec.json';

useExperience.getState().load(parseSpec(squareRoot)); // en el futuro: la biblioteca/IA decide qué cargar

export default function App() {
  const { spec, vars, beat, playing, setVar, go, play, pause } = useExperience();
  const [cnt, setCnt] = useState(0);
  const s = spec!, B = s.timeline[beat], last = s.timeline.length - 1;
  const [vk, vd] = Object.entries(s.vars)[0];
  const base = { ...vars, c: 0, r: 0, i: 0, k: 0 };
  const cols = Number(evaluate(s.grid.cols, base)), rows = Number(evaluate(s.grid.rows, base)), total = cols * rows;

  useEffect(() => { const t = setTimeout(() => useExperience.getState().play(), 700); return () => clearTimeout(t); }, []);
  useEffect(() => { // avance automático entre beats
    if (!playing) return;
    const t = setTimeout(() => useExperience.setState(beat < last ? { beat: beat + 1 } : { playing: false }), B.ms);
    return () => clearTimeout(t);
  }, [playing, beat]);
  useEffect(() => { // conteo de cuadritos
    if (!B.count) return;
    setCnt(0);
    const step = Math.max(1, Math.round(total / ((B.ms * 0.7) / 30)));
    const id = setInterval(() => setCnt((c) => Math.min(total, c + step)), 30);
    return () => clearInterval(id);
  }, [beat, total]);

  const mark = (e?: string) => (e ? String(evaluate(e, base)) : undefined);
  const says = s.timeline.slice(0, beat + 1).map((b, j) => b.say
    ? { j, acc: b.accent, t: j === beat && b.count ? String(cnt) : String(evaluate(b.say, base)) } : null)
    .filter((x) => x !== null).slice(-4);

  return (
    <main>
      <section className="stage">
        <UnitGrid cols={cols} rows={rows} lit={B.count ? cnt : 0} accent={B.accent}
          visible={(c, r, i) => Boolean(evaluate(B.tiles, { ...vars, c, r, i, k: 0 }))}
          left={mark(B.marks.left)} top={mark(B.marks.top)} />
      </section>
      <section className="say">
        {says.map((x, idx) => (
          <div key={x!.j} className={idx === says.length - 1 ? 'cur' : ''} style={x!.acc ? { color: '#f59e0b' } : undefined}>{x!.t}</div>
        ))}
      </section>
      <nav>
        <button aria-label="−" disabled={vars[vk] <= vd.min} onClick={() => setVar(vk, vars[vk] - 1)}>−</button>
        <b>{vars[vk]}</b>
        <button aria-label="+" disabled={vars[vk] >= vd.max} onClick={() => setVar(vk, vars[vk] + 1)}>+</button>
        <input type="range" min={0} max={last} value={beat} onChange={(e) => go(+e.target.value)} aria-label="⏪ ⏩" />
        <button aria-label={playing ? '⏸' : '▶'} onClick={playing ? pause : play}>{playing ? '⏸' : '▶'}</button>
      </nav>
    </main>
  );
}
