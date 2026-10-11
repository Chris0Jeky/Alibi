// Narrow HTML-escaping pin for src/theatre.js: hostile scene, credit and
// metadata strings must render entity-encoded in bar()/room() output.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/theatre.js"), "utf8");

// An injected image tag, a script tag and every metacharacter escape() encodes.
const IMG = "<img src=x onerror=alert(1)>";
const SCRIPT = '<script>alert("stage")</script>';
const METACHARS = "&<>\"'";

function loadTheatre() {
  const store = new Map();
  const sandbox = {
    ALIBI_THEATRE: {
      scenes: [
        {
          id: "reading-room",
          title: `Stay ${IMG} ${SCRIPT} ${METACHARS}`,
          subtitle: `Soft 'rain' & "thunder" <low> ${IMG}`,
          motif: "book",
          motion: "rain",
          families: [],
          quiet: [],
          art: "poison-art",
          detail: "poison-detail",
        },
      ],
      audio: [
        {
          id: `waves${METACHARS}`,
          title: `Waves ${SCRIPT} ${METACHARS}`,
          url: "https://example.invalid/waves.opus",
          loop: true,
        },
      ],
      films: [
        {
          id: "poison-film",
          title: `Alibi — Night ${IMG} ${SCRIPT} ${METACHARS}`,
          url: "https://example.invalid/film.mp4",
          duration: 42,
        },
      ],
    },
    ALIBI_DELIVERY: {
      "poison-detail": {
        credit: `Curator <b>bold</b> ${IMG} ${METACHARS}`,
        source: `https://example.invalid/c?x=1&y=<z>"q"'s"`,
      },
    },
    ALIBI_MEDIA: {
      "poison-art": `https://example.invalid/a?x=1&y="big"&${IMG}`,
    },
    AlibiDelivery: { mode: () => "auto" },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
    },
    location: { hash: "#/home" },
    document: {
      addEventListener() {},
      querySelector: () => null,
    },
    addEventListener() {},
  };
  vm.runInNewContext(source, sandbox, { timeout: 2000 });
  assert.ok(sandbox.AlibiTheatre, "src/theatre.js installs AlibiTheatre");
  return sandbox.AlibiTheatre;
}

test("room output escapes hostile titles, credits, sources and films", () => {
  const html = loadTheatre().room();
  // The stage template owns exactly one image element; each payload tag
  // must arrive encoded rather than adding raw markup.
  assert.equal(html.split("<img").length - 1, 1, "only the stage image is raw markup");
  assert.ok(!html.includes("<img src=x"), "no raw injected image tag");
  assert.ok(!html.includes("<script"), "no raw injected script tag");
  assert.ok(!html.includes("<b>bold</b>"), "no raw injected credit markup");
  assert.ok(!html.includes("y=<z>"), "no raw injected credit source");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"), "image tags are encoded");
  assert.ok(
    html.includes('&lt;script&gt;alert(&quot;stage&quot;)&lt;/script&gt;'),
    "script tags are encoded",
  );
  assert.ok(
    html.includes("&amp;&lt;&gt;&quot;&#39;"),
    "all five metacharacters are encoded",
  );
  assert.ok(html.includes("<h3>Stay &lt;img"), "the scene title is encoded");
  assert.ok(
    html.includes("<p>Soft &#39;rain&#39; &amp; &quot;thunder&quot; &lt;low&gt;"),
    "the subtitle is encoded",
  );
  assert.ok(html.includes("Curator &lt;b&gt;bold&lt;/b&gt;"), "the credit is encoded");
  const creditHref =
    'href="https://example.invalid/c?x=1&amp;y=&lt;z&gt;&quot;q&quot;&#39;s&quot;"';
  assert.ok(html.includes(creditHref), "the credit source is encoded");
  const artSrc =
    'src="https://example.invalid/a?x=1&amp;y=&quot;big&quot;&amp;&lt;img';
  assert.ok(html.includes(artSrc), "the artwork source is encoded");
  assert.ok(html.includes("<strong>Night &lt;img"), "the film title is encoded");
});

test("bar output escapes hostile titles and audio metadata", () => {
  const html = loadTheatre().bar();
  // The rail template owns no image element at all.
  assert.ok(!html.includes("<img"), "no raw injected image tag");
  assert.ok(!html.includes("<script"), "no raw injected script tag");
  assert.ok(
    html.includes("Stay &lt;img src=x onerror=alert(1)&gt;"),
    "the room title is encoded",
  );
  assert.ok(
    html.includes('&lt;script&gt;alert(&quot;stage&quot;)&lt;/script&gt;'),
    "script payloads are encoded",
  );
  assert.ok(html.includes("&amp;&lt;&gt;&quot;&#39;"), "metacharacters are encoded");
  assert.ok(
    html.includes('<option value="waves&amp;&lt;&gt;&quot;&#39;"'),
    "the audio id is encoded",
  );
  assert.ok(html.includes(">Waves &lt;script&gt;"), "the audio title is encoded");
});
