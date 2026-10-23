// Risk engine: turns per-stage confidences into one 0-100 risk score,
// a level (safe / caution / danger) and a yes/no "raise the alarm" decision.

import { STAGE_IDS } from './stages.js';

// A stage counts as "detected" once its confidence reaches this value.
export const DETECT = 0.5;

// How much each stage contributes to the score (adds up to 100).
const WEIGHTS = {
  impersonation: 20,
  accusation: 20,
  isolation: 25,
  urgency: 15,
  money: 20,
};

/**
 * Combine the rule score and the LLM score for one stage.
 * With an LLM we trust it a bit more than the keyword rules, because it
 * understands context (a courier talking about a "parcel" is not an accusation).
 * Without an LLM we fall back to the rules alone.
 */
export function combine(rule, llm) {
  if (llm === null || llm === undefined) return rule;
  return 0.35 * rule + 0.65 * llm;
}

/**
 * stages: { stageId: { confidence } }
 * returns { score, level, alert, detected: [stageIds], reason }
 */
export function assessRisk(stages) {
  const conf = (id) => stages[id]?.confidence ?? 0;
  const has = (id) => conf(id) >= DETECT;

  let score = 0;
  for (const id of STAGE_IDS) {
    const c = conf(id);
    // Detected stages count fully (scaled by confidence); weak hints count a little,
    // so the meter moves before anything is certain.
    score += WEIGHTS[id] * (c >= DETECT ? c : c * 0.3);
  }

  // The script itself is the strongest signal: a fake officer who also accuses you.
  const scriptCore = has('impersonation') && has('accusation');
  if (scriptCore) score += 10;
  if (scriptCore && (has('isolation') || has('money'))) score += 10;

  score = Math.round(Math.min(100, score));

  const alert = (scriptCore && (has('isolation') || has('money'))) || score >= 75;
  const level = alert || score >= 65 ? 'danger' : score >= 35 ? 'caution' : 'safe';
  const detected = STAGE_IDS.filter(has);

  let reason = 'No scam pattern yet';
  if (alert) reason = 'This call matches the digital arrest scam script';
  else if (scriptCore) reason = 'Caller claims to be an officer and is accusing you';
  else if (detected.length) reason = `Watching: ${detected.join(', ')}`;

  return { score, level, alert, detected, reason };
}
