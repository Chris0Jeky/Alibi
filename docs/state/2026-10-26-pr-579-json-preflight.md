# Origin-transfer JSON-data preflight (#579 child)

## Scope

This is a child of the unreleased save-transfer work, stacked on #776. It adds a
conservative JSON-data boundary before ordinary transfer export and before import
admits its recovery snapshot. It does not qualify parent #579 for main.

`JSON.stringify` can replace a Map with an empty object, change a Date into text,
omit undefined fields, or invoke a serializer that drops data. The new shared
checker refuses unsupported values before creating an export checksum, or before
calling the import's recovery-retain or domain-write ports. It checks the original
preimages without normalizing or cloning them.

Supported records have plain or null prototypes and enumerable own data fields;
arrays have their ordinary native prototype and dense canonical indices. The
checker accepts genuine cross-realm records/arrays and repeated acyclic values,
including Castle's state/record alias. It refuses cycles, nonfinite numbers,
negative zero, undefined, BigInt, functions, symbols, custom prototypes, sparse or
extended arrays, non-enumerable fields and accessors. Accepted prototype chains
are inspected for inherited `toJSON` descriptors without invoking them. Export
and recovery serialization wrappers have null prototypes, so an inherited
serializer in the transfer realm cannot replace those wrappers either.

The only private exception is the existing `FALLBACK_RAW` Symbol on the root Quiet
section, and only for ordinary-transfer preflights. Its data descriptor must hold
the expected string, null or undefined metadata. Nested/other Symbols and Symbol
accessors are refused. The original object still reaches live rollback, preserving
the raw fallback bytes held there. Recovery export has no Symbol exception; the
public Quiet payload remains exactly `kind/schema/state`.

The public transfer and recovery formats and versions do not change. The earlier
sparse-Castle regression now expects the JSON refusal before Castle's content
comparison; it still proves that the sparse original is unchanged.

## Verification

- Thirty-one new Node tests cover unsupported values before checksum creation,
  every domain's preimage refusal before retain/write/release, native cross-realm
  and null-prototype data, Castle aliases, private metadata scope, own accessors,
  inherited serializers and wrapper protection. The initial regression run failed
  on the preceding implementation. All ten transfer suites pass: **107 tests**.
- The real-origin browser fixture uses actual Settings download controls at
  **390 and 1280 pixels**. Fresh saves and synthetic JSON fallback/Castle records
  export with a valid checksum and retain their unknown JSON fields. Raw Quiet
  fallback text stays unchanged.
- A real IndexedDB Map is refused by the ordinary download control and remains in
  the database. A confirmed API attempt using real Quiet/Castle/Challenge reads
  and synthetic Cabinet/Club ports refuses before recovery admission or any import
  write/release: all three call counts are zero. No recovery database is created.
  This is not destructive five-domain player-import acceptance.
- Local browser receipt: Playwright 1.62.0, Chromium 141.0.7390.37, dirty development
  build `28adedf3d379`, source base `d0785db`, payload
  `38f443e5dd05d4d875cc76cc79111c9f91832a8012520acc02057de2a92f86e8`.
  `test-results/origin-transfer-safety/json-preflight-receipt.json` reports no page
  errors. The dedicated workflow now pins and runs this ordinary-export fixture
  alongside the startup/offline and other real-IDB transfer checks.
- Independent review identified inherited serializers and the wrapper prototype
  as additional cases; both are addressed with regressions. Final independent
  review and exact published-head hosted qualification remain required.

## Explicit unreleased feature cost

The clean startup-recovery implementation receipt at `b3ac630` measured application
gzip **140,079**, initial gzip **209,431**, and net raw shell **1,427,623** bytes.
The new dirty development build measures **140,377 / 209,732 / 1,428,423**:
**+298 / +301 / +800 bytes**. One checker is shared across all three boundaries;
no dependency or new persistence layer is added.

This child explicitly adds **256 bytes** to each feature application/initial gzip
ceiling and **768 bytes** to its raw-shell ceiling. The resulting limits are
**140,416 / 209,760 / 1,428,520.32**. The measured output passes those declared
limits; a clean hosted identity still needs qualification. Main's ceilings are
unchanged, and the feature still needs current-main reconciliation and byte work.

## Remaining gates

The checker can only inspect values returned by domain readers. It cannot recover
unknown records or metadata a reader already filtered or normalized. It is not a
complete domain inventory or semantic-save validator. Ordinary writers and other
tabs can still change data after a read or during asynchronous retention; this is
not an owner/CAS protocol or atomic five-domain transfer.

The private raw fallback Symbol still does not survive IndexedDB structured clone
into the legacy recovery record. A versioned private interruption journal,
conditional restoration/cleanup, #746 items 1 and 4, deeper validation, current-main
integration, and the existing physical Android, TalkBack and native document-provider
gates remain open. See [HUMAN_TODO.md](../../HUMAN_TODO.md).
