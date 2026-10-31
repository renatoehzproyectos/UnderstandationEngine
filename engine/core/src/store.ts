import { create } from 'zustand';
import { defaults, type Spec } from './spec.js';

type State = {
  spec: Spec | null; vars: Record<string, number>; beat: number; playing: boolean;
  load: (s: Spec) => void; setVar: (k: string, v: number) => void;
  go: (b: number) => void; play: () => void; pause: () => void;
};

export const useExperience = create<State>((set) => ({
  spec: null, vars: {}, beat: 0, playing: false,
  load: (spec) => set({ spec, vars: defaults(spec), beat: 0, playing: false }),
  setVar: (k, v) => set((s) => ({ vars: { ...s.vars, [k]: v }, beat: 0, playing: false })),
  go: (beat) => set({ beat, playing: false }),
  play: () => set((s) => ({ beat: s.beat >= s.spec!.timeline.length - 1 ? 0 : s.beat, playing: true })),
  pause: () => set({ playing: false }),
}));
