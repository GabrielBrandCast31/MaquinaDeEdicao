import {AsyncLocalStorage} from 'node:async_hooks';

/**
 * The job currently running (set by the server around each job): {cancelled, children, onCancel, job}.
 * Spawned processes register here so they can be cancelled, and queued work can be dropped.
 */
export const jobCtx = new AsyncLocalStorage();

export const track = (child) => {
  const ctl = jobCtx.getStore();
  if (!ctl) return;
  if (ctl.cancelled) { child.kill('SIGTERM'); return; }
  ctl.children.add(child);
  child.on('close', () => ctl.children.delete(child));
};

// ---------- global queues ----------
// Several projects (and several motion blocks of one project) run at once, so the heavy tools are
// rationed machine-wide. Each limit can be raised with an env var.
const LIMITS = {
  render: Number(process.env.LAB_RENDER_PARALLEL ?? 1),
  whisper: 1,
  proxy: 2,
  ai: Number(process.env.LAB_AI_PARALLEL ?? 4),
  tsc: 2,
};
const LABELS = {render: 'render', whisper: 'transcrição', proxy: 'proxy', ai: 'IA', tsc: 'checagem de código'};
const pools = Object.fromEntries(Object.keys(LIMITS).map((k) => [k, {busy: 0, queue: []}]));

/** Runs fn once a `kind` slot is free. While waiting, the job shows "Na fila: …" and can still be cancelled. */
export const slot = async (kind, fn) => {
  const pool = pools[kind];
  const ctl = jobCtx.getStore();
  if (pool.busy < LIMITS[kind] && !pool.queue.length) pool.busy++;
  else {
    // A released slot is handed straight to the next waiter, so `busy` is already counted for us.
    await new Promise((resolve, reject) => {
      const waiter = {resolve, ctl, cancel: null};
      waiter.cancel = () => {
        const i = pool.queue.indexOf(waiter);
        if (i >= 0) pool.queue.splice(i, 1);
        ctl?.job?.waiting(kind, null);
        reject(new Error('Cancelado'));
      };
      pool.queue.push(waiter);
      ctl?.job?.waiting(kind, `${LABELS[kind]} · ${pool.queue.length}º na fila`);
      ctl?.onCancel.add(waiter.cancel);
    });
  }
  try {
    if (ctl?.cancelled) throw new Error('Cancelado');
    return await fn();
  } finally {
    release(kind);
  }
};
const release = (kind) => {
  const pool = pools[kind];
  const next = pool.queue.shift();
  if (!next) { pool.busy--; return; }
  next.ctl?.onCancel.delete(next.cancel);
  next.ctl?.job?.waiting(kind, null);
  pool.queue.forEach((w, i) => w.ctl?.job?.waiting(kind, `${LABELS[kind]} · ${i + 1}º na fila`));
  next.resolve();
};

/** Runs fns with at most `n` in flight; resolves to their results (or errors) in order. */
export const pool = async (items, n, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const k = i++;
      try { out[k] = {ok: true, value: await fn(items[k], k)}; } catch (e) { out[k] = {ok: false, error: e}; }
    }
  };
  await Promise.all(Array.from({length: Math.min(n, items.length)}, worker));
  return out;
};
