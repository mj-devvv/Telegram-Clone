/**
 * Event Handlers: translate DOM events into store actions / service calls. No rendering here.
 *
 * PERF: one delegated click/keydown listener on the list instead of N per-row listeners
 * (constant memory, survives full list rebuilds). Search is debounced to CONFIG.SEARCH_DEBOUNCE_MS.
 * An AbortController signal removes every listener on dispose (no leaks).
 */
import { A } from '../core/store.js';
import { CONFIG } from '../config.js';

export function debounce(fn, ms) {
  let t = 0;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}

export function bindHandlers({ refs, store, socket }) {
  const ac = new AbortController();
  const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ac.signal });

  function selectRoom(id) {
    store.dispatch({ type: A.SET_ACTIVE, id });  // triggers thread rebuild + draft flush in renderer
    socket.settleExcept(id);                     // clear transient typing/reply timers of other rooms
  }

  const applySearch = debounce((q) => store.dispatch({ type: A.SET_SEARCH, query: q }), CONFIG.SEARCH_DEBOUNCE_MS);
  on(refs.search, 'input', (e) => applySearch(e.target.value));

  on(refs.list, 'click', (e) => { const li = e.target.closest('.chat-item'); if (li) selectRoom(li.dataset.roomId); });
  on(refs.list, 'keydown', (e) => {
    const li = e.target.closest('.chat-item');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectRoom(li.dataset.roomId); }
  });

  function submit() {
    const text = refs.input.value.trim();
    const room = store.getState().app.activeChannelId;
    if (!text || !room) return;
    refs.input.value = ''; refs.input.style.height = '';
    socket.send(room, text);
  }
  on(refs.composer, 'submit', (e) => { e.preventDefault(); submit(); });
  on(refs.input, 'keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  on(refs.input, 'input', () => { // autosize: reset, read scrollHeight once, write once
    refs.input.style.height = 'auto';
    refs.input.style.height = `${refs.input.scrollHeight}px`;
  });

  on(refs.back, 'click', () => store.dispatch({ type: A.NAV_POP }));
  on(document, 'keydown', (e) => { if (e.key === 'Escape') store.dispatch({ type: A.NAV_POP }); });
  on(refs.theme, 'click', () =>
    store.dispatch({ type: A.SET_THEME, theme: store.getState().app.theme === 'dark' ? 'light' : 'dark' }));

  on(window, 'online', () => { store.dispatch({ type: A.SET_NETWORK, online: true }); socket.flush(); });
  on(window, 'offline', () => store.dispatch({ type: A.SET_NETWORK, online: false }));

  return () => { ac.abort(); applySearch.cancel(); };
}
