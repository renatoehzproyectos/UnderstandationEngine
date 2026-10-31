import { parseSpec, type Spec } from '../../../engine/core/src/spec.js';
import { SYSTEM } from './prompt.js';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

async function ask(key: string, messages: Msg[], model: string): Promise<string> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 2500, response_format: { type: 'json_object' } }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? '';
}

/** Concepto → especificación validada. Reintenta una vez devolviendo el error de validación a la IA. */
export async function generateSpec(concept: string, key: string, model = 'llama-3.3-70b-versatile'): Promise<Spec> {
  const messages: Msg[] = [{ role: 'system', content: SYSTEM }, { role: 'user', content: concept }];
  let err = 'invalid';
  for (let t = 0; t < 2; t++) {
    const text = await ask(key, messages, model);
    try {
      const raw = JSON.parse(text.replace(/^\s*```(?:json)?|```\s*$/g, '').trim());
      if (raw.unsupported) throw new Error('unsupported');
      return parseSpec(raw);
    } catch (e) {
      err = String(e);
      if (err.includes('unsupported')) break;
      messages.push({ role: 'assistant', content: text }, { role: 'user', content: `Invalid: ${err}. Return corrected JSON only.` });
    }
  }
  throw new Error(err);
}
