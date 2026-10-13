import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeCacheBudget, resolveXenolithSettings } from "../../src/config.js";

import { xenolithServiceArgs } from "../../src/wire/client.js";

test("context defaults to the engine and the environment overrides the config file", (t) => {
  const agentDir = mkdtempSync(join(tmpdir(), "xenopi-context-config-"));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  assert.equal(resolveXenolithSettings(agentDir, {}).context, undefined);
  writeFileSync(join(agentDir, "xenolith.json"), JSON.stringify({ context: 4097 }));
  assert.equal(resolveXenolithSettings(agentDir, {}).context, 4097);
  assert.equal(resolveXenolithSettings(agentDir, { XENOLITH_CONTEXT: "32768" }).context, 32768);
  // Only the effective setting is validated when an override exists.
  writeFileSync(join(agentDir, "xenolith.json"), JSON.stringify({ context: -1 }));
  assert.equal(resolveXenolithSettings(agentDir, { XENOLITH_CONTEXT: "32768" }).context, 32768);
});

test("context settings do not assume a model's minimum or maximum", (t) => {
  const agentDir = mkdtempSync(join(tmpdir(), "xenopi-context-range-"));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  for (const context of [1, 63, 4097, 300000, Number.MAX_SAFE_INTEGER]) {
    writeFileSync(join(agentDir, "xenolith.json"), JSON.stringify({ context }));
    assert.equal(resolveXenolithSettings(agentDir, {}).context, context);
    assert.equal(resolveXenolithSettings(agentDir, { XENOLITH_CONTEXT: String(context) }).context, context);
  }
});

test("invalid context values fail explicitly instead of using a default", (t) => {
  const agentDir = mkdtempSync(join(tmpdir(), "xenopi-context-invalid-"));
  t.after(() => rmSync(agentDir, { recursive: true, force: true }));
  for (const context of [0, -1, 1.5, null, true, "4097", {}, [], Number.MAX_SAFE_INTEGER + 1]) {
    writeFileSync(join(agentDir, "xenolith.json"), JSON.stringify({ context }));
    assert.throws(() => resolveXenolithSettings(agentDir, {}), /"context" in xenolith.json must be a positive safe integer/);
  }
  writeFileSync(join(agentDir, "xenolith.json"), JSON.stringify({ context: 4097 }));
  for (const context of ["", "0", "-1", "+1", "1.5", " 4097", "4097 ", "1e3", "NaN", "Infinity", "9007199254740992"]) {
    assert.throws(() => resolveXenolithSettings(agentDir, { XENOLITH_CONTEXT: context }), /XENOLITH_CONTEXT must be a positive safe integer/);
  }
});


test("cache budget accepts byte counts and decimal or binary units", () => {
  assert.equal(normalizeCacheBudget(0), "0");
  assert.equal(normalizeCacheBudget("12GB"), "12000000000");
  assert.equal(normalizeCacheBudget("12GiB"), "12884901888");
  assert.equal(normalizeCacheBudget("17179869184"), "17179869184");
  assert.throws(() => normalizeCacheBudget("-1"));
  assert.throws(() => normalizeCacheBudget("1.5GiB"));
  assert.throws(() => normalizeCacheBudget("1GiB\n"));
  assert.throws(() => normalizeCacheBudget("18446744073709551616"));
});

test("cache budget environment setting overrides xenolith.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "xenopi-config-"));
  try {
    writeFileSync(join(dir, "xenolith.json"), JSON.stringify({ cacheBudget: "4GiB" }));
    assert.equal(resolveXenolithSettings(dir, {}).cacheBudget, "4294967296");
    assert.equal(
      resolveXenolithSettings(dir, { XENOLITH_CACHE_BUDGET: "0" }).cacheBudget,
      "0",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("service arguments use Xenolith's default unless a cache budget was supplied", () => {
  const base = {
    bin: "xenolith",
    model: "/model.gguf",
    socket: "/tmp/wire.sock",
    stateDir: undefined,
    cacheDir: undefined,
    idleShutdownMinutes: 30,
    spawn: true,
  };
  assert.equal(xenolithServiceArgs(base).includes("--cache-budget"), false);
  assert.deepEqual(xenolithServiceArgs({ ...base, cacheBudget: "0" }).slice(-2), [
    "--cache-budget",
    "0",
  ]);
});

test("invalid JSON cache budgets are rejected and overflow never loses precision", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "xenopi-budget-types-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const cacheBudget of [null, true, [], {}, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    writeFileSync(join(dir, "xenolith.json"), JSON.stringify({ cacheBudget }));
    assert.throws(() => resolveXenolithSettings(dir, {}), /cacheBudget/);
    assert.equal(resolveXenolithSettings(dir, { XENOLITH_CACHE_BUDGET: "0" }).cacheBudget, "0");
  }
  assert.equal(normalizeCacheBudget("18446744073709551615"), "18446744073709551615");
  assert.throws(() => normalizeCacheBudget("18446744073709551615GiB"));
});
