import {spawn} from 'node:child_process';
import {track} from './jobctx.mjs';

/**
 * Asks Claude through the local `claude` CLI (your Claude Code login — no API key needed).
 * Images are passed as file paths that Claude opens with its Read tool.
 * Returns {data, costUsd, model}.
 */
export const askClaude = ({prompt, schema, cwd, model = 'sonnet', system, onLine, timeoutMs = 15 * 60 * 1000, tools = ['Read'], allowed = ['Read'], addDirs = [cwd]}) =>
  new Promise((resolve, reject) => {
    // dontAsk: anything not in `allowed` is denied (e.g. writes outside the project's motion folder).
    const args = [
      '-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
      '--model', model, '--no-session-persistence', '--setting-sources', '',
      '--tools', tools.join(','), '--permission-mode', 'dontAsk', '--allowedTools', ...allowed, '--add-dir', ...addDirs,
      '--system-prompt', system ?? 'Você é um editor de vídeo sênior especializado em conteúdo para redes sociais e VSLs. Analise com precisão e responda sempre em português do Brasil.',
    ];
    const p = spawn('claude', args, {cwd, stdio: ['pipe', 'pipe', 'pipe']});
    track(p);
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGTERM'); reject(new Error('Claude demorou demais (timeout)')); }, timeoutMs);
    p.stdout.on('data', (b) => { out += b; });
    p.stderr.on('data', (b) => { err += b; onLine?.(String(b).trim()); });
    p.on('error', (e) => { clearTimeout(timer); reject(new Error(`Não consegui rodar o "claude" CLI: ${e.message}`)); });
    p.on('close', (code) => {
      clearTimeout(timer);
      let j;
      try { j = JSON.parse(out); } catch { return reject(new Error(`Resposta inválida do Claude (código ${code}): ${(err || out).slice(-600)}`)); }
      if (j.is_error) return reject(new Error(`Claude retornou erro: ${String(j.result ?? '').slice(0, 600)}`));
      let data = j.structured_output;
      if (!data && typeof j.result === 'string') {
        const m = /\{[\s\S]*\}/.exec(j.result);
        try { data = m ? JSON.parse(m[0]) : null; } catch { data = null; }
      }
      if (!data) return reject(new Error('Claude não devolveu JSON estruturado'));
      resolve({data, costUsd: Number(j.total_cost_usd ?? 0), model: Object.keys(j.modelUsage ?? {})[0] ?? model});
    });
    p.stdin.write(prompt);
    p.stdin.end();
  });
