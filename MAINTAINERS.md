# Maintainers Guide

This document outlines workflows meant only for core maintainers of `@picsa/capacitor-video-player`. Please see `CONTRIBUTING.md` for general contribution guidelines.

## Release Management

Releases are fully automated and should **not** be triggered manually.

1. As PRs are merged into `main`, Release Please will automatically open and maintain a "Release PR" (e.g., `chore: release 7.2.0`). This PR contains the updated `package.json` version and the newly generated `CHANGELOG.md`.
2. When the maintainers are ready to release the next version, they simply **approve and merge the Release Please PR**.
3. Merging the PR triggers a GitHub Action to automatically tag the commit, publish a GitHub Release, and securely publish the new version to the **NPM Registry using Provenance** (via Trusted Publishers OIDC). No manual NPM tokens are required.

### Forcing a specific version

If you need to force a specific version rather than relying on the automated SemVer calculation, you can use the `Release-As` commit footer in any PR merged to `main`.

For example, to force a major release, format your PR merge commit message like this:
```text
feat: awesome new feature

Release-As: 8.0.0
```

When this is merged, Release Please will update its pending Release PR to target your specified version.
