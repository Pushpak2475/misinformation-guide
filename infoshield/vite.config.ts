import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
