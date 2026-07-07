---
name: Major Release [X.0.0]
about: Releasing a major version of nexus-webfont-converter
title: "[MAJOR RELEASE] nexus-webfont-converter [X.0.0]"
labels: RELEASE
assignees: vsjov
---

# Major Release [X.0.0]

Release date: _date_

Package: `nexus-webfont-converter`
Registry: `https://registry.npmjs.org`

**IMPORTANT:** `master` is the stable branch and should always work. Do not merge unfinished work there.

## Release Contents

- [ ] List the breaking changes, features, fixes, and documentation changes included in this major release.
- [ ] Confirm all included work is merged to `master`.
- [ ] Confirm migration notes are written for every breaking change.
- [ ] Confirm README examples still match the public API.

Included issues / PRs:

- #...

## Release Workflow

1. **Create the release branch**
    - [ ] Create `release/[X.0.0]` from `master`.
    - [ ] Confirm the release branch name exactly matches the package version.
    - [ ] Resolve any release-only fixes on the release branch.

2. **Set the release version**
    - [ ] Update `package.json` and `npm-shrinkwrap.json`:
        ```bash
        npm run version-update -- [X.0.0]
        ```
    - [ ] Commit the version changes:
        ```bash
        git add package.json npm-shrinkwrap.json
        git commit -m "Version bump to [X.0.0]"
        ```

3. **Update the changelog**
    - [ ] Add `## [[X.0.0]] - YYYY-MM-DD`.
    - [ ] Move released entries from `## [Unreleased]` into the new version section.
    - [ ] Add a clear breaking-changes section.
    - [ ] Keep unreleased entries under `## [Unreleased]`.
    - [ ] Update changelog compare links for `nexus-webfont-converter`.
    - [ ] Commit `CHANGELOG.md`.

4. **Run release checks**
    - [ ] Run the full local gate with `npm run build-all`.
    - [ ] Review and commit any expected `dist/` changes.
    - [ ] Confirm NPM trusted publishing is configured for `vsjov/nexus-webfont-converter`, workflow filename `main.yml`, no environment name, and allowed action `npm publish`.

5. **Verify migration path**
    - [ ] Test the documented migration from the previous major version.
    - [ ] Verify a consuming project can install and import `nexus-webfont-converter`.
    - [ ] Verify CLI conversion output for at least one representative font fixture or consuming project.

6. **Push the release branch**
    - [ ] Push the completed release branch:
        ```bash
        git push -u origin release/[X.0.0]
        ```
    - [ ] Wait for GitHub Actions to pass on the release branch.
    - [ ] Confirm the remote release branch tip is the exact commit to release. The tag workflow requires the branch and tag to match.

7. **Tag and publish the release**
    - [ ] Tag the exact release branch tip and push the tag:
        ```bash
        git tag -a v[X.0.0] -m "Release [X.0.0]"
        git push origin v[X.0.0]
        ```
    - [ ] Optionally: If something goes bad during the CI run, revert the release by deleting the tag and pushing the change:
        ```bash
        git tag -d v[X.0.0]
        git push origin --delete v[X.0.0]
        ```
    - [ ] Wait for both `test-and-build` and `publish-npm-package` to pass on the tag workflow. Publishing is automatic and does not require local npm authentication.
    - [ ] Verify `nexus-webfont-converter@[X.0.0]` is available on NPM.
    - [ ] If the workflow fails before publishing, delete the tag before correcting and retagging the release branch. Never reuse a version after it has been published.

8. **Set the next development version**
    - [ ] Bump to the next minor development version:
        ```bash
        npm run version-update -- minor
        git add package.json npm-shrinkwrap.json
        git commit -m "chore: bump next development version"
        git push
        ```

9. **Merge back**
    - [ ] Open a PR from `release/[X.0.0]` to `master`.
    - [ ] Use PR title `release: merge v[X.0.0] into master`.
    - [ ] Merge after checks pass.

10. **Finish**
    - [ ] Close this release issue.
