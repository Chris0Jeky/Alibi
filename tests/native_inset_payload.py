"""Read the emitted Android style; do not substitute source CSS for missing build output."""
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path

LAYER_ID = 'alibi-native-ui'


class Styles(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.styles = []
        self.current = None
        self.position = 0
        self.stylesheets = []
        self.feed(text)
        self.close()
        if self.current is not None:
            raise ValueError('Unclosed emitted style element')

    def handle_starttag(self, tag, attributes):
        self.position += 1
        attributes = dict(attributes)
        if tag == 'style':
            self.current = {'id': attributes.get('id'), 'css': '', 'position': self.position}
        elif tag == 'link' and 'stylesheet' in (attributes.get('rel') or '').lower().split():
            self.stylesheets.append(self.position)

    def handle_data(self, data):
        if self.current is not None:
            self.current['css'] += data

    def handle_endtag(self, tag):
        if tag == 'style' and self.current is not None:
            self.styles.append(self.current)
            self.current = None


def validate_payloads(android_html, web_html, expected_css):
    android, web = Styles(android_html), Styles(web_html)
    layers = [style for style in android.styles if style['id'] == LAYER_ID]
    if len(layers) != 1 or not expected_css or layers[0]['css'] != expected_css:
        raise ValueError('Android output needs exactly one current, complete native style layer')
    if not android.stylesheets or layers[0]['position'] >= min(android.stylesheets):
        raise ValueError('Native style must precede emitted shared stylesheets, as tested')
    if any(style['id'] == LAYER_ID or '--safe-area-inset-' in style['css']
           or expected_css in style['css'] for style in web.styles):
        raise ValueError('Native style leaked into the web payload')
    return layers[0]['css']


def load_native_style(root: Path):
    android = (root / 'dist-android/index.html').read_bytes()
    web = (root / 'dist/index.html').read_bytes()
    expected = (root / 'src/platform/native-insets.css').read_bytes().decode('utf-8')
    emitted = validate_payloads(android.decode('utf-8'), web.decode('utf-8'), expected)
    for stylesheet in (root / 'dist').rglob('*.css'):
        if '--safe-area-inset-' in stylesheet.read_text(encoding='utf-8'):
            raise ValueError(f'Native inset consumers leaked into web stylesheet: {stylesheet.name}')
    return emitted, {'androidIndexSha256': sha256(android).hexdigest(),
                     'webIndexSha256': sha256(web).hexdigest(),
                     'nativeStyleSha256': sha256(emitted.encode('utf-8')).hexdigest()}
