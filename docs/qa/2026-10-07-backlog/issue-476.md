# Issue 476: pending request errors before explicit abort

Based on main 2758d91, which already includes #558's overlapping transaction serialization. This change fills the remaining fixture gap: explicit abort delivers AbortError to running and queued request callbacks before transaction abort. Request error events bubble to transaction error listeners unless stopPropagation is called; preventDefault does not suppress bubbling. No production storage code or save format changes.

The new ordering regression failed before the correction: only transaction abort callbacks ran. The corrected fixture passes `node --test tests/restore-ordering.test.cjs tests/club-storage.test.cjs`: 32 passed, no failures or skips. Own npm install and Prettier checks passed. Semantics were checked against the [IndexedDB abort algorithm](https://www.w3.org/TR/IndexedDB/#abort-transaction).

Independent read-only Grok 4.7 high review completed normally with no blocker. One LOW suggestion to explicitly record the stopped second request callback was declined as further fixture expansion; ordering and listener suppression already have regressions. This classification is also posted on the PR.

This fixture does not model database-level bubbling or put request objects. Native IndexedDB durability, physical Android/TalkBack and deployment remain unverified. HUMAN_TODO.md retains those human gates. Muse refused lane creation because this host differs from the registry owner; no Muse job ran.
