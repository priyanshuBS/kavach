// Kavach backend: a tiny HTTP server with no dependencies.
// Run:  npm start   (from the backend folder)

import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { createSession, getSession, latestSession, addText, endSession, snapshot } = await import(
  './sessions.js'
);
const { transcribe, groqEnabled } = await import('./groq.js');
const { sendTelegram, telegramEnabled } = await import('./telegram.js');
const { loadCalls } = await import('./calls.js');

const PORT = Number(process.env.PORT || 4000);
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

// ---------- small helpers ----------
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req);
  return buf.length ? JSON.parse(buf.toString('utf8')) : {};
}

// ---------- routes ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api','sessions','ab12','audio']
  const method = req.method;

  if (method === 'OPTIONS') return send(res, 204, '');

  if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'public', 'index.html')), 'text/html; charset=utf-8');
  }

  if (method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      groq: groqEnabled(),
      llm: groqEnabled() && process.env.USE_LLM !== 'false',
      telegram: telegramEnabled(),
      protectedPerson: process.env.PROTECTED_PERSON_NAME || '',
    });
  }

  if (method === 'GET' && url.pathname === '/api/demo-calls') {
    return send(res, 200, loadCalls().map(({ id, title, label, language, lines }) => ({ id, title, label, language, lines })));
  }

  if (method === 'POST' && url.pathname === '/api/test-alert') {
    if (!telegramEnabled()) return send(res, 400, { ok: false, error: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env' });
    const ok = await sendTelegram('✅ <b>Kavach test alert</b>\nIf you can read this, family alerts are working.');
    return send(res, ok ? 200 : 502, { ok });
  }

  if (parts[0] === 'api' && parts[1] === 'sessions') {
    // POST /api/sessions  -> start watching a call
    if (method === 'POST' && parts.length === 2) {
      const body = await readJson(req);
      const s = createSession({ source: body.source, title: body.title });
      console.log(`[call] started ${s.id} (${s.source})`);
      return send(res, 200, snapshot(s));
    }
    // GET /api/sessions/latest
    if (method === 'GET' && parts[2] === 'latest') return send(res, 200, snapshot(latestSession()));

    const session = getSession(parts[2]);
    if (!session) return send(res, 404, { error: 'Unknown session' });

    if (method === 'GET' && parts.length === 3) return send(res, 200, snapshot(session));

    // POST /api/sessions/:id/audio  (raw WAV body from the phone)
    if (method === 'POST' && parts[3] === 'audio') {
      const audio = await readBody(req, MAX_AUDIO_BYTES);
      let heard = '';
      try {
        heard = await transcribe(audio, req.headers['content-type'] || 'audio/wav');
      } catch (err) {
        console.error('[stt]', err.message);
        return send(res, 502, { error: err.message, ...snapshot(session) });
      }
      if (heard) {
        console.log(`[${session.id}] heard: ${heard}`);
        await addText(session, heard, { speaker: 'call' });
        logRisk(session);
      }
      return send(res, 200, { heard, ...snapshot(session) });
    }

    // POST /api/sessions/:id/text  {text, speaker}  (demo mode / testing)
    if (method === 'POST' && parts[3] === 'text') {
      const body = await readJson(req);
      await addText(session, body.text, { speaker: body.speaker || 'caller' });
      logRisk(session);
      return send(res, 200, snapshot(session));
    }

    // POST /api/sessions/:id/end
    if (method === 'POST' && parts[3] === 'end') {
      endSession(session);
      console.log(`[call] ended ${session.id}, final risk ${session.risk.score}`);
      return send(res, 200, snapshot(session));
    }
  }

  return send(res, 404, { error: 'Not found' });
}

function logRisk(s) {
  const r = s.risk;
  console.log(`[${s.id}] risk ${r.score} ${r.level}${r.alert ? '  🚨 ALERT' : ''}  stages: ${r.detected.join(', ') || '-'}`);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: err.message });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log('\n🛡️  Kavach backend is running');
  console.log(`   Dashboard:  http://localhost:${PORT}`);
  for (const ip of ips) console.log(`   Phone URL:  http://${ip}:${PORT}   <- type this in the app's Settings`);
  console.log(`   Groq:       ${groqEnabled() ? 'ON' : 'OFF (set GROQ_API_KEY in .env)'}`);
  console.log(`   Telegram:   ${telegramEnabled() ? 'ON' : 'OFF (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)'}\n`);
});
