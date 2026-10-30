import type { CSSProperties } from 'react';
import './unit-grid.css';

type Props = {
  cols: number; rows: number; visible: (c: number, r: number, i: number) => boolean;
  lit: number; accent: boolean; left?: string | number; top?: string | number;
};

/** Cuadrícula de unidades: cada cuadrito aparece o desaparece según un predicado. */
export function UnitGrid({ cols, rows, visible, lit, accent, left, top }: Props) {
  const tiles = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols), on = visible(c, r, i);
    tiles.push(
      <i key={i} className={[on && 'on', i < lit && 'lit', accent && on && 'accent'].filter(Boolean).join(' ')}
        style={{ '--h': 205 + r * (120 / rows), '--d': `${(c + r) * 22}ms` } as CSSProperties} />,
    );
  }
  return (
    <div className="ug">
      <div className="mk top">{top !== undefined && <b>{top}</b>}</div>
      <div className="mk left">{left !== undefined && <b>{left}</b>}</div>
      <div className="cells" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`, aspectRatio: `${cols}/${rows}` }}>
        {tiles}
      </div>
    </div>
  );
}
