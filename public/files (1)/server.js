/* PULSE — classroom server.
   Run:  node server.js          (default port 8080)
         node server.js 3000     (custom port)

   No dependencies. Holds the session in memory and writes a backup to
   pulse-state.json after every change, so a crash or a laptop sleep
   doesn't lose the day.
*/
const http = require('http');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const PORT  = Number(process.argv[2]) || 8080;
const HTML  = path.join(__dirname, 'index.html');
const STORE = path.join(__dirname, 'pulse-state.json');

let state = { seed: 20260810, startedAt: null, pausedAt: null, pausedMs: 0, day: 1, votes: {} };
try { if (fs.existsSync(STORE)) state = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) {}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(STORE, JSON.stringify(state), () => {});
  }, 400);
}

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}
const json = (res, obj) => send(res, 200, JSON.stringify(obj), 'application/json');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain');

  if (url.pathname === '/api/state') return json(res, state);

  if (url.pathname === '/api/patch' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      let p;
      try { p = JSON.parse(raw); } catch (e) { return send(res, 400, '{"error":"bad json"}', 'application/json'); }

      if (p.vote && typeof p.vote.code === 'string') {
        const { code, w, v } = p.vote;
        if (Number.isInteger(w) && w >= 0 && Number.isInteger(v) && v >= 1 && v <= 7) {
          (state.votes[code] ||= {})[w] = v;
        }
      }
      if (p.session && typeof p.session === 'object') {
        for (const k of ['seed', 'startedAt', 'pausedAt', 'pausedMs', 'day', 'votes', 'rehearseSpeed']) {
          if (k in p.session) state[k] = p.session[k];
        }
      }
      save();
      json(res, state);
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(HTML, (err, buf) => {
      if (err) return send(res, 500, 'index.html not found next to server.js', 'text/plain');
      send(res, 200, buf, 'text/html; charset=utf-8');
    });
    return;
  }

  send(res, 404, 'not here', 'text/plain');
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets))
    for (const n of nets[name] || [])
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);

  console.log('\n  PULSE is up.\n');
  console.log('  Instructor board   http://localhost:' + PORT + '/?r=h');
  ips.forEach(ip => console.log('  Students           http://' + ip + ':' + PORT + '/?r=s'));
  console.log('\n  Open the board, hit "Join screen", project it. Ctrl+C to stop.\n');
});
