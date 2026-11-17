import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
const wrangler = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url)));
test("isolated target, fail-closed auth, no user-supplied URL", () => {
  assert.match(source, /const TARGET = "https:\/\/aiscentmcp\.com\/"/);
  assert.match(source, /!env\.PILOT_SECRET/);
  assert.match(source, /request\.method !== "POST"/);
  assert.match(source, /status: 401/);
  assert.doesNotMatch(source, /await request\.json\(/);
});
test("preview only, no production domain, and official browser binding", () => {
  assert.equal(wrangler.name, "smat-interface-lab-browser-pilot");
  assert.equal(wrangler.workers_dev, false);
  assert.equal(wrangler.routes, undefined);
  assert.equal(wrangler.browser.binding, "MYBROWSER");
  assert.equal(wrangler.browser.remote, true);
});
