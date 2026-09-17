'use strict';

const fs = require('node:fs');
const path = require('node:path');

const filename = path.resolve(__dirname, '../tests/browser_block_cabinet.py');
const source = fs.readFileSync(filename, 'utf8');
const anchor = `        check(\n            selection.locator('[data-selection-title]').inner_text().strip() == 'Select a tray piece',\n            f\"Enhanced Block Cabinet starts with a clear next action at {width}px\",\n        )\n`;
const addition = `${anchor}        if width <= 760:\n            menu = page.locator('.bc-host [data-command=\"menu\"]')\n            if menu.get_attribute('aria-expanded') != 'true':\n                menu.click()\n            position = actions.evaluate(\n                \"\"\"el => {\n                  const rect = el.getBoundingClientRect();\n                  return {\n                    top: rect.top + scrollY,\n                    height: rect.height,\n                    max: document.documentElement.scrollHeight - innerHeight,\n                  };\n                }\"\"\"\n            )\n            scroll_target = min(\n                position['top'] + position['height'] + 80,\n                position['max'] - 1,\n            )\n            check(\n                scroll_target > position['top'],\n                f\"Phone fixture scrolls beyond the primary actions at {width}px\",\n            )\n            page.evaluate(\"y => scrollTo(0, y)\", scroll_target)\n            page.wait_for_timeout(100)\n            action_box = actions.bounding_box()\n            check(\n                action_box is not None\n                and action_box['y'] >= 0\n                and action_box['y'] + action_box['height'] <= height + 1,\n                f\"Primary actions remain in the phone viewport while scrolling at {width}px\",\n            )\n            page.evaluate(\"scrollTo(0, 0)\")\n            if menu.get_attribute('aria-expanded') == 'true':\n                menu.click()\n`;
const count = source.split(anchor).length - 1;
if (count !== 1) throw new Error(`Expected one selection-summary anchor; found ${count}.`);
fs.writeFileSync(filename, source.replace(anchor, addition));
