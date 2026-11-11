#!/usr/bin/env bash
set -euo pipefail

if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo 'Ubuntu CI source setup requires a GitHub Actions Linux runner.' >&2
  exit 1
fi

sources=/etc/apt/sources.list.d/ubuntu.sources
keyring=/usr/share/keyrings/ubuntu-archive-keyring.gpg
mirror_list=/etc/apt/alibi-ci-mirrors.txt
runner_mirror_list=/etc/apt/apt-mirrors.txt
primary=https://mirrors.edge.kernel.org/ubuntu/
fallback=https://mirrors.nic.funet.fi/ubuntu/

sudo test -s "$sources"
sudo test -r "$keyring"
# Unqualified APT can also read the runner's stock mirror list.
printf '%s\tpriority:%s\n' "$primary" 1 "$fallback" 2 |
  sudo tee "$mirror_list" "$runner_mirror_list" >/dev/null

# Native explicitly uses this file and Playwright invokes APT itself.
sudo tee "$sources" >/dev/null <<SOURCES
Types: deb
URIs: mirror+file:$mirror_list
Suites: noble noble-updates noble-backports noble-security
Components: main restricted universe multiverse
Signed-By: $keyring
SOURCES

# Apply the timeout and strict update policy to both direct and nested calls.
sudo tee /etc/apt/apt.conf.d/zzz-alibi-ci-sources >/dev/null <<CONFIG
Dir::Etc::sourcelist "$sources";
Dir::Etc::sourceparts "-";
Acquire::Retries "0";
Acquire::http::Timeout "15";
Acquire::https::Timeout "15";
APT::Update::Error-Mode "any";
CONFIG

printf 'Ubuntu APT mirrors (in order): %s %s\n' "$primary" "$fallback"
