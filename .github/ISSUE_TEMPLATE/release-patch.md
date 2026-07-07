---
name: Patch Release [x.y.Z]
about: Releasing a patch version of nexus-webfont-converter
title: "[PATCH RELEASE] nexus-webfont-converter [x.y.Z]"
labels: RELEASE
assignees: vsjov
---

# Patch Release [x.y.Z]

Release date: _date_

Package: `nexus-webfont-converter`
Registry: `https://registry.npmjs.org`

**IMPORTANT:** `master` is the stable branch and should always work. Do not merge unfinished work there.

## Release Contents

- [ ] List the fixes included in this patch release.
- [ ] Confirm each fix is already merged to `master` or intentionally cherry-picked.
- [ ] Confirm there are no breaking changes.

Included issues / PRs:

- #...

## Release Workflow

1. **Create the release branch**
    - [ ] Create `release/[x.y.Z]` from `master` or from the previous release tag when this is a backport patch.
    - [ ] Confirm the release branch name exactly matches the package version.
    - [ ] Cherry-pick patch commits if this release does not branch directly from `master`.
    - [ ] Resolve conflicts and commit any release-only fixes.

2. **Set the release version**
    - [ ] Update `package.json` and `npm-shrinkwrap.json`:
        ```bash
        npm run version-update -- [x.y.Z]
        ```
    - [ ] Commit the version changes:
        ```bash
        git add package.json npm-shrinkwrap.json
        git commit -m "release: version bump to [x.y.Z]"
        ```

3. **Update the changelog**
    - [ ] Add `## [[x.y.Z]] - YYYY-MM-DD`.
    - [ ] Move released entries from `## [Unreleased]` into the new version section.
    - [ ] Keep unreleased entries under `## [Unreleased]`.
    - [ ] Update changelog compare links for `nexus-webfont-converter`.
    - [ ] Commit `CHANGELOG.md`.

4. **Run release checks**
    - [ ] Run the full local gate with `npm run build-all`.
    - [ ] Review and commit any expected `dist/` changes.
    - [ ] Confirm NPM trusted publishing is configured for `vsjov/nexus-webfont-converter`, workflow filename `main.yml`, no environment name, and allowed action `npm publish`.

5. **Push the release branch**
    - [ ] Push the completed release branch:
        ```bash
        git push -u origin release/[x.y.Z]
        ```
    - [ ] Wait for GitHub Actions to pass on the release branch.
    - [ ] Confirm the remote release branch tip is the exact commit to release. The tag workflow requires the branch and tag to match.

6. **Tag and publish the release**
    - [ ] Tag the exact release branch tip and push the tag:
        ```bash
        git tag -a v[x.y.Z] -m "Release [x.y.Z]"
        git push origin v[x.y.Z]
        ```
        - optionally: If something goes bad during the CI run, revert the release by deleting the tag and pushing the change:
            ```bash
            git tag -d v[x.y.Z]
            git push origin --delete v[x.y.Z]
            ```
    - [ ] Wait for `test-and-build`, `publish-npm-package`, and `create-github-release` to pass on the tag workflow. Publishing and GitHub Release creation are automatic and do not require local npm authentication.
    - [ ] Verify `nexus-webfont-converter@[x.y.Z]` is available on NPM.
    - [ ] If the workflow fails before publishing, delete the tag before correcting and retagging the release branch. Never reuse a version after it has been published.

7. **Set the next development version**
    - [ ] For a current-line patch, bump to the next patch development version:
        ```bash
        npm run version-update -- patch
        git add package.json npm-shrinkwrap.json
        git commit -m "release: bump next development version"
        git push
        ```
    - [ ] For a backport patch, do not merge an older patch-line version bump into `master`.

8. **Merge back**
    - [ ] For a current-line patch, open a PR from `release/[x.y.Z]` to `master`.
    - [ ] Use PR title `release: merge v[x.y.Z] into master`.
    - [ ] Merge after checks pass.
    - [ ] For a backport patch, bring the fix forward to `master` separately if needed.

9. **Finish**
    - [ ] Close this release issue.
