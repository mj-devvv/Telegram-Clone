/**
 * Isolated mock networking service (stands in for a WebSocket).
 * Knows only the store's dispatch API, never the DOM -> swappable for a real socket.
 *
 * Send path: SEND_MESSAGE (optimistic render) -> SET_TYPING(true) -> timer(1.5-3s) ->
 * SET_TYPING(false) + RECEIVE_MESSAGE. Offline sends are queued and flushed on reconnect.
 *
 * LIFECYCLE: each in-flight reply is a "job" holding a setTimeout handle. On channel change
 * `settleExcept` cancels the timers of other rooms and commits their frames immediately (as a real
 * socket would already have delivered them), so no timer fires against a torn-down view
 * and no message is lost.
 */
import { A } from '../core/store.js';
import { CONFIG } from '../config.js';
import { REPLIES, uid } from '../data/mockData.js';

const rand = (min, max) => min + Math.random() * (max - min);

export function createMockSocket(store) {
  /** @type {Set<{roomId:string,timer:number,commit:()=>void}>} */
  const jobs = new Set();
  const outbox = [];

  function scheduleReply(roomId) {
    store.dispatch({ type: A.SET_TYPING, roomId, value: true });
    const job = { roomId, timer: 0, commit() {
      clearTimeout(job.timer); jobs.delete(job);
      if (![...jobs].some((j) => j.roomId === roomId)) store.dispatch({ type: A.SET_TYPING, roomId, value: false });
      const text = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      store.dispatch({ type: A.RECEIVE_MESSAGE, message: { id: uid(), roomId, author: 'them', text, ts: Date.now(), status: 'sent' } });
    } };
    job.timer = setTimeout(job.commit, rand(CONFIG.REPLY_MIN_MS, CONFIG.REPLY_MAX_MS));
    jobs.add(job);
  }

  return {
    send(roomId, text) {
      const online = store.getState().app.online;
      const message = { id: uid(), roomId, author: 'me', text, ts: Date.now(), status: online ? 'sent' : 'queued' };
      store.dispatch({ type: A.SEND_MESSAGE, message });
      if (online) scheduleReply(roomId); else outbox.push(message);
    },
    /** Called on the `online` event: drain queue in order. */
    flush() {
      while (outbox.length) {
        const m = outbox.shift();
        store.dispatch({ type: A.MARK_SENT, id: m.id });
        scheduleReply(m.roomId);
      }
    },
    /** Clears transient jobs of every room except the newly active one. */
    settleExcept(activeRoomId) {
      [...jobs].filter((j) => j.roomId !== activeRoomId).forEach((j) => j.commit());
    },
  };
}
