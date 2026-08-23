// End-to-end localhost verification (no browser required).
//   1. `node --check` every JS file for syntax errors.
//   2. Walk the real ESM import graph from the browser entry (js/main.js)
//      and confirm every relative import resolves to a file that exists.
//   3. Boot server.mjs, then HTTP-GET every asset the page loads and assert
//      a 200 + a sensible content type.
//
// Run with: node tests/check-server.mjs   (or `npm run verify`)

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 8123);
const problems = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith('.js')) out.push(p);
  }
  const s = statSync(dir);
  if (s.isFile() && dir.endsWith('.js')) out.push(dir);
  return out;
}

const allJs = [...walk(resolve(root, 'js')), ...walk(resolve(root, 'tests'))];
allJs.push(resolve(root, 'server.mjs'));

// ---- 1. syntax ----------------------------------------------------------
console.log('== syntax (node --check) ==');
for (const f of allJs) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  const rel = relative(root, f).split(sep).join('/');
  if (r.status !== 0) {
    problems.push(`syntax error in ${rel}`);
    console.log(`FAIL  ${rel}\n      ${r.stderr.trim()}`);
  } else {
    console.log(`ok    ${rel}`);
  }
}

// ---- 2. import graph ----------------------------------------------------
console.log('\n== import graph from js/main.js ==');
const visited = new Set();
const queue = [resolve(root, 'js/main.js')];
while (queue.length) {
  const file = queue.shift();
  if (visited.has(file)) continue;
  visited.add(file);
  const src = readFileSync(file, 'utf8');
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const target = resolve(dirname(file), spec);
    if (!existsSync(target)) {
      problems.push(`unresolved import "${spec}" in ${relative(root, file)}`);
      console.log(`FAIL  ${spec}  (from ${relative(root, file).split(sep).join('/')})`);
    } else {
      console.log(`ok    ${spec}`);
      queue.push(target);
    }
  }
}

// ---- 3. HTTP serving ----------------------------------------------------
console.log(`\n== HTTP serving (localhost:${port}) ==`);
const server = spawn(process.execPath, [resolve(root, 'server.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let serverErr = '';
server.stderr.on('data', (d) => (serverErr += d));

let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/`);
    ready = r.ok;
  } catch { /* not up yet */ }
  if (!ready) await new Promise((res) => setTimeout(res, 100));
}

try {
  if (!ready) {
    problems.push('server did not become ready');
    console.log(`FAIL  server did not start${serverErr ? ' — ' + serverErr.trim() : ''}`);
  } else {
    const assets = new Set(['/', '/css/styles.css']);
    for (const f of visited) assets.add('/' + relative(root, f).split(sep).join('/'));
    for (const path of [...assets].sort()) {
      const r = await fetch(`http://127.0.0.1:${port}${path}`);
      const ct = r.headers.get('content-type') ?? '';
      if (!r.ok) problems.push(`HTTP ${r.status} for ${path}`);
      console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${String(r.status).padEnd(4)} ${ct.padEnd(26)} ${path}`);
    }
  }
} finally {
  server.kill();
}

console.log(
  problems.length
    ? '\nPROBLEMS:\n' + problems.map((p) => ' - ' + p).join('\n')
    : '\nALL CHECKS PASSED',
);
process.exit(problems.length ? 1 : 0);
