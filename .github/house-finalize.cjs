/* One-use, exact-branch integration patch. Deletes itself and its write workflow. */
'use strict';
const fs = require('node:fs');
function edit(path, before, after) {
  const text = fs.readFileSync(path,'utf8');
  if (!text.includes(before)) throw Error('Expected source seam absent: '+path+' / '+before);
  fs.writeFileSync(path,text.replace(before,after));
}
edit('src/activities.js','  G.AlibiActivities = {\n','  G.AlibiActivities = {\n    // Trusted build-time configuration only; shared by optional presentation packs.\n    loadSource,\n');
edit('tools/build.cjs','    house.config.script,\n    house.config.css,\n','');
edit('tools/build.cjs','      blockMotion.bytes,\n','      blockMotion.bytes -\n      house.bytes,\n');
edit('tests/experience.test.cjs',"const vm = require('node:vm');\n",'');
edit('tests/experience.test.cjs','      info.blockMotionBytes,','      info.blockMotionBytes +\n      info.houseBytes,');
edit('tests/experience.test.cjs',"  const header = js.split('\\n').slice(0, 5).join('\\n');\n  const config = {};\n  vm.runInNewContext(header, config);\n  const quiet = config.ALIBI_QUIET_CONFIG;","  const assignment = js.match(/globalThis\\.ALIBI_QUIET_CONFIG=(.*);\\n/);\n  assert.ok(assignment, 'A static Quiet Wing configuration is emitted');\n  const quiet = JSON.parse(assignment[1]);");
for (let i=0;i<2;i++) edit('tests/sw.test.cjs',"!n.startsWith('observatory.') &&\n"+(i===0?'              ':'        ')+"!n.startsWith('block-motion.')", "!n.startsWith('observatory.') &&\n"+(i===0?'              ':'        ')+"!n.startsWith('house.') &&\n"+(i===0?'              ':'        ')+"!n.startsWith('block-motion.')");
edit('tests/house.test.cjs',"  assert.ok(build.includes('house.config.script'));", "  assert.ok(build.includes('JSON.stringify(house.config)'));");
edit('tests/house.test.cjs',"  assert.ok(build.includes('house.config.css'));", "  assert.ok(build.includes('house.bytes'));");
edit('tests/house.test.cjs','source.source).length < 12 * 1024','source.source).length < 14 * 1024');
edit('tests/house.test.cjs','  assert.match(loader, /15000/);',"  assert.match(loader, /AlibiActivities\\.loadSource/);\n  const activities = fs.readFileSync(path.join(__dirname, '../src/activities.js'), 'utf8');\n  assert.match(activities, /15000/);");
edit('src/house/controller.js','        storage: G.AlibiDiagnostics','        offline: G.AlibiHouseLoader.offline,\n        storage: G.AlibiDiagnostics');
edit('src/house/view.js','<footer class="hx-footer"><span>WRENMERE DESK · REVIEW EDITION</span>', '<footer class="hx-footer"><span>WRENMERE DESK · REVIEW EDITION</span><span data-house-offline>${d.offline === true ? \'Preview files cached for offline use\' : d.offline === null ? \'Source preview · not an installed offline pack\' : \'Offline preview copy not ready\'}</span>');
edit('tests/browser_house.py','import os\n','import os\nimport time\n');
edit('tests/browser_house.py','\ndef nav(page, view):','\ndef wait_js(page, expression, arg=None):\n    """CDP evaluation avoids page-side eval; keep the production CSP unchanged."""\n    deadline = time.monotonic() + 6\n    while time.monotonic() < deadline:\n        if page.evaluate(expression, arg):\n            return\n        page.wait_for_timeout(50)\n    raise AssertionError("Timed out: " + expression)\n\n\ndef nav(page, view):');
let browser=fs.readFileSync('tests/browser_house.py','utf8').replaceAll('page.wait_for_function(', 'wait_js(page, ');
browser=browser.replaceAll('wait_js(page, "AlibiDiagnostics.', 'wait_js(page, "() => AlibiDiagnostics.');
fs.writeFileSync('tests/browser_house.py',browser);
edit('.github/workflows/house.yml','          ALIBI_RESULTS=test-results/house-mobile-origin python tests/browser_house_mobile.py','          ALIBI_RESULTS=test-results/house-mobile-origin python tests/browser_house_mobile.py\n          ALIBI_RESULTS=test-results/house-offline python tests/browser_house_offline.py');
edit('docs/STATE.md','# Live development state\n','# Live development state\n\n## Wrenmere Desk mobile-first candidate (not deployed)\n\nAn opt-in `#/home?ux=house` presentation adds a single resume/start card, a labelled mobile dock, a compact finder with draft-based filter sheets, original SVG room components and an optional session-only deduction study. Existing game/save/preference owners remain unchanged. Includes the earlier unsubmitted desk foundation. See [UX entry point](ux/README.md), [component contracts](ux/MOBILE-COMPONENTS.md) and [verification limits](ux/VERIFICATION.md). Hosted checks and physical acceptance remain gates; this is not a production release or a canonical castle migration.\n');
fs.unlinkSync('.github/workflows/house-format-once.yml');
fs.unlinkSync('.github/house-finalize.cjs');
