import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function classicScriptHtml() {
  return {
    name: 'mahar-shwe-classic-script-html',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (ctx.server) return html;
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<script type="module" src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>');
    }
  };
}

export default defineConfig({
  root: 'client',
  base: './',
  plugins: [react(), classicScriptHtml()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
