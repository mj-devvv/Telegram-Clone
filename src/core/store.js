/**
 * Unified State Engine: Redux-style immutable store, zero dependencies.
 *
 * PERF: reducers use structural sharing (only changed branches get new references), so the
 * renderer can detect changes with `===` in O(1) instead of deep-diffing. Frozen objects make
 * accidental mutation throw (ES modules are always strict mode).
 *
 * @typedef {{id:string,roomId:string,author:'me'|'them',text:string,ts:number,status:'queued'|'sent'}} Message
 * @typedef {{id:string,title:string,color:string,unread:number,typing:boolean,lastMessageId:string|null}} Conversation
 * @typedef {{
 *   app:{navStack:('list'|'chat')[],activeChannelId:string|null,theme:'dark'|'light',online:boolean,search:string},
 *   entities:{conversations:Record<string,Conversation>,
 *             messages:{byId:Record<string,Message>,idsByRoom:Record<string,string[]>}}
 * }} AppState
 */

export const A = Object.freeze({
  SET_ACTIVE: 'SET_ACTIVE', NAV_POP: 'NAV_POP', SET_THEME: 'SET_THEME', SET_NETWORK: 'SET_NETWORK',
  SET_SEARCH: 'SET_SEARCH', SEND_MESSAGE: 'SEND_MESSAGE', RECEIVE_MESSAGE: 'RECEIVE_MESSAGE',
  SET_TYPING: 'SET_TYPING', MARK_SENT: 'MARK_SENT',
});

const f = Object.freeze;
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(deepFreeze); f(o); }
  return o;
}

/** Appends a message immutably; only touched maps/arrays are re-created. */
function appendMessage(s, msg, unreadInc) {
  const { conversations } = s.entities, { byId, idsByRoom } = s.entities.messages;
  const conv = conversations[msg.roomId];
  return f({ ...s, entities: f({
    conversations: f({ ...conversations, [conv.id]: f({ ...conv, lastMessageId: msg.id, unread: conv.unread + unreadInc }) }),
    messages: f({ byId: f({ ...byId, [msg.id]: f(msg) }), idsByRoom: f({ ...idsByRoom, [conv.id]: f([...(idsByRoom[conv.id] || []), msg.id]) }) }),
  }) });
}

/** @returns {AppState} */
export function reducer(s, a) {
  const app = (patch) => f({ ...s, app: f({ ...s.app, ...patch }) });
  switch (a.type) {
    case A.SET_ACTIVE: {
      const c = s.entities.conversations[a.id];
      if (!c) return s;
      const next = app({ activeChannelId: a.id, navStack: f(['list', 'chat']) });
      return f({ ...next, entities: f({ ...next.entities, conversations: f({ ...next.entities.conversations, [a.id]: f({ ...c, unread: 0 }) }) }) });
    }
    case A.NAV_POP: return s.app.navStack.length > 1 ? app({ navStack: f(s.app.navStack.slice(0, -1)) }) : s;
    case A.SET_THEME: return s.app.theme === a.theme ? s : app({ theme: a.theme });
    case A.SET_NETWORK: return s.app.online === a.online ? s : app({ online: a.online });
    case A.SET_SEARCH: return s.app.search === a.query ? s : app({ search: a.query });
    case A.SEND_MESSAGE: return appendMessage(s, a.message, 0);
    case A.RECEIVE_MESSAGE: return appendMessage(s, a.message, a.message.roomId === s.app.activeChannelId ? 0 : 1);
    case A.MARK_SENT: {
      const m = s.entities.messages.byId[a.id];
      if (!m || m.status === 'sent') return s;
      const { messages } = s.entities;
      return f({ ...s, entities: f({ ...s.entities, messages: f({ ...messages, byId: f({ ...messages.byId, [a.id]: f({ ...m, status: 'sent' }) }) }) }) });
    }
    case A.SET_TYPING: {
      const c = s.entities.conversations[a.roomId];
      if (!c || c.typing === a.value) return s;
      return f({ ...s, entities: f({ ...s.entities, conversations: f({ ...s.entities.conversations, [c.id]: f({ ...c, typing: a.value }) }) }) });
    }
    default: return s;
  }
}

export function createStore(initial) {
  let state = deepFreeze(initial);
  const subs = new Set();
  return {
    getState: () => state,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return; // no-op actions never wake subscribers
      state = next;
      subs.forEach((fn) => fn(state, action));
    },
  };
}

/** Selector: case-insensitive substring match over title + last-message preview, newest first. */
export function selectVisibleConversations(s) {
  const q = s.app.search.trim().toLowerCase();
  const { byId } = s.entities.messages;
  const ts = (c) => (c.lastMessageId ? byId[c.lastMessageId].ts : 0);
  return Object.values(s.entities.conversations)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || (c.lastMessageId && byId[c.lastMessageId].text.toLowerCase().includes(q)))
    .sort((a, b) => ts(b) - ts(a));
}
