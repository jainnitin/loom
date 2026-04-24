import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite config tailored for Tauri: fixed dev port, host binding for the webview,
// and the `TAURI_*` env vars threaded through from the CLI.
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 1421 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*', 'TAURI_PLATFORM', 'TAURI_FAMILY', 'TAURI_ARCH'],
  build: {
    // Tauri ships its own WebKit/WebView2 so we can target evergreen engines.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari16',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    outDir: 'dist',
  },
}))
