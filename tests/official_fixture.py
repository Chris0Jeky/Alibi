"""Expected browser catalogue size from the checked-in source registry."""
import json
from pathlib import Path
CONTENT = Path(__file__).resolve().parents[1] / 'content'
OFFICIAL_COUNT = sum(
    len(json.loads((CONTENT / source).read_text(encoding='utf-8'))['puzzles'])
    for source in json.loads((CONTENT / 'official-packs.json').read_text(encoding='utf-8'))['packs']
)
