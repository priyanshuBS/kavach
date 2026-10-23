// Sends the family alert through a Telegram bot.

const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = () => process.env.TELEGRAM_CHAT_ID?.trim();
export const telegramEnabled = () => Boolean(token() && chatId());

export async function sendTelegram(text) {
  if (!telegramEnabled()) {
    console.warn('[telegram] not configured, alert not sent');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId(), text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return true;
  } catch (err) {
    console.error('[telegram] failed:', err.message);
    return false;
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function alertMessage(session) {
  const name = process.env.PROTECTED_PERSON_NAME || 'your family member';
  const evidence = session.transcript
    .slice(-3)
    .map((l) => `• <i>${esc(l.text.slice(0, 140))}</i>`)
    .join('\n');
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return [
    `🚨 <b>KAVACH ALERT: possible digital arrest scam</b>`,
    ``,
    `${esc(name)} is on a call that matches the scam script (risk ${session.risk.score}/100, ${time}).`,
    `Stages seen: <b>${esc(session.risk.detected.join(', ') || '-')}</b>`,
    ``,
    `Last words heard:`,
    evidence,
    ``,
    `👉 Call them now and tell them to hang up. Real police never arrest anyone on a video call.`,
    `Report at 1930 or cybercrime.gov.in`,
  ].join('\n');
}
