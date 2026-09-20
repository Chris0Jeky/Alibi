from pathlib import Path
import re

pages = Path('src/castle/pages.mjs')
source = pages.read_text(encoding='utf-8')
old = "import { theoryBoard } from './investigation-view.mjs';"
new = old + "\nimport { evidenceBoard } from './evidence-view.mjs';"
if source.count(old) != 1:
    raise SystemExit('Expected one pages import anchor.')
source = source.replace(old, new, 1)
pattern = re.compile(
    r'<h2>Collected records</h2><div class="directory">\$\{\n      state\.preferences\.story.*?\n    \}</div>\$\{theoryBoard\(state\)\}',
    re.S,
)
replacement = "${state.preferences.story\n        ? evidenceBoard(E.evidence(state))\n        : '<h2>Collected records</h2><p>Story records are hidden. Turn the story back on in Preferences to read them.</p>'}${theoryBoard(state)}"
source, count = pattern.subn(lambda _: replacement, source, count=1)
if count != 1:
    raise SystemExit(f'Expected one notebook evidence block, found {count}.')
pages.write_text(source, encoding='utf-8')

view = Path('src/castle/view.mjs')
source = view.read_text(encoding='utf-8')
old = "import { theoryForm } from './investigation-view.mjs';"
new = old + "\nimport { evidenceComparison } from './evidence-view.mjs';"
if source.count(old) != 1:
    raise SystemExit('Expected one view import anchor.')
source = source.replace(old, new, 1)
anchor = "  function editTheory(id) {"
block = """  function compareRecords() {
    const ids = [...root.querySelectorAll('[data-compare-record]:checked')].map(
        (input) => input.value,
      ),
      records = E.evidence(state).filter((record) => ids.includes(record.id));
    if (records.length !== ids.length || records.length < 2 || records.length > 3) {
      const message = 'Choose two or three collected records to compare.';
      if ($('#compare-status')) $('#compare-status').textContent = message;
      announce(message);
      return;
    }
    show('Compare collected records', evidenceComparison(records));
  }
"""
if source.count(anchor) != 1:
    raise SystemExit('Expected one comparison insertion anchor.')
source = source.replace(anchor, block + anchor, 1)
old = "    } else if (name === 'theory-edit') editTheory(value);"
new = "    } else if (name === 'compare-records') compareRecords();\n    else if (name === 'theory-edit') editTheory(value);"
if source.count(old) != 1:
    raise SystemExit('Expected one comparison action anchor.')
source = source.replace(old, new, 1)
old = "      if (el.id === 'castle-import') importFile(el.files[0]).catch(failure);"
new = """      if (el.id === 'castle-import') importFile(el.files[0]).catch(failure);
      else if (el.dataset.compareRecord !== undefined) {
        const selected = [...root.querySelectorAll('[data-compare-record]:checked')];
        if (selected.length > 3) {
          el.checked = false;
          if ($('#compare-status'))
            $('#compare-status').textContent = 'Compare up to three records at a time.';
        } else {
          const count = selected.length;
          if ($('#compare-status'))
            $('#compare-status').textContent = count
              ? `${count} record${count === 1 ? '' : 's'} selected. Choose two or three.`
              : 'Choose two or three collected records to compare.';
        }
        const count = root.querySelectorAll('[data-compare-record]:checked').length,
          control = root.querySelector('[data-do="compare-records"]');
        if (control) control.disabled = count < 2 || count > 3;
      }"""
if source.count(old) != 1:
    raise SystemExit('Expected one comparison change anchor.')
source = source.replace(old, new, 1)
view.write_text(source, encoding='utf-8')
