// Evaluation: replays every call script in data/calls through the detector
// and reports how early and how reliably the alert fires.
//
//   npm run eval            -> rules only (fast, offline)
//   npm run eval -- --llm   -> rules + Groq LLM (needs GROQ_API_KEY in .env)
//
// Results are printed and saved to results/eval-<mode>.json and .csv

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const { loadCalls } = await import('../src/calls.js');
const { createSession, addText } = await import('../src/sessions.js');
const { STAGE_IDS } = await import('../src/stages.js');

const useLLM = process.argv.includes('--llm');
const mode = useLLM ? 'rules+llm' : 'rules';

// The "ideal" alert point from the human labels: the first line where the
// labelled stages already contain officer + accusation + (isolation or money).
function idealAlertLine(lines) {
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    (lines[i].stages || []).forEach((s) => seen.add(s));
    if (seen.has('impersonation') && seen.has('accusation') && (seen.has('isolation') || seen.has('money'))) return i + 1;
  }
  return null;
}

const rows = [];
const stageCounts = Object.fromEntries(STAGE_IDS.map((id) => [id, { tp: 0, fp: 0, fn: 0 }]));

for (const call of loadCalls()) {
  const session = createSession({ source: 'eval', title: call.title });
  for (const line of call.lines) {
    await addText(session, line.text, { t: line.t, speaker: line.speaker, useLLM, sendAlerts: false });
  }
  const duration = call.lines.at(-1).t || 1;
  const labelled = new Set(call.lines.flatMap((l) => l.stages || []));
  const detected = new Set(session.risk.detected);
  for (const id of STAGE_IDS) {
    if (detected.has(id) && labelled.has(id)) stageCounts[id].tp++;
    else if (detected.has(id)) stageCounts[id].fp++;
    else if (labelled.has(id)) stageCounts[id].fn++;
  }
  const ideal = idealAlertLine(call.lines);
  rows.push({
    id: call.id,
    label: call.label,
    alerted: session.alert.fired,
    alertLine: session.alert.atLine ?? null,
    idealLine: ideal,
    totalLines: call.lines.length,
    alertSec: session.alert.atSec,
    callSec: duration,
    pctOfCall: session.alert.fired ? Math.round((session.alert.atSec / duration) * 100) : null,
    finalScore: session.risk.score,
    detected: [...detected].join(' '),
  });
}

// ---------- summary ----------
const scams = rows.filter((r) => r.label === 'scam');
const genuine = rows.filter((r) => r.label === 'genuine');
const caught = scams.filter((r) => r.alerted);
const falseAlarms = genuine.filter((r) => r.alerted);
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const summary = {
  mode,
  calls: rows.length,
  detectionRate: scams.length ? caught.length / scams.length : null,
  falseAlarmRate: genuine.length ? falseAlarms.length / genuine.length : null,
  avgTimeToAlertSec: avg(caught.map((r) => r.alertSec)),
  avgPctOfCallBeforeAlert: avg(caught.map((r) => r.pctOfCall)),
  avgLinesLateVsIdeal: avg(caught.filter((r) => r.idealLine).map((r) => r.alertLine - r.idealLine)),
  stages: Object.fromEntries(
    Object.entries(stageCounts).map(([id, c]) => [
      id,
      {
        precision: c.tp + c.fp ? +(c.tp / (c.tp + c.fp)).toFixed(2) : null,
        recall: c.tp + c.fn ? +(c.tp / (c.tp + c.fn)).toFixed(2) : null,
      },
    ])
  ),
};

console.log(`\nKavach evaluation (${mode})\n`);
console.table(rows.map(({ detected, ...r }) => r));
console.log('Stage-level precision / recall:');
console.table(summary.stages);
const pct = (x) => (x === null ? '-' : `${Math.round(x * 100)}%`);
console.log(`Scam calls caught:      ${caught.length}/${scams.length} (${pct(summary.detectionRate)})`);
console.log(`False alarms (genuine): ${falseAlarms.length}/${genuine.length} (${pct(summary.falseAlarmRate)})`);
console.log(`Avg time to alert:      ${summary.avgTimeToAlertSec ?? '-'} s  (${summary.avgPctOfCallBeforeAlert ?? '-'}% into the call)`);
console.log(`Avg lines after ideal:  ${summary.avgLinesLateVsIdeal ?? '-'}\n`);

const out = path.join(ROOT, 'results');
fs.mkdirSync(out, { recursive: true });
const base = path.join(out, `eval-${useLLM ? 'llm' : 'rules'}`);
fs.writeFileSync(`${base}.json`, JSON.stringify({ summary, rows }, null, 2));
const cols = Object.keys(rows[0]);
fs.writeFileSync(`${base}.csv`, [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n'));
console.log(`Saved ${path.relative(ROOT, base)}.json and .csv`);
