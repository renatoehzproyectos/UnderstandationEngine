import { parseSpec, type Spec } from '../../../engine/core/src/spec.js';
import { SYSTEM } from './prompt.js';
import { TOOLS, runTool } from './tools.js';

const API = 'https://api.groq.com/openai/v1';
const PREFER = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const sleep = (ms: number) => new Promise((x) => setTimeout(x, ms));
const NOT_CHAT = /whisper|guard|tts|playai|orpheus|embed|safeguard|allam/i;

async function listModels(key: string, first?: string): Promise<string[]> {
  let ids: string[] = [];
  try {
    const r = await fetch(`${API}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    ids = (((await r.json()) as { data?: { id: string }[] }).data ?? []).map((m) => m.id).filter((id) => !NOT_CHAT.test(id));
  } catch { /* usa la lista preferida */ }
  const rank = (id: string) => { const i = PREFER.indexOf(id); return i < 0 ? 99 : i; };
  return [...new Set([...(first ? [first] : []), ...PREFER, ...ids])]
    .filter((id) => !ids.length || ids.includes(id) || id === first)
    .sort((a, b) => (a === first ? -1 : b === first ? 1 : rank(a) - rank(b)));
}

const compact = (ms: any[]) => ms.map((m, i) => {
  if (i < 2 || i >= ms.length - 4) return m; // conserva instrucciones y lo más reciente
  if (m.role === 'tool') return { ...m, content: String(m.content).slice(0, 100) };
  if (m.tool_calls) return { ...m, tool_calls: m.tool_calls.map((t: any) => ({ ...t, function: { ...t.function, arguments: t.function.arguments.length > 200 ? '{}' : t.function.arguments } })) };
  return m;
});

async function chat(key: string, model: string, messages: any[]) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(`${API}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: compact(messages), tools: TOOLS, tool_choice: 'auto', temperature: 0.2, max_tokens: 2500 }),
    });
    if (r.status === 429) { // límite de tasa: espera si es corto; si no, avisa cuánto falta
      const body = await r.text();
      const wait = Number(r.headers.get('retry-after')) || Number(body.match(/try again in ([\d.]+)s/)?.[1]) || 20;
      if (wait <= 6 && attempt === 0) { await sleep(wait * 1000); continue; }
      throw new Error(`HTTP 429 RATE ${wait}s ${body.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 300)}`);
    return (await r.json()).choices?.[0]?.message ?? {};
  }
  throw new Error('HTTP 429 retry failed');
}

/** Bucle con herramientas: ejemplo → borrador → preview → check → submit (solo se acepta lo verificado). */
async function agent(key: string, model: string, concept: string, deadline: number, trace: string[]): Promise<Spec> {
  const messages: any[] = [{ role: 'system', content: SYSTEM }, { role: 'user', content: concept }];
  let bad = 0;
  for (let step = 0; step < 12; step++) {
    if (Date.now() > deadline) throw new Error('timeout');
    let m: any;
    try { m = await chat(key, model, messages); }
    catch (e) {
      if (String(e).includes('tool_use_failed') && bad++ < 2) { // llamada a herramienta mal formada: reintenta
        trace.push(`${model} malformed tool call, retrying: ${String(e).slice(0, 200)}`);
        messages.push({ role: 'user', content: 'Your last tool call was malformed. Call the tool again with valid JSON arguments (spec must be a JSON object).' });
        continue;
      }
      throw e;
    }
    trace.push(`${model} step ${step}: ${m.tool_calls?.length ? m.tool_calls.map((t: any) => t.function.name).join(',') : 'plain text'}`);
    messages.push({ role: 'assistant', content: m.content ?? null, ...(m.tool_calls?.length ? { tool_calls: m.tool_calls } : {}) });
    if (m.tool_calls?.length) {
      for (const tc of m.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* args vacíos */ }
        const r = runTool(tc.function.name, args);
        trace.push(`  ${tc.function.name} → ${r.done ? 'ACCEPTED' : r.unsupported ? 'unsupported' : r.text.replace(/\s+/g, ' ').slice(0, 220)}`);
        if (r.unsupported) throw new Error('unsupported');
        if (r.done) return r.done;
        messages.push({ role: 'tool', tool_call_id: tc.id, content: r.text });
      }
      continue;
    }
    try { return parseSpec(JSON.parse((m.content ?? '').replace(/^\s*```(?:json)?|```\s*$/g, '').trim())); }
    catch (e) { messages.push({ role: 'user', content: `Use the tools and call submit with a valid spec. ${String(e).slice(0, 300)}` }); }
  }
  throw new Error('no accepted spec');
}

export async function generateSpec(concept: string, key: string, first?: string, trace: string[] = []): Promise<Spec> {
  const models = await listModels(key, first), log: string[] = [], t0 = Date.now(), end = t0 + 55000;
  const limited: { model: string; wait: number }[] = [];
  const attempt = async (model: string, deadline: number) => {
    try { return await agent(key, model, concept, deadline, trace); }
    catch (e) {
      const m = String(e);
      if (m.includes('unsupported')) throw new Error('unsupported');
      const w = m.match(/RATE ([\d.]+)s/);
      if (w) limited.push({ model, wait: Number(w[1]) });
      log.push(`${model}: ${m.slice(0, 80)}`); trace.push(`${model} FAILED: ${m.slice(0, 400)}`);
      return null;
    }
  };
  for (const model of models) { // 1ª pasada: cada modelo tiene su propio cupo
    if (Date.now() > end - 8000) break;
    const r = await attempt(model, Math.min(end, Date.now() + 30000)); if (r) return r;
  }
  limited.sort((a, b) => a.wait - b.wait); // 2ª pasada: espera al que se libere antes
  for (const { model, wait } of limited) {
    if (Date.now() + wait * 1000 + 12000 > end) continue;
    trace.push(`waiting ${wait}s for ${model} to free its rate limit`);
    await sleep((wait + 1) * 1000);
    const r = await attempt(model, end); if (r) return r;
  }
  throw new Error(`all models failed → ${log.join(' | ')}`);
}
