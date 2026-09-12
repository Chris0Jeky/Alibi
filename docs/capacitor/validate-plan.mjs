import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const inside = (base, target) => target === base || target.startsWith(base + path.sep);
const requiredGates = ['identity', 'runtime', 'migration', 'physical-quality', 'security', 'delivery', 'play-approval'];
const requiredDomains = ['cabinet', 'club', 'quiet-wing', 'challenges', 'castle'];

/** A design-package validator, deliberately not an APK or Play authorization checker. */
export function validatePlan(plan, config, { release = false } = {}) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(plan) || !object(config)) return { errors: ['Plan and config must be JSON objects.'] };
  need(plan.schemaVersion === 1, 'Unsupported plan schema.');
  need(plan.status === 'proposed', 'This planning snapshot must remain explicitly proposed.');
  need(plan.nativeImplementationIncluded === false, 'Planning must not claim an implemented native application.');
  need(plan.productionApproved === false, 'Planning must not claim production approval.');
  need(plan.repository === 'Chris0Jeky/Alibi', 'Unexpected repository.');
  need(/^[a-f0-9]{40}$/.test(plan.baseSha || ''), 'Audit must identify a full Git SHA.');
  need(/^\d{4}-\d{2}-\d{2}$/.test(plan.researchDate || ''), 'Research date is required.');
  need(Number.isSafeInteger(plan.parentIssue) && plan.parentIssue > 0, 'Parent issue is required.');

  const architecture = object(plan.architecture) ? plan.architecture : {};
  for (const key of ['androidServiceWorker', 'remoteMainDocument', 'otaExecutableUpdates', 'nativeTelemetry'])
    need(architecture[key] === false, `Unsafe or missing architecture policy: ${key}.`);
  need(architecture.androidOrigin === 'https://localhost', 'Native origin must stay explicit and stable.');
  need(Array.isArray(architecture.targets) && architecture.targets.join(',') === 'web,android', 'Both targets must be retained.');
  const expectedOrigins = ['https://alibi-after-hours-preview.commit-atlas.workers.dev', 'https://alibi-puzzle-club.jeky-tck.chatgpt.site'];
  need(JSON.stringify(architecture.preservedWebOrigins) === JSON.stringify(expectedOrigins), 'Both existing web origins must be preserved.');

  const packages = Array.isArray(plan.workPackages) ? plan.workPackages : [];
  need(packages.length > 0, 'Work packages are required.');
  const byId = new Map();
  const issues = new Set();
  for (const item of packages) {
    if (!object(item)) { errors.push('Work package must be an object.'); continue; }
    need(/^CAP-\d{2}$/.test(item.id || ''), 'Invalid work-package ID.');
    need(!byId.has(item.id), `Duplicate work-package ID: ${item.id}.`);
    byId.set(item.id, item);
    need(Number.isSafeInteger(item.issue) && item.issue > 0, `Invalid issue for ${item.id}.`);
    need(!issues.has(item.issue), `Duplicate issue: ${item.issue}.`);
    issues.add(item.issue);
    need(typeof item.title === 'string' && item.title.length > 0, `Missing title for ${item.id}.`);
    need(typeof item.document === 'string' && item.document.endsWith('.md'), `Missing document for ${item.id}.`);
    need(Array.isArray(item.dependsOn), `Missing dependency list for ${item.id}.`);
    if (Array.isArray(item.dependsOn)) {
      need(new Set(item.dependsOn).size === item.dependsOn.length, `Repeated dependency for ${item.id}.`);
      for (const dependency of item.dependsOn) need(typeof dependency === 'string', `Non-string dependency for ${item.id}.`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`Dependency cycle at ${id}.`); return; }
    if (visited.has(id)) return;
    const item = byId.get(id);
    if (!item) { errors.push(`Unknown dependency: ${id}.`); return; }
    visiting.add(id);
    for (const dependency of Array.isArray(item.dependsOn) ? item.dependsOn : []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);

  const domains = Array.isArray(plan.saveDomains) ? plan.saveDomains : [];
  need(domains.length === requiredDomains.length, 'Inventory must cover exactly the five audited main-branch domains.');
  for (const id of requiredDomains) need(domains.filter((d) => d?.id === id).length === 1, `Missing or repeated domain: ${id}.`);
  need(domains.find((d) => d?.id === 'challenges')?.combinedBackup === false, 'Do not invent challenge coverage in the current combined backup.');
  need(domains.every((d) => object(d) && typeof d.source === 'string' && typeof d.database === 'string'), 'Each domain needs its source and database identity.');

  const gates = Array.isArray(plan.releaseGates) ? plan.releaseGates : [];
  need(gates.length === requiredGates.length, 'Release gate inventory is incomplete.');
  for (const id of requiredGates) need(gates.filter((g) => g?.id === id).length === 1, `Missing or repeated gate: ${id}.`);
  for (const gate of gates) {
    need(object(gate) && gate.status === 'pending' && gate.evidence === null, `Planning cannot manufacture acceptance: ${gate?.id}.`);
    need(issues.has(gate?.ownerIssue), `Gate has no mapped owner issue: ${gate?.id}.`);
  }
  need(object(plan.identity) && Object.values(plan.identity).every((v) => v === null), 'Unapproved publisher/signing identity must remain unresolved.');
  need(Array.isArray(plan.deliverables) && new Set(plan.deliverables).size === plan.deliverables.length, 'Deliverables must be an explicit unique list.');
  for (const item of packages) if (object(item)) need(plan.deliverables?.includes(item.document), `Work-package document is not inventoried: ${item.id}.`);

  const server = object(config.server) ? config.server : {};
  const android = object(config.android) ? config.android : {};
  need(config.appId === 'example.unapproved.alibi.preview', 'Example must use the non-publishable placeholder identity.');
  need(config.webDir === 'dist-android', 'Native payload directory must be isolated.');
  need(!Object.hasOwn(server, 'url'), 'Remote server.url is forbidden in the release design.');
  need(server.hostname === 'localhost' && server.androidScheme === 'https', 'Unsafe native scheme or hostname.');
  need(server.cleartext === false, 'Cleartext must be disabled.');
  need(Array.isArray(server.allowNavigation) && server.allowNavigation.length === 0, 'Remote privileged navigation must be disabled.');
  need(android.allowMixedContent === false, 'Mixed content must be disabled.');
  need(android.webContentsDebuggingEnabled === false, 'Release WebView debugging must be disabled.');
  need(['debug', 'none'].includes(config.loggingBehavior), 'Production console logging is forbidden.');
  need(!android.loggingBehavior || ['debug', 'none'].includes(android.loggingBehavior), 'Android logging override is unsafe.');
  need(Number.isSafeInteger(android.minWebViewVersion) && android.minWebViewVersion >= 120, 'Example runtime floor must be explicit; support still needs device proof.');
  need(config.plugins?.SystemBars?.insetsHandling === 'css', 'SystemBars inset ownership must be explicit.');
  if (release) {
    errors.push('Release denied: this is a documentation-only planning checker, not a native artifact approval pipeline.');
    for (const gate of gates) errors.push(`Unresolved release evidence: ${gate?.id}.`);
  }
  return { errors, workPackages: packages.length, domains: domains.length, releaseGates: gates.length };
}

/** Local-file checks never fetch or execute a referenced URL. */
export function checkFiles(plan, directory = HERE) {
  const errors = [];
  const base = fs.realpathSync(directory);
  const repository = fs.realpathSync(path.resolve(base, '../..'));
  function requireFile(relative, boundary, from = base) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) {
      errors.push(`Invalid relative file path: ${relative}.`); return;
    }
    const resolved = path.resolve(from, relative);
    if (!inside(boundary, resolved)) { errors.push(`Path escapes allowed root: ${relative}.`); return; }
    try {
      const real = fs.realpathSync(resolved);
      if (!inside(boundary, real) || !fs.statSync(real).isFile()) errors.push(`Invalid file or symlink: ${relative}.`);
    } catch { errors.push(`Missing file: ${relative}.`); }
  }
  for (const file of plan.deliverables || []) requireFile(file, base);
  for (const domain of plan.saveDomains || []) requireFile(domain.source, repository, repository);
  for (const file of plan.deliverables || []) {
    if (typeof file !== 'string' || !file.endsWith('.md')) continue;
    const filename = path.resolve(base, file);
    if (!inside(base, filename) || !fs.existsSync(filename)) continue;
    const text = fs.readFileSync(filename, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const link = match[1];
      if (link.startsWith('#') || /^https:\/\//.test(link)) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(link)) { errors.push(`Unexpected link scheme in ${file}: ${link}.`); continue; }
      requireFile(link.split('#')[0], repository, path.dirname(filename));
    }
  }
  const roadmap = fs.readFileSync(path.join(base, 'ROADMAP.md'), 'utf8');
  for (const item of plan.workPackages || [])
    if (!roadmap.includes(`https://github.com/${plan.repository}/issues/${item.issue}`)) errors.push(`Roadmap misses issue ${item.issue}.`);
  return errors;
}

export function inspectDirectory(directory = HERE, options = {}) {
  try {
    const plan = JSON.parse(fs.readFileSync(path.join(directory, 'plan.json'), 'utf8'));
    const config = JSON.parse(fs.readFileSync(path.join(directory, 'examples/capacitor.config.json'), 'utf8'));
    const result = validatePlan(plan, config, options);
    if (result.errors.length === 0) result.errors.push(...checkFiles(plan, directory));
    return result;
  } catch (error) {
    return { errors: [`Cannot validate planning package: ${error.message}`] };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const result = args.some((arg) => arg !== '--release')
    ? { errors: ['Usage: node docs/capacitor/validate-plan.mjs [--release]'] }
    : inspectDirectory(HERE, { release: args.includes('--release') });
  console.log(JSON.stringify({ kind: 'planning-only', ...result }, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
