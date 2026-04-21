#!/usr/bin/env node
// scripts/sync-reference.js
// Syncs dist/ to reference/ based on MD5 checksum.
// - Copies new or changed files only (preserves mtime on unchanged files)
// - Deletes files from reference/ that no longer exist in dist/
// - Protects files listed in sync-reference.json from deletion

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");   // repo root (scripts/ is one level down)
const DIST      = join(ROOT, "dist");
const REF       = join(ROOT, "reference");
const CONFIG    = join(__dirname, "sync-reference.json");

// Load protected files list (relative paths, e.g. "robots.txt", "subdir/file.html")
let protectedFiles = new Set();
if (existsSync(CONFIG)) {
  try {
    const config = JSON.parse(readFileSync(CONFIG, "utf-8"));
    protectedFiles = new Set((config.protect ?? []).map((f) => f.replace(/\\/g, "/")));
    console.log(`\x1b[36mProtected files: ${[...protectedFiles].join(", ")}\x1b[0m`);
  } catch (e) {
    console.warn(`\x1b[33mWARN: Could not parse sync-reference.json — ${e.message}\x1b[0m`);
  }
} else {
  console.warn("\x1b[33mWARN: sync-reference.json not found, no files protected.\x1b[0m");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute MD5 hash of a file */
function md5(filePath) {
  return createHash("md5").update(readFileSync(filePath)).digest("hex");
}

/** Recursively collect all file paths under a directory, returned as forward-slash relative paths */
function collectFiles(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      // Normalize to forward slashes for cross-platform consistency
      results.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Validate dist/ exists
if (!existsSync(DIST)) {
  console.error(`\x1b[31mERROR: dist/ not found at ${DIST}\x1b[0m`);
  console.error("Run 'npm run build' first.");
  process.exit(1);
}

// Create reference/ if needed
if (!existsSync(REF)) {
  mkdirSync(REF, { recursive: true });
  console.log("\x1b[36mCreated reference/ folder.\x1b[0m");
}

const distFiles = new Set(collectFiles(DIST));
const refFiles  = new Set(existsSync(REF) ? collectFiles(REF) : []);

let countAdded     = 0;
let countUpdated   = 0;
let countDeleted   = 0;
let countSkipped   = 0;
let countProtected = 0;

// --- Step 1: Copy new or changed files ---
for (const rel of distFiles) {
  const src = join(DIST, rel);
  const dst = join(REF,  rel);

  // Ensure destination directory exists
  mkdirSync(dirname(dst), { recursive: true });

  if (!existsSync(dst)) {
    copyFileSync(src, dst);
    console.log(`  \x1b[32mADDED\x1b[0m    ${rel}`);
    countAdded++;
  } else {
    // Existing file — compare checksums
    if (md5(src) !== md5(dst)) {
      copyFileSync(src, dst);
      console.log(`  \x1b[33mUPDATED\x1b[0m  ${rel}`);
      countUpdated++;
    } else {
      countSkipped++;
    }
  }
}

// --- Step 2: Delete files no longer in dist/ (unless protected) ---
for (const rel of refFiles) {
  if (!distFiles.has(rel)) {
    if (protectedFiles.has(rel)) {
      console.log(`  \x1b[36mPROTECTED\x1b[0m ${rel}`);
      countProtected++;
    } else {
      const dst = join(REF, rel);
      rmSync(dst);
      console.log(`  \x1b[31mDELETED\x1b[0m  ${rel}`);
      countDeleted++;
    }
  }
}

// --- Step 3: Remove empty directories from reference/ ---
function removeEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(join(dir, entry.name));
  }
  if (readdirSync(dir).length === 0 && dir !== REF) {
    rmSync(dir, { recursive: true });
  }
}
removeEmptyDirs(REF);

// --- Summary ---
console.log("\n\x1b[1m--- sync:reference summary ---\x1b[0m");
console.log(`  \x1b[32mAdded    : ${countAdded}\x1b[0m`);
console.log(`  \x1b[33mUpdated  : ${countUpdated}\x1b[0m`);
console.log(`  \x1b[31mDeleted  : ${countDeleted}\x1b[0m`);
console.log(`  \x1b[36mProtected: ${countProtected}\x1b[0m`);
console.log(`  Skipped  : ${countSkipped} (unchanged)`);
console.log("\x1b[1mDone.\x1b[0m\n");
