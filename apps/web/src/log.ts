import { useExperience } from '@engine/core';

const lines: string[] = [], t0 = Date.now();
const safe = (x: unknown) => { try { return typeof x === 'string' ? x : x instanceof Error ? `${x.message}\n${x.stack ?? ''}` : JSON.stringify(x); } catch { return String(x); } };

export function log(tag: string, msg: string) {
  lines.push(`+${((Date.now() - t0) / 1000).toFixed(2)}s [${tag}] ${msg}`);
  if (lines.length > 2000) lines.shift();
}

// Captura todo lo que pase: consola, errores y promesas rechazadas.
(['log', 'info', 'warn', 'error'] as const).forEach((k) => {
  const orig = console[k].bind(console);
  console[k] = (...a: unknown[]) => { log(`console.${k}`, a.map(safe).join(' ')); orig(...a); };
});
addEventListener('error', (e) => log('window.error', `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
addEventListener('unhandledrejection', (e) => log('promise', safe((e as PromiseRejectionEvent).reason)));

export function dump(): string {
  const st = useExperience.getState();
  return [
    '=== UVL LOG ===',
    `time: ${new Date().toISOString()}`,
    `url: ${location.href}`,
    `agent: ${navigator.userAgent}`,
    `viewport: ${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`,
    `theme: ${matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}`,
    `state: ${safe({ spec: st.spec?.id, vars: st.vars, beat: st.beat, beats: st.spec?.timeline.length, playing: st.playing })}`,
    '--- events ---', ...lines,
  ].join('\n');
}

export async function copyLog(): Promise<boolean> {
  const text = dump();
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const t = document.createElement('textarea');
      t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
      const ok = document.execCommand('copy'); t.remove(); return ok;
    } catch { return false; }
  }
}
log('boot', 'app started');
