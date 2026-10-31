import { parseSpec, type Spec } from '../../../engine/core/src/spec.js';
import { SYSTEM } from './prompt.js';
import { TOOLS, runTool } from './tools.js';

const API = 'https://api.groq.com/openai/v1';
const PREFER = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const NOT_CHAT = /whisper|guard|tts|playai|orpheus|embed|safeguard/i;

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

async function chat(key: string, model: string, messages: any[]) {
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.2, max_tokens: 3500 }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()).choices?.[0]?.message ?? {};
}

/** Bucle con herramientas: ejemplo → borrador → preview → check → submit (solo se acepta lo verificado). */
async function agent(key: string, model: string, concept: string, deadline: number): Promise<Spec> {
  const messages: any[] = [{ role: 'system', content: SYSTEM }, { role: 'user', content: concept }];
  for (let step = 0; step < 12; step++) {
    if (Date.now() > deadline) throw new Error('timeout');
    const m = await chat(key, model, messages);
    messages.push({ role: 'assistant', content: m.content ?? '', ...(m.tool_calls?.length ? { tool_calls: m.tool_calls } : {}) });
    if (m.tool_calls?.length) {
      for (const tc of m.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* args vacíos */ }
        const r = runTool(tc.function.name, args);
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

export async function generateSpec(concept: string, key: string, first?: string): Promise<Spec> {
  const models = await listModels(key, first), log: string[] = [], t0 = Date.now();
  for (const model of models) {
    if (Date.now() - t0 > 40000) break;
    try { return await agent(key, model, concept, Math.min(t0 + 55000, Date.now() + 28000)); }
    catch (e) {
      const m = String(e);
      if (m.includes('unsupported')) throw new Error('unsupported');
      log.push(`${model}: ${m.slice(0, 80)}`);
    }
  }
  throw new Error(`all models failed → ${log.join(' | ')}`);
}
