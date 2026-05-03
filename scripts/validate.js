#!/usr/bin/env node
/* Validate one or more .gdsp files using the same parser the editor uses.
 * Mirrors gamma-node-editor.html's parseGdsp + buildUserDspDef so any file
 * accepted here will be accepted by the editor (and vice-versa).
 *
 * Usage: node scripts/validate.js [files...]
 *        node scripts/validate.js gdsp/*.gdsp
 *
 * Exits non-zero on any failure so the CI step fails cleanly. */

"use strict";
const fs = require("fs");
const path = require("path");

function parseGdsp(source) {
  const meta = { directives: {} };
  const lines = source.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*\/\/\s*@gdsp-(\S+)\s+(.*?)\s*$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2];
    if (key === "input" || key === "output" || key === "method" || key === "gate" || key === "header") {
      if (!meta.directives[key]) meta.directives[key] = [];
      meta.directives[key].push(val);
    } else {
      meta.directives[key] = val;
    }
  }
  return meta;
}

function buildUserDspDef(source) {
  const { directives: d } = parseGdsp(source);
  if (!d.name) throw new Error("Missing @gdsp-name");
  if (!d.input) throw new Error("Missing @gdsp-input (need at least one)");
  if (!d.output) throw new Error("Missing @gdsp-output (need at least one)");

  const def = {
    category: d.category || "User DSP",
    color: d.color || "#c8e85a",
    description: d.description || "",
    cppType: d.name,
    ins: [],
    outs: [],
    params: {},
    methods: {}
  };

  d.input.forEach(s => {
    const parts = s.trim().split(/\s+/);
    const [pname, ptype, pdefault] = parts;
    if (!pname || !ptype) throw new Error(`Bad @gdsp-input: ${s}`);
    if (!["audio", "param", "gate"].includes(ptype)) {
      throw new Error(`@gdsp-input ${pname}: type must be audio/param/gate`);
    }
    def.ins.push({ n: pname, t: ptype });
    if (ptype === "param") {
      const dv = pdefault !== undefined ? parseFloat(pdefault) : 0;
      def.params[pname] = isFinite(dv) ? dv : 0;
      def.methods[pname] = pname;
    }
  });
  d.output.forEach(s => {
    const parts = s.trim().split(/\s+/);
    const [pname, ptype] = parts;
    if (!pname || !ptype) throw new Error(`Bad @gdsp-output: ${s}`);
    def.outs.push({ n: pname, t: ptype });
  });
  if (d.method) {
    d.method.forEach(s => {
      const [param, method] = s.trim().split(/\s+/);
      if (param && method) def.methods[param] = method;
    });
  }
  if (d.gate) {
    def.gateMethods = {};
    d.gate.forEach(s => {
      const [name, method] = s.trim().split(/\s+/);
      if (name && method) def.gateMethods[name] = method;
    });
  }

  const classRe = new RegExp(`class\\s+${d.name}\\b`);
  if (!classRe.test(source)) {
    throw new Error(`Source does not contain "class ${d.name}"`);
  }
  if (!/\boperator\s*\(\s*\)\s*\(/.test(source)) {
    throw new Error("Class must define operator()");
  }

  return { def, name: d.name };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node validate.js <file1.gdsp> [file2.gdsp ...]");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const display = path.relative(process.cwd(), file);
  let src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch (e) {
    console.error(`✗ ${display}: cannot read — ${e.message}`);
    failed++;
    continue;
  }
  try {
    const { name, def } = buildUserDspDef(src);
    console.log(`✓ ${display}: ${name} (${def.ins.length} in, ${def.outs.length} out, ${Object.keys(def.params).length} params)`);
  } catch (e) {
    console.error(`✗ ${display}: ${e.message}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} of ${files.length} file(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} file(s) validated.`);
