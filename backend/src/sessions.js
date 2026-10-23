// A "session" is one call being watched. Each new piece of text is run through
// the rules + LLM, the stage confidences are updated and the risk is recomputed.

import { randomUUID } from 'node:crypto';
import { STAGE_IDS, ruleScores } from './stages.js';
import { assessRisk, combine } from './risk.js';
import { classifyStages } from './groq.js';
import { sendTelegram, alertMessage, telegramEnabled } from './telegram.js';

const sessions = new Map();
let latestId = null;

export function createSession({ source = 'phone', title = '' } = {}) {
  const session = {
    id: randomUUID().slice(0, 8),
    source, // 'phone' (live call) | 'demo' | 'eval'
    title,
    startedAt: Date.now(),
    endedAt: null,
    transcript: [],
    stages: Object.fromEntries(
      STAGE_IDS.map((id) => [id, { confidence: 0, rule: 0, llm: null, evidence: [] }])
    ),
    risk: assessRisk({}),
    llmNote: '',
    alert: { fired: false, atSec: null, telegram: null },
  };
  sessions.set(session.id, session);
  latestId = session.id;
  // Keep memory small: forget the oldest sessions.
  if (sessions.size > 50) sessions.delete(sessions.keys().next().value);
  return session;
}

export const getSession = (id) => sessions.get(id);
export const latestSession = () => (latestId ? sessions.get(latestId) : null);

export function endSession(session) {
  session.endedAt = Date.now();
}

/**
 * Add one piece of text (a transcribed audio chunk or a demo line) and re-assess.
 * options.t: seconds since call start (defaults to wall clock)
 * options.useLLM: false to force rules-only (used by the evaluation script)
 * options.sendAlerts: false to skip Telegram (used by the evaluation script)
 */
export async function addText(session, text, options = {}) {
  const { speaker = 'caller', useLLM = true, sendAlerts = true } = options;
  const t = options.t ?? Math.round((Date.now() - session.startedAt) / 1000);
  const clean = String(text || '').trim();
  if (!clean) return session;

  // 1. Keyword rules on the new text only.
  const rules = ruleScores(clean);
  session.transcript.push({ t, speaker, text: clean, hits: Object.keys(rules) });
  for (const [id, r] of Object.entries(rules)) {
    const st = session.stages[id];
    st.rule = Math.max(st.rule, r.score);
    st.evidence = [...new Set([...st.evidence, ...r.matches])].slice(-5);
  }

  // 2. LLM on the last few lines (it needs context, not just one sentence).
  if (useLLM) {
    const llm = await classifyStages(session.transcript.slice(-8));
    if (llm) {
      for (const id of STAGE_IDS) session.stages[id].llm = llm.scores[id];
      session.llmNote = llm.note;
    }
  }

  // 3. A stage's confidence only goes up during a call: once the caller has
  //    claimed to be CBI, that stays true even when later lines are about money.
  for (const id of STAGE_IDS) {
    const st = session.stages[id];
    st.confidence = Math.max(st.confidence, combine(st.rule, st.llm));
    st.confidence = Math.round(st.confidence * 100) / 100;
  }

  // 4. Risk + alert (the alert fires only once per call).
  session.risk = assessRisk(session.stages);
  if (session.risk.alert && !session.alert.fired) {
    session.alert.fired = true;
    session.alert.atSec = t;
    session.alert.atLine = session.transcript.length;
    if (sendAlerts && !telegramEnabled()) session.alert.telegram = 'off';
    else if (sendAlerts) {
      session.alert.telegram = 'sending';
      sendTelegram(alertMessage(session)).then((ok) => {
        session.alert.telegram = ok ? 'sent' : 'failed';
      });
    }
  }
  return session;
}

/** What the app / dashboard receives. */
export function snapshot(session) {
  if (!session) return null;
  return {
    id: session.id,
    source: session.source,
    title: session.title,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    transcript: session.transcript.slice(-60),
    stages: session.stages,
    risk: session.risk,
    llmNote: session.llmNote,
    alert: session.alert,
  };
}
