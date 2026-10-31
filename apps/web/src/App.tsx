import { useEffect, useState } from 'react';
import { evaluate, parseSpec, useExperience, type Spec } from '@engine/core';
import { UnitGrid } from '@engine/renderer-2d';
import { CubeNet } from '@engine/renderer-3d';
import { LIBRARY } from '@library/index';

useExperience.getState().load(LIBRARY[0].spec);

export default function App() {
  const { spec, vars, beat, playing, setVar, go, play, pause } = useExperience();
  const [cnt, setCnt] = useState(0);
  const [items, setItems] = useState(LIBRARY.map((e) => ({ glyph: e.glyph, spec: e.spec })));
  const [ask, setAsk] = useState(false), [q, setQ] = useState(''), [st, setSt] = useState<'' | 'busy' | 'err' | 'no'>('');
  const s = spec!, B = s.timeline[beat], last = s.timeline.length - 1;
  const base = { ...vars, c: 0, r: 0, i: 0, k: 0 };
  const cols = s.grid ? Number(evaluate(s.grid.cols, base)) : 0, rows = s.grid ? Number(evaluate(s.grid.rows, base)) : 0, total = cols * rows;
  const num = (e: string | undefined, d: number) => (e ? Number(evaluate(e, base)) : d);

  const open = (sp: Spec) => { useExperience.getState().load(sp); setTimeout(() => useExperience.getState().play(), 500); };
  useEffect(() => { const t = setTimeout(() => useExperience.getState().play(), 700); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => useExperience.setState(beat < last ? { beat: beat + 1 } : { playing: false }), B.ms);
    return () => clearTimeout(t);
  }, [playing, beat]);
  useEffect(() => {
    if (!B.count || !total) return;
    setCnt(0);
    const step = Math.max(1, Math.round(total / ((B.ms * 0.7) / 30)));
    const id = setInterval(() => setCnt((c) => Math.min(total, c + step)), 30);
    return () => clearInterval(id);
  }, [beat, total]);

  async function generate() {
    if (!q.trim()) return;
    setSt('busy');
    try {
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ concept: q }) });
      if (r.status === 422 && (await r.json()).error?.includes('unsupported')) { setSt('no'); return; }
      if (!r.ok) throw new Error();
      const sp = parseSpec(await r.json());
      setItems((it) => [...it, { glyph: '★', spec: sp }]); open(sp); setSt(''); setAsk(false); setQ('');
    } catch { setSt('err'); }
  }

  const mark = (e?: string) => (e ? String(evaluate(e, base)) : undefined);
  const says = s.timeline.slice(0, beat + 1).map((b, j) => b.say
    ? { j, acc: b.accent, t: j === beat && b.count ? String(cnt) : String(evaluate(b.say, base)) } : null)
    .filter((x) => x !== null).slice(-4);

  return (
    <main>
      <header>
        {items.map((it, i) => (
          <button key={i} className={it.spec === s ? 'on' : ''} aria-label={it.glyph} onClick={() => open(it.spec)}>{it.glyph}</button>
        ))}
        <button aria-label="✨" onClick={() => setAsk(!ask)}>✨</button>
      </header>
      {ask && (
        <div className="ask">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generate()} placeholder="…" autoFocus />
          <button aria-label="→" onClick={generate}>{st === 'busy' ? '⏳' : st === 'err' ? '⚠' : st === 'no' ? '∅' : '→'}</button>
        </div>
      )}
      <section className="stage">
        {s.solid ? (
          <CubeNet side={num(s.solid.side, 3)} fold={num(B.fold, 1)} lit={num(B.lit, 0)} />
        ) : (
          <UnitGrid cols={cols} rows={rows} lit={B.count ? cnt : 0} accent={B.accent}
            visible={(c, r, i) => Boolean(evaluate(B.tiles, { ...vars, c, r, i, k: 0 }))}
            left={mark(B.marks.left)} top={mark(B.marks.top)} />
        )}
      </section>
      <section className="say">
        {says.map((x, idx) => (
          <div key={x!.j} className={idx === says.length - 1 ? 'cur' : ''} style={x!.acc ? { color: '#f59e0b' } : undefined}>{x!.t}</div>
        ))}
      </section>
      <nav>
        {Object.entries(s.vars).map(([k, d]) => (
          <span className="vr" key={k}>
            <button aria-label="−" disabled={vars[k] <= d.min} onClick={() => setVar(k, vars[k] - 1)}>−</button>
            <b>{vars[k]}</b>
            <button aria-label="+" disabled={vars[k] >= d.max} onClick={() => setVar(k, vars[k] + 1)}>+</button>
          </span>
        ))}
        <button className="pl" aria-label={playing ? '⏸' : '▶'} onClick={playing ? pause : play}>{playing ? '⏸' : '▶'}</button>
        <input type="range" min={0} max={last} value={beat} onChange={(e) => go(+e.target.value)} aria-label="⏪ ⏩" />
      </nav>
    </main>
  );
}
