#!/usr/bin/env node
/* Convention checks beyond what validate.js enforces. Each rule is a small
 * function that returns null on pass or a string on fail. Failure is a
 * warning — set ALLOW_LINT_FAIL=1 in CI to demote to non-fatal if the
 * conventions are still being negotiated. */

"use strict";
const fs = require("fs");
const path = require("path");

function directives(source) {
  const out = {};
  source.split("\n").forEach(line => {
    const m = line.match(/^\s*\/\/\s*@gdsp-(\S+)\s+(.*?)\s*$/);
    if (!m) return;
    const k = m[1].toLowerCase();
    if (k === "input" || k === "output" || k === "method" || k === "gate" || k === "header") {
      (out[k] = out[k] || []).push(m[2]);
    } else {
      out[k] = m[2];
    }
  });
  return out;
}

const RULES = [
  function nameIsPascalCase(d) {
    if (!d.name) return null;  // covered by validator
    if (!/^[A-Z][A-Za-z0-9_]*$/.test(d.name)) {
      return `@gdsp-name must be PascalCase (got "${d.name}")`;
    }
    return null;
  },
  function descriptionPresent(d) {
    if (!d.description || !d.description.trim()) {
      return "missing @gdsp-description (one-line summary helps users browse)";
    }
    if (d.description.length > 140) {
      return `@gdsp-description should be ≤ 140 chars (got ${d.description.length})`;
    }
    return null;
  },
  function colorIsHex(d) {
    if (!d.color) return null;  // optional
    if (!/^#[0-9a-fA-F]{6}$/.test(d.color)) {
      return `@gdsp-color must be #RRGGBB (got "${d.color}")`;
    }
    return null;
  },
  function categoryIsKnown(d) {
    if (!d.category) return null;
    const known = new Set([
      "UserDSP", "Oscillator", "Noise", "Envelope", "Filter", "Delay",
      "Effect", "Analysis", "Convert", "Math", "Sink", "Sequencer",
      "Modulation", "Distortion", "Spatial"
    ]);
    if (!known.has(d.category)) {
      return `@gdsp-category "${d.category}" is unconventional (known: ${[...known].join(", ")}). Pick the closest.`;
    }
    return null;
  },
  function filenameMatchesName(d, file) {
    if (!d.name) return null;
    const stem = path.basename(file, path.extname(file));
    if (stem !== d.name) {
      return `filename "${path.basename(file)}" does not match @gdsp-name "${d.name}.gdsp"`;
    }
    return null;
  },
  function inputTypesValid(d) {
    if (!d.input) return null;
    for (const s of d.input) {
      const [n, t] = s.trim().split(/\s+/);
      if (!["audio", "param", "gate"].includes(t)) {
        return `@gdsp-input ${n}: type must be audio/param/gate (got "${t}")`;
      }
    }
    return null;
  },
  function outputTypesValid(d) {
    if (!d.output) return null;
    for (const s of d.output) {
      const [n, t] = s.trim().split(/\s+/);
      if (!["audio", "param", "gate"].includes(t)) {
        return `@gdsp-output ${n}: type must be audio/param/gate (got "${t}")`;
      }
    }
    return null;
  },
  function noTabsInSource(d, file, source) {
    // Editor uses 2-space indent. Tabs render inconsistently when shipped
    // back through the editor's textarea fallback.
    if (source.includes("\t")) {
      return "source contains tab characters; use 2-space indent instead";
    }
    return null;
  }
];

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node lint.js <file1.gdsp> [file2.gdsp ...]");
  process.exit(1);
}

let issues = 0;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const d = directives(src);
  const display = path.relative(process.cwd(), file);
  for (const rule of RULES) {
    const msg = rule(d, file, src);
    if (msg) {
      console.error(`! ${display}: ${msg}`);
      issues++;
    }
  }
}
if (issues) {
  console.error(`\n${issues} lint issue(s) across ${files.length} file(s).`);
  process.exit(process.env.ALLOW_LINT_FAIL ? 0 : 1);
}
console.log(`Lint clean for ${files.length} file(s).`);
