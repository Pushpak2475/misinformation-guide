import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── Node.js polyfill: CustomEvent ───────────────────────────────────────────
// Vite 8 uses CustomEvent internally. Some Netlify build containers do not
// expose it as a global even on Node 18/20. This minimal polyfill ensures
// it is always available before Vite's CLI code runs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).CustomEvent === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).CustomEvent = class CustomEvent extends Event {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly detail: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(type: string, init?: { bubbles?: boolean; cancelable?: boolean; detail?: any }) {
      super(type, init);
      this.detail = init?.detail ?? null;
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Forward Netlify Function calls to the local functions server.
      // Run: netlify functions:serve --port 8888  (in a separate terminal)
      // OR:  netlify dev  (starts both Vite + functions together on port 8888)
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
