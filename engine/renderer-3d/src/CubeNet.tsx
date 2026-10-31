import { useState, type CSSProperties, type ReactNode } from 'react';
import './cube.css';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#d946ef'], U = 11;
type Props = { side: number; fold: number; lit: number };

/** Cubo hecho de cuadritos que se pliega/despliega (fold 0..1) y se puede girar arrastrando. */
export function CubeNet({ side, fold, lit }: Props) {
  const [rot, setRot] = useState({ x: -28, y: -35 });
  const P = side * U, h = P / 2, t = 90 * fold, s = 1 + (8 - side) * 0.1;
  const face = (i: number, st: CSSProperties, kids?: ReactNode) => (
    <div key={i} className={`f${i < lit ? ' on' : ''}`}
      style={{ '--c': COLORS[i], width: P, height: P, gridTemplateColumns: `repeat(${side},1fr)`, ...st } as CSSProperties}>
      {Array.from({ length: side * side }, (_, j) => <i key={j} />)}{kids}
    </div>
  );
  const at = (l: number, tp: number, o: string, tr: string): CSSProperties => ({ left: l, top: tp, transformOrigin: o, transform: tr });
  return (
    <div className="cube3d" onPointerMove={(e) => e.buttons && fold > 0.5 &&
      setRot((r) => ({ x: Math.max(-80, Math.min(80, r.x - e.movementY * 0.5)), y: r.y + e.movementX * 0.5 }))}>
      <div className="w" style={{ transform: `scale(${s}) translateY(${-h * (1 - fold)}px) rotateX(${rot.x * fold}deg) rotateY(${rot.y * fold}deg) translateZ(${h * fold}px)` }}>
        {face(0, { left: -P / 2, top: -P / 2 }, [
          face(1, at(0, -P, '50% 100%', `rotateX(${t}deg)`)),
          face(2, at(0, P, '50% 0', `rotateX(${-t}deg)`), face(5, at(0, P, '50% 0', `rotateX(${-t}deg)`))),
          face(3, at(-P, 0, '100% 50%', `rotateY(${-t}deg)`)),
          face(4, at(P, 0, '0 50%', `rotateY(${t}deg)`)),
        ])}
      </div>
    </div>
  );
}
