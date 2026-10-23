// Groq API: speech-to-text (Whisper) and the LLM stage classifier.
// Uses Node's built-in fetch / FormData / Blob, so no npm packages are needed.

import { STAGES, STAGE_IDS } from './stages.js';

const BASE = 'https://api.groq.com/openai/v1';
const key = () => process.env.GROQ_API_KEY?.trim();
export const groqEnabled = () => Boolean(key());

// Whisper often "hears" these on silence or noise. We throw them away.
const HALLUCINATIONS =
  /^(thank you|thanks|thanks for watching|please subscribe|subscribe|you|bye|okay|hmm|धन्यवाद|शुक्रिया|सब्सक्राइब)[.!।\s]*$/i;

// A short Hinglish prompt nudges Whisper towards the words used in these calls.
const WHISPER_PROMPT =
  'Hello, main CBI officer bol raha hoon. Aapke Aadhaar se money laundering case hai. ' +
  'Kisi ko mat batana, camera on rakho. Police, FIR, arrest warrant, RBI account, transfer.';

/** Transcribe a WAV/M4A buffer. Returns '' for silence or noise. */
export async function transcribe(buffer, mimeType = 'audio/wav') {
  if (!groqEnabled()) throw new Error('GROQ_API_KEY is not set in backend/.env');
  const ext = mimeType.includes('m4a') || mimeType.includes('mp4') ? 'm4a' : 'wav';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), `chunk.${ext}`);
  form.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  form.append('prompt', WHISPER_PROMPT);
  if (process.env.WHISPER_LANGUAGE) form.append('language', process.env.WHISPER_LANGUAGE);

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq Whisper ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = ((await res.json()).text || '').trim();
  if (text.length < 2 || HALLUCINATIONS.test(text)) return '';
  return text;
}

const SYSTEM_PROMPT = `You protect elderly people in India from "digital arrest" scam calls.
In this scam, fraudsters pretend to be officers and keep the victim "under arrest" on a video call until they transfer money.
Real police never arrest anyone on a phone or video call.

Read the latest part of a live call transcript (Hindi, English or Hinglish; speech-to-text, may contain errors).
For each stage, give a confidence from 0 to 1 that the CALLER has done it anywhere in this transcript:
${STAGES.map((s) => `- ${s.id}: ${s.description}`).join('\n')}

Be careful with genuine calls:
- A bank calling to check a suspicious transaction, or saying "we never ask for OTP", is not a scam stage.
- A courier asking about delivery or an address is not an accusation.
- A real police station asking you to come in person (e.g. passport verification) is not impersonation or urgency.
Only score high when the caller's words really fit the stage.

Reply with JSON only, exactly in this shape:
{"impersonation":0.0,"accusation":0.0,"isolation":0.0,"urgency":0.0,"money":0.0,"note":"one short sentence"}`;

/**
 * Ask the LLM how strongly the recent transcript matches each stage.
 * Returns { scores: {stageId: 0-1}, note } or null if the LLM is off or failed.
 */
export async function classifyStages(lines) {
  if (!groqEnabled() || process.env.USE_LLM === 'false') return null;
  const transcript = lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
  const body = {
    model: process.env.GROQ_LLM_MODEL || 'openai/gpt-oss-120b',
    temperature: 0,
    reasoning_effort: 'low',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Transcript:\n${transcript}` },
    ],
  };
  const call = (b) =>
    fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
      signal: AbortSignal.timeout(8000),
    });
  try {
    let res = await call(body);
    if (res.status === 400) {
      // Some models don't accept reasoning_effort / JSON mode: retry with a plain request.
      const { reasoning_effort, response_format, ...plain } = body;
      res = await call(plain);
    }
    if (!res.ok) throw new Error(`Groq LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const content = (await res.json()).choices?.[0]?.message?.content || '';
    const json = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
    const scores = {};
    for (const id of STAGE_IDS) {
      const v = Number(json[id]);
      scores[id] = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
    return { scores, note: String(json.note || '').slice(0, 200) };
  } catch (err) {
    console.warn('[llm] skipped:', err.message);
    return null;
  }
}
