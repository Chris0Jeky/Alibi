from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
app = root / 'src/app.js'
text = app.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label} anchor count: {count}')
    text = text.replace(old, new)


replace_once(
    """  function commit(next, { reveal = false, history = true } = {}) {
    if (!current || C.equal(next, current.state)) return false;
    if (history) {
""",
    """  function commit(next, { reveal = false, history = true } = {}) {
    if (!current || C.equal(next, current.state)) return false;
    globalThis.ALIBI_OBSERVATORY_JOURNEY?.begin?.();
    if (history) {
""",
    'commit begin',
)
replace_once(
    """      current.completedAt = new Date().toISOString();
      current.firstCompletedAt = current.firstCompletedAt || current.completedAt;
      globalThis.AlibiTheatre.moment('complete');
""",
    """      current.completedAt = new Date().toISOString();
      current.firstCompletedAt = current.firstCompletedAt || current.completedAt;
      globalThis.ALIBI_OBSERVATORY_JOURNEY?.complete?.();
      globalThis.AlibiTheatre.moment('complete');
""",
    'completion terminal',
)
replace_once(
    """    if (issues.length)
      feedback =
        issues[0].message +
        (issues.length > 1 ? ` (${issues.length} rule conflicts to revisit.)` : '');
    else if (E[p.type].complete(p, current.state)) feedback = 'Solved. Every rule is satisfied.';
""",
    """    if (issues.length) {
      globalThis.ALIBI_OBSERVATORY_JOURNEY?.fail?.();
      feedback =
        issues[0].message +
        (issues.length > 1 ? ` (${issues.length} rule conflicts to revisit.)` : '');
    } else if (E[p.type].complete(p, current.state))
      feedback = 'Solved. Every rule is satisfied.';
""",
    'failed check terminal',
)
replace_once(
    """  function showHint() {
    if (!current) return;
    const hint = C.insights.deduction(current.puzzle, current.state);
""",
    """  function showHint() {
    if (!current) return;
    globalThis.ALIBI_OBSERVATORY_JOURNEY?.hint?.();
    const hint = C.insights.deduction(current.puzzle, current.state);
""",
    'hint event',
)
app.write_text(text, encoding='utf-8')

subprocess.run(
    ['npx', 'prettier', '--write', 'src/app.js', 'src/observatory-loader.js', 'tests/observatory-journey.test.cjs'],
    cwd=root,
    check=True,
)
subprocess.run(['node', '--test', 'tests/observatory-journey.test.cjs'], cwd=root, check=True)
subprocess.run(['npm', 'run', 'verify'], cwd=root, check=True)
subprocess.run(['git', 'diff', '--check'], cwd=root, check=True)

(root / '.github/workflows/tmp-patch-observatory-journey.yml').unlink()
Path(__file__).unlink()
subprocess.run(['git', 'config', 'user.name', 'github-actions[bot]'], cwd=root, check=True)
subprocess.run(
    ['git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'],
    cwd=root,
    check=True,
)
subprocess.run(['git', 'add', '-A'], cwd=root, check=True)
subprocess.run(['git', 'commit', '-m', 'Emit bounded Observatory puzzle journey events'], cwd=root, check=True)
subprocess.run(
    ['git', 'push', 'origin', 'HEAD:feat/observatory-puzzle-journey-18'], cwd=root, check=True
)
