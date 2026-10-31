import { generateSpec } from '../ai-builder/experience-generator/src/generate.js';

declare const process: { env: Record<string, string | undefined> };

// Vercel serverless function: POST { concept } → Spec
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = process.env.GROQ_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_KEY missing' });
  const concept = String(req.body?.concept ?? '').slice(0, 200).trim();
  if (!concept) return res.status(400).json({ error: 'empty concept' });
  const trace: string[] = [];
  try { const spec = await generateSpec(concept, key, process.env.GROQ_MODEL || undefined, trace); res.status(200).json({ spec, trace }); }
  catch (e) { res.status(422).json({ error: String(e), trace }); }
}
