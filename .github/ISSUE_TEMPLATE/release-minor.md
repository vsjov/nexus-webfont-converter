---
name: Minor Release [x.Y.0]
about: Releasing a minor version of nexus-webfont-converter
title: "[MINOR RELEASE] nexus-webfont-converter [x.Y.0]"
labels: RELEASE
assignees: vsjov
---

# Minor Release [x.Y.0]

Release date: _date_

Package: `nexus-webfont-converter`
Registry: `https://registry.npmjs.org`

**IMPORTANT:** `master` is the stable branch and should always work. Do not merge unfinished work there.

## Release Contents

- [ ] List the features, fixes, and documentation changes included in this minor release.
- [ ] Confirm all included work is merged to `master`.
- [ ] Confirm there are no breaking changes.

Included issues / PRs:

- #...

## Release Workflow

1. **Create the release branch**
    - [ ] Create `release/[x.Y.0]` from `master`.
    - [ ] Confirm the release branch name exactly matches the package version.
    - [ ] Resolve any release-only fixes on the release branch.

2. **Set the release version**
    - [ ] Update `package.json` and `npm-shrinkwrap.json`:
        ```bash
        npm run version-update -- [x.Y.0]
        ```
    - [ ] Commit the version changes:
        ```bash
        git add package.json npm-shrinkwrap.json
        git commit -m "release: version bump to [x.Y.0]"
        ```

3. **Update the changelog**
    - [ ] Add `## [[x.Y.0]] - YYYY-MM-DD`.
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
        git push -u origin release/[x.Y.0]
        ```
    - [ ] Wait for GitHub Actions to pass on the release branch.
    - [ ] Confirm the remote release branch tip is the exact commit to release. The tag workflow requires the branch and tag to match.

6. **Tag and publish the release**
    - [ ] Tag the exact release branch tip and push the tag:
        ```bash
        git tag -a v[x.Y.0] -m "Release [x.Y.0]"
        git push origin v[x.Y.0]
        ```
        - optionally: If something goes bad during the CI run, revert the release by deleting the tag and pushing the change:
            ```bash
            git tag -d v[x.Y.0]
            git push origin --delete v[x.Y.0]
            ```
    - [ ] Wait for both `test-and-build` and `publish-npm-package` to pass on the tag workflow. Publishing is automatic and does not require local npm authentication.
    - [ ] Verify `nexus-webfont-converter@[x.Y.0]` is available on NPM.
    - [ ] If the workflow fails before publishing, delete the tag before correcting and retagging the release branch. Never reuse a version after it has been published.

7. **Set the next development version**
    - [ ] Bump to the next minor development version:
        ```bash
        npm run version-update -- minor
        git add package.json npm-shrinkwrap.json
        git commit -m "release: bump next development version"
        git push
        ```

8. **Merge back**
    - [ ] Open a PR from `release/[x.Y.0]` to `master`.
    - [ ] Use PR title `release: merge v[x.Y.0] into master`.
    - [ ] Merge after checks pass.

9. **Finish**
    - [ ] Close this release issue.
