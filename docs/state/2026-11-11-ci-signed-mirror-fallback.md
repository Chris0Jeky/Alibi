# Signed Ubuntu mirror fallback for CI

This change starts from Alibi main `e8582b8d9652206db3b1d7de0061b201f151df63`. Hosted Ubuntu jobs
on #929 and #934 failed to resolve the standard package mirrors. A direct signed Funet probe
also timed out from one runner, so the CI setup uses a priority list with two independent HTTPS
mirrors. [Standard mirror probe](https://github.com/Chris0Jeky/Alibi/actions/runs/43044431588) ·
[Funet timeout](https://github.com/Chris0Jeky/Alibi/actions/runs/43046672177/attempts/1)

`tools/ci-ubuntu-sources.sh` provisions only the package source configuration in the existing
Ubuntu 24.04 jobs. APT uses the runner's Ubuntu archive keyring, the four Noble pockets and
strict update errors. The helper configures both local mirror lists because unqualified APT
inside Playwright also consulted the stock runner list. Cabinet, native and focused jobs retain
their install commands, conditions, action pins, build and test steps. Filtered jobs include the
helper path.

## Evidence

- A single-list canary passed explicit APT and failed nested Playwright when APT also consulted
  the stock list. [Canary log](https://github.com/Chris0Jeky/Alibi/actions/runs/43050270304/job/130625132837)
- A second canary at `ff571fa5dfacaec1691dbb0b778faeb6b45334dd` populated the signed indexes
  through a deliberately unreachable primary and a live secondary. With both lists pointing
  to unreachable mirrors, bare APT returned 100 despite populated indexes. After restoration,
  bare APT, libpulse, FFmpeg/ffprobe 6.1.1, the full pinned Playwright dependency install and
  Chromium 151.0.7922.34 launch passed.
  [Canary log](https://github.com/Chris0Jeky/Alibi/actions/runs/43051814611/job/130630685320)
- Local Ubuntu 24.04 WSL passed `bash -n tools/ci-ubuntu-sources.sh`,
  `python3 tests/test_ci_ubuntu_sources.py` (4) and `python3 tests/test_ci_audio_dependencies.py` (6).
  Local Node with Git Bash on PATH ran `node --test tests/ci-setup-phase.test.cjs
  tests/android-native-scope.test.cjs tests/ci-scope.test.cjs` (24 passed, 4 Linux-only skips).
  A YAML comparison confirmed the 31 changed workflows preserved existing job and test behavior,
  with source setup ahead of every APT caller and the helper covered by existing path filters.

## Remaining qualification

The integration head still needs exact-head hosted checks, including cabinet audio and real-origin
browser coverage, and the installed Android emulator smoke. When #929 and #934 take this base,
their branch-specific Timeline and browser shadow workflows need the helper before Playwright.
See [HUMAN_TODO.md](../../HUMAN_TODO.md) for owner decisions.
