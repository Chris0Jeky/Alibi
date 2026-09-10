"""Expected browser catalogue values from checked-in source registries."""
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parents[1] / 'content'

# Keep this family-to-group map aligned with the runtime catalogue groups in
# src/presentation.js. The assertions below then follow source packs as new
# puzzles are added instead of freezing a UI count in a browser test.
GROUP_FAMILIES = {
    'mystery': frozenset({'scene', 'dossier', 'witness'}),
    'classic': frozenset({'sudoku', 'binary', 'futoshiki'}),
    'visual': frozenset({
        'bridges', 'nonogram', 'lightup', 'tents', 'aquarium', 'network', 'trail'
    }),
}


def official_puzzles():
    registry = json.loads((CONTENT / 'official-packs.json').read_text(encoding='utf-8'))
    return [
        puzzle
        for source in registry['packs']
        for puzzle in json.loads((CONTENT / source).read_text(encoding='utf-8'))['puzzles']
    ]


def official_group_count(group):
    try:
        families = GROUP_FAMILIES[group]
    except KeyError as error:
        raise ValueError(f'Unknown catalogue group: {group}') from error
    return sum(puzzle.get('type') in families for puzzle in official_puzzles())


def official_venue_count(venue):
    collections = json.loads(
        (CONTENT / 'curation' / 'editorial' / 'collections.json').read_text(
            encoding='utf-8'
        )
    )['collections']
    try:
        collection = next(collection for collection in collections if collection['id'] == venue)
    except StopIteration as error:
        raise ValueError(f'Unknown collection venue: {venue}') from error
    return len(collection['puzzleIds'])


OFFICIAL_COUNT = len(official_puzzles())
