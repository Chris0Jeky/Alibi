from pathlib import Path

path = Path('src/castle/view.mjs')
source = path.read_text(encoding='utf-8')

old = """  function compareRecords() {
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
new = """  function compareRecords() {
    const ids = [...root.querySelectorAll('[data-compare-record]:checked')].map(
        (input) => input.value,
      ),
      records = E.evidence(state).filter((record) => ids.includes(record.id));
    if (ids.length < 2 || ids.length > 3 || records.length !== ids.length) return;
    show('Compare collected records', evidenceComparison(records));
  }
"""
if source.count(old) != 1:
    raise SystemExit('Expected one evidence comparison controller.')
source = source.replace(old, new, 1)

old = """      else if (el.dataset.compareRecord !== undefined) {
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
new = """      else if (el.dataset.compareRecord !== undefined) {
        let selected = root.querySelectorAll('[data-compare-record]:checked');
        if (selected.length > 3) {
          el.checked = false;
          selected = root.querySelectorAll('[data-compare-record]:checked');
        }
        const control = root.querySelector('[data-do="compare-records"]');
        if (control) control.disabled = selected.length < 2;
        if ($('#compare-status')) $('#compare-status').textContent = `${selected.length} selected.`;
      }"""
if source.count(old) != 1:
    raise SystemExit('Expected one evidence selection controller.')
source = source.replace(old, new, 1)
path.write_text(source, encoding='utf-8')
