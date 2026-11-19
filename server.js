'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { composeAnswer, areas } = require('./lib/engine');
const { calcularIndemnizacion } = require('./lib/calc');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath === '' || safePath === '.' ? 'index.html' : safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e5) { req.destroy(); reject(new Error('Payload demasiado grande')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJSON(req) {
  const raw = await readBody(req);
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJSON(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/ask' && req.method === 'POST') {
      const body = await readJSON(req);
      sendJSON(res, 200, { answer: composeAnswer(String(body.message || '')) });
      return;
    }

    if (pathname === '/api/areas' && req.method === 'GET') {
      sendJSON(res, 200, {
        areas: areas.map((a) => ({
          id: a.id,
          num: a.num,
          titulo: a.titulo,
          temas: a.temas.map((t) => ({ id: t.id, titulo: t.titulo })),
        })),
      });
      return;
    }

    if (pathname === '/api/calc/indemnizacion' && req.method === 'POST') {
      const body = await readJSON(req);
      const result = calcularIndemnizacion(body);
      sendJSON(res, result.ok ? 200 : 400, result);
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJSON(res, 404, { error: 'Ruta no encontrada' });
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    sendJSON(res, 500, { error: 'Error interno', detail: String((err && err.message) || err) });
  }
});

server.listen(PORT, () => {
  console.log(`BUSCALEGAL corriendo en http://localhost:${PORT}`);
});
