import { parseSpec, type Spec } from '../../../engine/core/src/spec.js';
import { SYSTEM } from './prompt.js';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
const API = 'https://api.groq.com/openai/v1';
const PREFER = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const NOT_CHAT = /whisper|guard|tts|playai|orpheus|embed|safeguard/i;

/** Modelos de chat disponibles en la cuenta, los preferidos primero. */
async function listModels(key: string, first?: string): Promise<string[]> {
  let ids: string[] = [];
  try {
    const r = await fetch(`${API}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { data?: { id: string }[] };
    ids = (j.data ?? []).map((m) => m.id).filter((id) => !NOT_CHAT.test(id));
  } catch { /* usa la lista preferida */ }
  const rank = (id: string) => { const i = PREFER.indexOf(id); return i < 0 ? 99 : i; };
  const all = [...new Set([...(first ? [first] : []), ...PREFER, ...ids])];
  return all.filter((id) => !ids.length || ids.includes(id) || id === first).sort((a, b) => (a === first ? -1 : b === first ? 1 : rank(a) - rank(b)));
}

async function ask(key: string, model: string, messages: Msg[], json: boolean): Promise<string> {
  const r = await fetch(`${API}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 2500, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? '';
}

/** Concepto → especificación validada. Prueba modelo por modelo hasta que uno produzca una especificación válida. */
export async function generateSpec(concept: string, key: string, first?: string): Promise<Spec> {
  const models = await listModels(key, first), log: string[] = [], t0 = Date.now();
  for (const model of models) {
    if (Date.now() - t0 > 50000) break;
    const messages: Msg[] = [{ role: 'system', content: SYSTEM }, { role: 'user', content: concept }];
    try {
      let text: string;
      try { text = await ask(key, model, messages, true); } catch { text = await ask(key, model, messages, false); }
      const raw = JSON.parse(text.replace(/^\s*```(?:json)?|```\s*$/g, '').trim());
      if (raw.unsupported) throw new Error('unsupported');
      return parseSpec(raw);
    } catch (e) {
      const m = String(e);
      if (m.includes('unsupported')) throw new Error('unsupported');
      log.push(`${model}: ${m.slice(0, 80)}`);
    }
  }
  throw new Error(`all models failed → ${log.join(' | ')}`);
}
