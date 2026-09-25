import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA = path.join(ROOT, 'lab', 'data');
export const STYLES = path.join(DATA, 'styles');
export const PROJECTS = path.join(DATA, 'projects');
for (const d of [STYLES, PROJECTS]) fs.mkdirSync(d, {recursive: true});

export const newId = (name) => {
  const slug = String(name || 'item').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'item';
  return `${slug}-${crypto.randomBytes(3).toString('hex')}`;
};

export const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
export const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
};

export const dirOf = (kind, id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('id inválido');
  return path.join(kind === 'style' ? STYLES : PROJECTS, id);
};
export const metaPath = (kind, id) => path.join(dirOf(kind, id), 'meta.json');
export const getMeta = (kind, id) => readJson(metaPath(kind, id));
export const saveMeta = (kind, id, patch) => {
  const cur = getMeta(kind, id) ?? {};
  const next = {...cur, ...patch, updatedAt: Date.now()};
  writeJson(metaPath(kind, id), next);
  return next;
};
export const list = (kind) => {
  const base = kind === 'style' ? STYLES : PROJECTS;
  return fs.readdirSync(base)
    .map((id) => readJson(path.join(base, id, 'meta.json')))
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
};

/** URL (served by the Lab server) for a file inside lab/data. */
export const mediaUrl = (absPath) => `/media/${path.relative(DATA, absPath).split(path.sep).join('/')}`;
