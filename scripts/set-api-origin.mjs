import { readFileSync, writeFileSync } from 'node:fs';

const value = process.argv[2];
if (!value) throw new Error('Uso: node scripts/set-api-origin.mjs https://DOMINIO-REAL-DO-BACKEND [--check]');
const origin = new URL(value);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
  throw new Error('Informe somente a origem HTTPS do backend, sem credenciais, /api, parâmetros ou caminhos.');
}
const path = new URL('../vercel.json', import.meta.url);
const config = JSON.parse(readFileSync(path, 'utf8'));
const rewrite = config.rewrites?.find(rule => rule.source === '/api/:path*');
if (!rewrite || config.rewrites[0] !== rewrite) throw new Error('A regra /api deve existir antes do fallback da SPA.');
rewrite.destination = `${origin.origin}/api/:path*`;
if (process.argv.includes('--check')) console.log(`Prévia: /api/:path* → ${rewrite.destination}`);
else {
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Proxy atualizado: /api/:path* → ${rewrite.destination}`);
}
