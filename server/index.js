import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial = {
      appData: null,
      users: [],
    };
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    appData: parsed.appData ?? null,
    users: Array.isArray(parsed.users) ? parsed.users : [],
  };
}

async function writeStore(nextStore) {
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(DATA_FILE, JSON.stringify(nextStore, null, 2), 'utf8');
  });
  return writeQueue;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/app-data', async (_req, res) => {
  try {
    const store = await readStore();
    res.json({ data: store.appData });
  } catch {
    res.status(500).json({ error: 'Failed to read app data.' });
  }
});

app.put('/api/app-data', async (req, res) => {
  try {
    const nextData = req.body;
    const store = await readStore();
    await writeStore({ ...store, appData: nextData });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to write app data.' });
  }
});

app.get('/api/users', async (_req, res) => {
  try {
    const store = await readStore();
    res.json({ users: store.users });
  } catch {
    res.status(500).json({ error: 'Failed to read users.' });
  }
});

app.put('/api/users', async (req, res) => {
  try {
    const users = Array.isArray(req.body) ? req.body : [];
    const store = await readStore();
    await writeStore({ ...store, users });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to write users.' });
  }
});

app.listen(PORT, async () => {
  await ensureStoreFile();
  console.log(`Org Manager backend listening on http://localhost:${PORT}`);
});
