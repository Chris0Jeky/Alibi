"""Load the emitted cascade rather than guessing a subset of source stylesheets."""
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import re

from native_inset_payload import Styles, LAYER_ID

CSS_PATH = re.compile(r'(?:\./)?(assets/[a-zA-Z0-9_-]+\.([0-9a-f]{12})\.css)\Z')


class Links(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.paths = []
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        rel = (attrs.get('rel') or '').lower().split()
        if tag != 'link' or 'stylesheet' not in rel:
            return
        if rel != ['stylesheet'] or attrs.get('media', 'all') != 'all' or 'disabled' in attrs:
            raise ValueError('Conditional/alternate stylesheets need explicit fixture support')
        match = CSS_PATH.fullmatch(attrs.get('href') or '')
        if not match:
            raise ValueError('Expected a local fingerprinted stylesheet URL')
        self.paths.append(match[1])


def read_style(directory, name):
    match = CSS_PATH.fullmatch(name)
    if not match:
        raise ValueError('Expected a local fingerprinted stylesheet path')
    file = directory / name
    if directory.is_symlink() or file.parent.is_symlink() or file.is_symlink() or not file.is_file():
        raise ValueError('Stylesheet must be a regular emitted file')
    data = file.read_bytes()
    digest = sha256(data).hexdigest()
    if not data or digest[:12] != match[2]:
        raise ValueError('Emitted stylesheet bytes do not match their filename hash')
    return data, {'path': name, 'sha256': digest, 'bytes': len(data)}


def load_shared_styles(root: Path):
    directories = [root / 'dist-android', root / 'dist']
    indexes = [(directory / 'index.html').read_text(encoding='utf-8') for directory in directories]
    linked = [Links(text).paths for text in indexes]
    if linked[0] != linked[1] or not linked[0] or len(set(linked[0])) != len(linked[0]):
        raise ValueError('Android and web need the same nonempty ordered stylesheet links')
    if sum(bool(re.fullmatch(r'assets/alibi\.[0-9a-f]{12}\.css', name)) for name in linked[0]) != 1:
        raise ValueError('The complete emitted cabinet stylesheet is required exactly once')
    for text in indexes:
        if any(style['id'] != LAYER_ID for style in Styles(text).styles):
            raise ValueError('Additional inline shared styles need explicit fixture support')
    names = list(linked[0])
    for family in ('block-motion', 'house'):
        candidates = list((directories[0] / 'assets').glob(f'{family}.*.css'))
        if len(candidates) != 1:
            raise ValueError(f'Expected one complete emitted {family} stylesheet')
        name = candidates[0].relative_to(directories[0]).as_posix()
        if name not in names:
            names.append(name)
    styles, evidence = [], []
    for name in names:
        android, entry = read_style(directories[0], name)
        web, _ = read_style(directories[1], name)
        if android != web:
            raise ValueError(f'Android and web shared stylesheet differ: {name}')
        styles.append(android.decode('utf-8'))
        evidence.append(entry)
    return '\n'.join(styles), evidence
