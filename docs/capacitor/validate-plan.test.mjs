import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlan, checkFiles, inspectDirectory } from './validate-plan.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const originalPlan = JSON.parse(fs.readFileSync(path.join(directory, 'plan.json'), 'utf8'));
const originalConfig = JSON.parse(fs.readFileSync(path.join(directory, 'examples/capacitor.config.json'), 'utf8'));
const copy = (value) => JSON.parse(JSON.stringify(value));

function rejects(change, expression) {
  const plan = copy(originalPlan);
  const config = copy(originalConfig);
  change(plan, config);
  assert.match(validatePlan(plan, config).errors.join('\n'), expression);
}

test('Capacitor planning package is consistent and all local references exist', () => {
  const result = inspectDirectory(directory);
  assert.deepEqual(result.errors, []);
  assert.equal(result.workPackages, 14);
  assert.equal(result.domains, 5);
  assert.equal(result.releaseGates, 7);
});

test('planning checker never authorizes a native release', () => {
  const result = validatePlan(originalPlan, originalConfig, { release: true });
  assert.match(result.errors.join('\n'), /Release denied/);
  for (const gate of originalPlan.releaseGates)
    assert.ok(result.errors.some((error) => error.includes(`Unresolved release evidence: ${gate.id}`)));
});

test('duplicate work-package identifiers are rejected', () => {
  rejects((plan) => { plan.workPackages[1].id = plan.workPackages[0].id; }, /Duplicate work-package/);
});

test('duplicate GitHub issue mappings are rejected', () => {
  rejects((plan) => { plan.workPackages[1].issue = plan.workPackages[0].issue; }, /Duplicate issue/);
});

test('dependency cycles are rejected', () => {
  rejects((plan) => { plan.workPackages[1].dependsOn = ['CAP-04']; }, /Dependency cycle/);
});

test('unknown dependency identifiers are rejected', () => {
  rejects((plan) => { plan.workPackages[1].dependsOn = ['CAP-99']; }, /Unknown dependency/);
});

test('omitting a save domain is rejected', () => {
  rejects((plan) => { plan.saveDomains.pop(); }, /five audited|Missing or repeated domain/);
});

test('inventing combined-backup coverage for challenges is rejected', () => {
  rejects((plan) => { plan.saveDomains.find((d) => d.id === 'challenges').combinedBackup = true; }, /Do not invent/);
});

test('unapproved release and fabricated acceptance claims are rejected', () => {
  rejects((plan) => { plan.productionApproved = true; }, /production approval/);
  rejects((plan) => { plan.releaseGates[0].status = 'passed'; }, /manufacture acceptance/);
  rejects((plan) => { plan.identity.publisher = 'Unapproved publisher'; }, /remain unresolved/);
});

test('both existing web origins must remain represented', () => {
  rejects((plan) => { plan.architecture.preservedWebOrigins.pop(); }, /Both existing web origins/);
});

test('native service-worker and OTA-code shortcuts are rejected', () => {
  rejects((plan) => { plan.architecture.androidServiceWorker = true; }, /androidServiceWorker/);
  rejects((plan) => { plan.architecture.otaExecutableUpdates = true; }, /otaExecutableUpdates/);
});

test('remote main documents and privileged navigation are rejected', () => {
  rejects((plan, config) => { config.server.url = 'https://example.com'; }, /server.url/);
  rejects((plan, config) => { config.server.allowNavigation = ['*']; }, /privileged navigation/);
});

test('cleartext, mixed content and release debugging are rejected', () => {
  rejects((plan, config) => { config.server.cleartext = true; }, /Cleartext/);
  rejects((plan, config) => { config.android.allowMixedContent = true; }, /Mixed content/);
  rejects((plan, config) => { config.android.webContentsDebuggingEnabled = true; }, /debugging/);
});

test('unsafe logging overrides and an implicit runtime floor are rejected', () => {
  rejects((plan, config) => { config.android.loggingBehavior = 'production'; }, /logging override/);
  rejects((plan, config) => { delete config.android.minWebViewVersion; }, /runtime floor/);
});

test('missing deliverables and escaping file references are rejected', () => {
  const missing = copy(originalPlan);
  missing.deliverables.push('not-a-real-deliverable.md');
  assert.match(checkFiles(missing, directory).join('\n'), /Missing file/);
  const escaping = copy(originalPlan);
  escaping.deliverables.push('../../../outside-the-plan.txt');
  assert.match(checkFiles(escaping, directory).join('\n'), /escapes allowed root/);
});

test('malformed top-level JSON shapes and missing directories fail explicitly', () => {
  assert.ok(validatePlan(null, originalConfig).errors.length);
  assert.ok(validatePlan(originalPlan, []).errors.length);
  assert.match(inspectDirectory(path.join(directory, 'does-not-exist')).errors.join('\n'), /Cannot validate/);
});
