/**
 * Mock Data Engine: builds the normalized initial state (entities keyed by id, messages in a
 * flat id->record map plus per-room ordered id lists). Normalization keeps updates O(1) and
 * lets the renderer append only new ids rather than rebuilding whole arrays of objects.
 */
import { CONFIG } from '../config.js';

const SEED = [
  ['Saved Messages', ['Remember to ship the demo', 'Draft the release notes']],
  ['Ada Lovelace', ['Have you seen the new engine design?', 'Send me the notes when ready.']],
  ['Dev Team', ['Standup in 5', 'Build is green 🎉']],
  ['Mum', ['Call me when you land', 'Did you eat?']],
  ['Design Guild', ['New icon set uploaded', 'Dark theme tokens look great']],
  ['Lagos Tech Meetup', ['Venue confirmed for Saturday', 'Who is bringing the projector?']],
];

export const REPLIES = ['Got it 👍', 'Interesting, tell me more.', 'Let me check and get back to you.',
  'Haha, exactly!', 'Sounds good to me.', 'Can we talk about it tomorrow?', 'On it.'];

export const uid = () => `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function createInitialState(now = Date.now()) {
  const conversations = {}, byId = {}, idsByRoom = {};
  SEED.forEach(([title, lines], i) => {
    const id = `room_${i}`;
    idsByRoom[id] = [];
    lines.forEach((text, j) => {
      const m = { id: `seed_${i}_${j}`, roomId: id, author: j % 2 ? 'me' : 'them', text, ts: now - (SEED.length - i) * 3.6e6 + j * 6e4, status: 'sent' };
      byId[m.id] = m; idsByRoom[id].push(m.id);
    });
    conversations[id] = { id, title, color: CONFIG.AVATAR_COLORS[i % CONFIG.AVATAR_COLORS.length], unread: i % 3 === 2 ? 2 : 0, typing: false, lastMessageId: idsByRoom[id].at(-1) };
  });
  return {
    app: { navStack: ['list'], activeChannelId: null, theme: 'dark', online: navigator.onLine, search: '' },
    entities: { conversations, messages: { byId, idsByRoom } },
  };
}
