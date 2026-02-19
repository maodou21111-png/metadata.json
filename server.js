const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const REWARD_BALLS = [
  ...Array(8).fill(5000),
  ...Array(3).fill(10000),
  ...Array(2).fill(50000),
  100000,
];

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], shotRecords: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function loadDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function randomReward() {
  const index = Math.floor(Math.random() * REWARD_BALLS.length);
  return REWARD_BALLS[index];
}

function getUserByCode(db, code) {
  return db.users.find((u) => u.verificationCode === code);
}

function routeApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/register') {
    return parseBody(req)
      .then((body) => {
        const name = String(body.name || '').trim();
        if (!name) return sendJson(res, 400, { error: 'name is required' });

        const db = loadDb();
        let code = generateCode();
        while (getUserByCode(db, code)) code = generateCode();

        const user = {
          id: crypto.randomUUID(),
          name,
          verificationCode: code,
          attemptsLeft: 0,
          totalReward: 0,
          createdAt: new Date().toISOString(),
        };

        db.users.push(user);
        saveDb(db);
        return sendJson(res, 201, user);
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/add-attempts') {
    return parseBody(req)
      .then((body) => {
        const code = String(body.verificationCode || '').trim().toUpperCase();
        const attempts = Number(body.attempts);
        if (!code || !Number.isInteger(attempts) || attempts <= 0) {
          return sendJson(res, 400, { error: 'verificationCode and positive integer attempts required' });
        }

        const db = loadDb();
        const user = getUserByCode(db, code);
        if (!user) return sendJson(res, 404, { error: 'user not found' });

        user.attemptsLeft += attempts;
        saveDb(db);
        return sendJson(res, 200, user);
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  if (req.method === 'POST' && url.pathname === '/api/shoot') {
    return parseBody(req)
      .then((body) => {
        const code = String(body.verificationCode || '').trim().toUpperCase();
        const powerAction = String(body.powerAction || 'tap'); // tap = reduce, longpress = increase
        if (!code) return sendJson(res, 400, { error: 'verificationCode is required' });

        const db = loadDb();
        const user = getUserByCode(db, code);
        if (!user) return sendJson(res, 404, { error: 'user not found' });
        if (user.attemptsLeft <= 0) return sendJson(res, 400, { error: 'no attempts left' });

        const power = powerAction === 'longpress' ? 'high' : 'low';
        const trajectorySeed = Math.floor(Math.random() * 10000);
        const reward = randomReward();

        user.attemptsLeft -= 1;
        user.totalReward += reward;

        const shot = {
          id: crypto.randomUUID(),
          userId: user.id,
          verificationCode: user.verificationCode,
          power,
          trajectorySeed,
          reward,
          createdAt: new Date().toISOString(),
        };

        db.shotRecords.push(shot);
        saveDb(db);

        return sendJson(res, 200, {
          shot,
          attemptsLeft: user.attemptsLeft,
          totalReward: user.totalReward,
        });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  if (req.method === 'GET' && url.pathname === '/api/user') {
    const code = String(url.searchParams.get('verificationCode') || '').trim().toUpperCase();
    if (!code) return sendJson(res, 400, { error: 'verificationCode is required' });
    const db = loadDb();
    const user = getUserByCode(db, code);
    if (!user) return sendJson(res, 404, { error: 'user not found' });
    const records = db.shotRecords.filter((r) => r.verificationCode === code).slice(-10).reverse();
    return sendJson(res, 200, { user, recentShots: records });
  }

  return false;
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = reqPath.split('?')[0];
  const filePath = path.join(PUBLIC_DIR, path.normalize(reqPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
    return res.end(data);
  });
}

ensureDb();

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const handled = routeApi(req, res);
    if (handled === false) sendJson(res, 404, { error: 'not found' });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
