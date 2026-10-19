/**
 * Composition root. Wires Store -> Socket -> Renderer -> Handlers.
 * Modules are statically imported, so the browser fetches them in parallel and the
 * module graph evaluates once, deferred until the document is parsed (no DOMContentLoaded wait).
 */
import { createStore } from './core/store.js';
import { createInitialState } from './data/mockData.js';
import { createMockSocket } from './services/mockSocket.js';
import { createRenderer } from './ui/renderer.js';
import { bindHandlers } from './ui/handlers.js';

const $ = (id) => document.getElementById(id);
const refs = {
  app: $('app'), chat: document.querySelector('.chat'), list: $('chat-list'), search: $('search'),
  theme: $('theme-btn'), banner: $('offline-banner'), back: $('back-btn'), title: $('chat-title'),
  status: $('chat-status'), timeline: $('timeline'), composer: $('composer'), input: $('input'),
};

const store = createStore(createInitialState());
const socket = createMockSocket(store);
createRenderer(refs, store).init();
bindHandlers({ refs, store, socket });
