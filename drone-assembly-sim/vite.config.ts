import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
/** Production cache contains only this build's local HTML, JS and CSS. */
function offlineCache(): Plugin {
  return { name: 'local-offline-cache', apply: 'build', generateBundle(_options, bundle) {
    const assets = ['/', '/index.html', ...Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).map(name => `/${name}`)];
    const cacheName = `drone-assembly-v2-${Object.keys(bundle).filter(name => name.endsWith('.js')).join('-')}`;
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: `const CACHE = ${JSON.stringify(cacheName)};\nconst ASSETS = ${JSON.stringify(assets)};\nself.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });\nself.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });\nself.addEventListener('fetch', event => { const url = new URL(event.request.url); if (event.request.method !== 'GET' || url.origin !== self.location.origin) return; event.respondWith(caches.open(CACHE).then(async cache => { const cached = await cache.match(event.request, { ignoreVary: true }); if (cached) return cached; try { return await fetch(event.request); } catch (error) { if (event.request.mode === 'navigate') return (await cache.match('/index.html')) || Response.error(); throw error; } })); });\n` });
  } };
}
export default defineConfig({
  plugins: [react(), offlineCache()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'" } },
});
