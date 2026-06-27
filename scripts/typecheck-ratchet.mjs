#!/usr/bin/env node
/**
 * TypeScript error ratchet — step 1 of the tsc-cleanup plan.
 *
 * Context: the project carries a large backlog of pre-existing type errors and
 * ships via esbuild, which transpiles WITHOUT type-checking — so `tsc` is
 * effectively off and a newly-introduced type error is invisible (just one more
 * in a list of hundreds nobody reads).
 *
 * This runs `tsc --noEmit`, counts the errors, and FAILS only when the count has
 * INCREASED above the committed baseline (tsc-error-baseline.txt). The
 * pre-existing backlog is tolerated; a regression is caught. When the count
 * drops, it nudges you to lower the baseline so the gain is locked in (the
 * ratchet only turns one way).
 *
 *   pnpm run typecheck:ratchet     # check — non-zero exit if errors increased
 *   pnpm run typecheck:baseline    # write the current count as the new baseline
 *
 * Plan + remaining steps: docs/reports/2026-06-26-progress-and-backlog.md
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_FILE = 'tsc-error-baseline.txt';
const UPDATE = process.argv.includes('--update');

function runTsc() {
  try {
    // Portable invocation (works on Windows + CI regardless of PATH).
    return execSync('node node_modules/typescript/bin/tsc --noEmit', { encoding: 'utf8' });
  } catch (e) {
    // tsc exits non-zero when it finds type errors; the report is on stdout.
    if (e.stdout != null) return String(e.stdout) + String(e.stderr ?? '');
    // Anything else means tsc itself failed to run — fail loudly, don't pass.
    console.error('[tsc-ratchet] Could not run tsc:', e.message);
    process.exit(2);
  }
}

const out = runTsc();
const current = out.split(/\r?\n/).filter((l) => /error TS\d+/.test(l)).length;

if (UPDATE) {
  writeFileSync(BASELINE_FILE, `${current}\n`);
  console.log(`[tsc-ratchet] baseline updated to ${current}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_FILE)
  ? parseInt(readFileSync(BASELINE_FILE, 'utf8').trim(), 10)
  : Number.POSITIVE_INFINITY;

console.log(`[tsc-ratchet] type errors — current: ${current}, baseline: ${baseline}`);

if (current > baseline) {
  console.error(`\n❌ Type errors INCREASED by ${current - baseline} (${baseline} → ${current}).`);
  console.error('   A new type error was introduced. Run "pnpm run check" to see the full list and fix the new one(s).');
  console.error('   (The pre-existing backlog is tolerated — only increases are blocked.)');
  process.exit(1);
}

if (current < baseline) {
  console.log(`\n✅ Errors decreased (${baseline} → ${current}). Run "pnpm run typecheck:baseline" to lock it in.`);
} else {
  console.log('\n✅ No new type errors.');
}
process.exit(0);
