#!/usr/bin/env node
/* Stub for the Emscripten-based compile-check. The validate workflow gates
 * this behind a repo variable (COMPILE_CHECK=1) because it requires the
 * full Emscripten toolchain (~1 GB) plus Gamma's sources. Enable it once
 * you're ready to spend the CI minutes.
 *
 * Plan when implementing:
 *   1. For each .gdsp, strip @gdsp-* directives, wrap the class body in a
 *      stub:
 *          #include <Gamma/Gamma.h>
 *          // … plus whatever @gdsp-header lines declared
 *          <class body>
 *          int main() { <ClassName> c; (void)c; return 0; }
 *   2. Run `em++ -I external/Gamma -I external/Gamma/external -std=c++17
 *      -Wno-deprecated-declarations -fsyntax-only stub.cpp`.
 *   3. Capture stderr; print the file path and the first error block on
 *      failure. Exit non-zero if any file fails.
 *
 * For now this script is a no-op so the workflow plumbing is ready when
 * COMPILE_CHECK is flipped on. */

"use strict";
const files = process.argv.slice(2);
console.log(`compile-check stub: would compile ${files.length} file(s) against Gamma headers via Emscripten.`);
console.log("(Enable by implementing this script and setting the COMPILE_CHECK repo variable to '1'.)");
process.exit(0);
