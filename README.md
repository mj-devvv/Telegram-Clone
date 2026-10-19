# Telegram Web Client (Vanilla Core Architecture)

A high-performance, bare-metal instant messaging workspace interface built entirely from scratch with **zero external dependencies**. This application replicates the structural multi-panel viewport layout of the Telegram Web ecosystem while showcasing clean engineering practices using pure **Vanilla HTML5, CSS3, and modern ECMAScript (ES6+)**.

Instead of relying on heavy framework runtimes or layout utilities, the client utilizes low-latency DOM operations, hardware-accelerated transitions, and a strict single-source-of-truth state container.

---

##  Architectural Core & Features

* **Centralized Data Engine:** Implements an immutable unidirectional state machine tracking channels, messages, and user presence metadata. Layout updates are localized to prevent unnecessary repaint cycles.
* **Isolated Asynchronous Simulation:** Emulates real-world WebSocket streams using asynchronous loop tasks. Features randomized network latency delay simulators and simulated typing presence indicators.
* **Hardened XSS Protection:** Enforces a strict text-only rendering pipeline. Every single message stream or user string interpolation completely circumvents standard string manipulation, interfacing natively through `Node.textContent` and `DocumentFragment` updates.
* **Debounced Search Indexing:** Includes a conversation and contact indexing system running on an optimized `150ms` input debounce window to keep the main thread unblocked during typing.
* **GPU-Accelerated Mobile Viewports:** Uses flexible grid spaces combined with hardware-accelerated transforms (`transform: translateX()`) to transition panels seamlessly below mobile layout breakpoints.


---

## Performance Optimization Metrics

### Paint Loop Optimization
To ensure rapid message insertions do not stutter during active layout mutation windows, conversational updates are scheduled directly through the hardware frame scheduler:

```javascript
// Frame timing optimization strategy
requestAnimationFrame(() => {
  timelineContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
});
```
This pattern drops layout calculation operations to an absolute minimum, ensuring a continuous lock on smooth performance frames even during rapid data bursts.

### Design System Variables
The presentation layer is controlled by centralized design parameters using CSS Custom Properties for immediate runtime modifications:

```css
:root {
  --color-surface-background: #0e1621;
  --color-surface-sidebar: #17212b;
  --color-bubble-outgoing: #2b5278;
  --color-bubble-incoming: #182533;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #7f91a4;
  --color-action-interactive: #5288c1;
}
```

---

## Initialization & Running

Because this codebase is built completely free of bundlers, compilers, or asset managers, it runs natively on any standard web browser:

1. **Clone the project files:**
   ```bash
   git clone https://github.com
   cd telegram-web-vanilla
   ```

2. **Spin up a local listener endpoint:**
   ```bash
   # Utilizing built-in python servers
   python3 -m http.server 8000
   
   # Or via standard node commands
   npx serve .
   ```

3. Open **`http://localhost:8000`** in your target browser context.
