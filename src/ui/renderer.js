/**
 * Data Renderers: the only module that touches the DOM.
 *
 * SECURITY: every user-controlled string (titles, message text) goes through
 * `Node.textContent` / createTextNode into DocumentFragments. There is no innerHTML,
 * insertAdjacentHTML, or attribute interpolation of untrusted data, so DOM-XSS has no sink.
 *
 * RENDER LOOP: subscribers run synchronously on dispatch, but DOM writes for a state change are
 * batched into fragments and committed once per region (1 layout each). Scrolling is deferred
 * into a single requestAnimationFrame so bursts of mutations collapse into one smooth scroll
 * after layout settles, avoiding flicker and forced synchronous layout.
 */
import { selectVisibleConversations } from '../core/store.js';

const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text; // text-only boundary
  return n;
};

export function createRenderer(refs, store) {
  let prev = null, scrollQueued = false;
  const sentinel = el('div', 'sentinel');
  /** msgId -> meta node (for in-place status updates without rebuilding bubbles) */
  const metaNodes = new Map();

  function scheduleScrollToEnd() {
    if (scrollQueued) return; // coalesce rapid mutations
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      sentinel.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  const tick = (m) => (m.author === 'me' ? (m.status === 'queued' ? ' 🕓' : ' ✓') : '');

  function messageNode(m) {
    const row = el('div', `msg msg--${m.author === 'me' ? 'out' : 'in'}`);
    const bubble = el('div', 'bubble');
    const meta = el('span', 'meta', fmtTime(m.ts) + tick(m));
    bubble.append(document.createTextNode(m.text), meta);
    row.append(bubble);
    metaNodes.set(m.id, meta);
    return row;
  }

  function renderSidebar(s) {
    const frag = document.createDocumentFragment();
    const list = selectVisibleConversations(s);
    if (!list.length) frag.append(el('li', 'empty', 'No chats found'));
    for (const c of list) {
      const last = c.lastMessageId ? s.entities.messages.byId[c.lastMessageId] : null;
      const li = el('li', `chat-item${c.id === s.app.activeChannelId ? ' is-active' : ''}`);
      li.dataset.roomId = c.id; li.tabIndex = 0; li.setAttribute('role', 'button');
      const av = el('div', 'avatar', Array.from(c.title)[0] || '?');
      av.style.background = c.color; // trusted palette from config
      li.append(av, el('span', 'chat-item__name', c.title), el('span', 'chat-item__time', last ? fmtTime(last.ts) : ''),
        el('span', `chat-item__preview${c.typing ? ' is-typing' : ''}`, c.typing ? 'typing…' : last ? last.text : ''),
        c.unread ? el('span', 'badge', String(c.unread)) : el('span'));
      frag.append(li);
    }
    refs.list.replaceChildren(frag); // single DOM commit
  }

  function renderHeader(s) {
    const c = s.entities.conversations[s.app.activeChannelId];
    refs.chat.classList.toggle('is-idle', !c);
    refs.title.textContent = c ? c.title : 'Select a chat to start messaging';
    refs.status.textContent = c ? (c.typing ? 'typing…' : s.app.online ? 'online' : 'connecting…') : '';
    refs.status.classList.toggle('is-typing', !!c && c.typing);
  }

  /** Full rebuild on channel change: flush draft buffer, rebuild timeline, then jump to end. */
  function rebuildThread(s) {
    refs.input.value = ''; refs.input.style.height = '';
    metaNodes.clear();
    const frag = document.createDocumentFragment();
    const ids = s.entities.messages.idsByRoom[s.app.activeChannelId] || [];
    if (!ids.length) frag.append(el('div', 'timeline__empty', 'No messages here yet'));
    for (const id of ids) frag.append(messageNode(s.entities.messages.byId[id]));
    frag.append(sentinel);
    refs.timeline.replaceChildren(frag);
    refs.timeline.scrollTop = refs.timeline.scrollHeight; // instant jump; smooth only for live updates
  }

  function appendNew(s, fromIdx) {
    const ids = s.entities.messages.idsByRoom[s.app.activeChannelId];
    const frag = document.createDocumentFragment();
    refs.timeline.querySelector('.timeline__empty')?.remove();
    for (let i = fromIdx; i < ids.length; i++) frag.append(messageNode(s.entities.messages.byId[ids[i]]));
    refs.timeline.insertBefore(frag, sentinel);
    scheduleScrollToEnd();
  }

  function render(s) {
    const a = s.app, p = prev?.app;
    if (!prev || a.theme !== p.theme) document.documentElement.dataset.theme = a.theme;
    if (!prev || a.online !== p.online) refs.banner.hidden = a.online;
    if (!prev || a.navStack !== p.navStack) refs.app.classList.toggle('is-chat-open', a.navStack.at(-1) === 'chat');

    const convChanged = !prev || s.entities.conversations !== prev.entities.conversations;
    if (convChanged || a.search !== p.search || a.activeChannelId !== p.activeChannelId) renderSidebar(s);

    const channelChanged = !prev || a.activeChannelId !== p.activeChannelId;
    if (channelChanged || convChanged || a.online !== p.online) renderHeader(s);
    if (channelChanged) { if (a.activeChannelId) rebuildThread(s); }
    else if (a.activeChannelId && s.entities.messages !== prev.entities.messages) {
      const key = a.activeChannelId;
      const before = prev.entities.messages.idsByRoom[key]?.length || 0;
      const ids = s.entities.messages.idsByRoom[key];
      if (ids.length > before) appendNew(s, before);
      for (const id of ids) { // in-place status patches (queued -> sent)
        const m = s.entities.messages.byId[id];
        if (m !== prev.entities.messages.byId[id] && metaNodes.has(id)) metaNodes.get(id).textContent = fmtTime(m.ts) + tick(m);
      }
    }
    prev = s;
  }

  return { init() { render(store.getState()); return store.subscribe(render); } };
}
