# Telegram Web (Vanilla JS)
Zero dependencies, zero build. Native ES modules + JSDoc types (TypeScript would require a compiler).

Run (ES modules need http, not file://):
    python3 -m http.server 8080   # then open http://localhost:8080

Layout: src/config.js (config) · src/core/store.js (state engine) · src/data/mockData.js (mock data)
· src/services/mockSocket.js (mock protocol) · src/ui/renderer.js (renderers) · src/ui/handlers.js (events)
