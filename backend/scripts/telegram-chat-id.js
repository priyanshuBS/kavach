// Finds your Telegram chat ID.
// 1. Put TELEGRAM_BOT_TOKEN in backend/.env
// 2. Open your bot in Telegram (the family member's phone) and send it any message, e.g. "hi"
// 3. Run:  npm run telegram:chatid

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.log('Set TELEGRAM_BOT_TOKEN in backend/.env first (get it from @BotFather in Telegram).');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await res.json();
if (!data.ok) {
  console.log('Telegram said:', data.description);
  process.exit(1);
}
const chats = new Map();
for (const u of data.result) {
  const chat = (u.message || u.channel_post || u.my_chat_member)?.chat;
  if (chat) chats.set(chat.id, chat.first_name || chat.title || chat.username || '');
}
if (!chats.size) {
  console.log('No messages yet. Send "hi" to your bot in Telegram, then run this again.');
} else {
  console.log('Found these chats. Copy the ID into TELEGRAM_CHAT_ID in backend/.env:\n');
  for (const [id, name] of chats) console.log(`  ${id}   (${name})`);
}
