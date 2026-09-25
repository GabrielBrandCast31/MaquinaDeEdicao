import {AsyncLocalStorage} from 'node:async_hooks';

/** The job currently running (set by the server around each job), so spawned processes can be cancelled. */
export const jobCtx = new AsyncLocalStorage();

export const track = (child) => {
  const ctl = jobCtx.getStore();
  if (!ctl) return;
  if (ctl.cancelled) { child.kill('SIGTERM'); return; }
  ctl.children.add(child);
  child.on('close', () => ctl.children.delete(child));
};
