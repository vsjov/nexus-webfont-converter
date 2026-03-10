---
name: Minor Release x.Y.0
about: Releasing a minor version of the nexus-webfont-converter
title: "[MINOR RELEASE] nexus-webfont-converter x.Y.0"
labels: RELEASE
assignees: vsjov
---

# Minor Release x.Y.0

Release date: _date_

**IMPORTANT:** `master` branch is considered to be a stable branch and should always work. Unfinished features should never be merged there!

## Release Workflow

1. **Pre-release tasks**
    * [ ] Create a release issue from this template
    * [ ] List features / PRs that go into this release (below this check)
        * [Github issue number]
    * [ ] Confirm that the required features and fixes are implemented on the `master` branch.

1. **Create a `release-v[x.Y.0]` branch:**
    * [ ] Create branch from `master`
    * [ ] Run `npm run lint`, `npm run build`, and `npm run test` to ensure that build is successful.
    * [ ] Ensure that everything works as expected and that no code is broken.
    * [ ] (optional) Create `release-fix` commits, which may solve some issues found during release testing.
        * [ ] (optional) Recreate npm-shrinkwrap.json file with `npm shrinkwrap` if the `package.json` file was changed.
        * [ ] (optional) Push any changes to dist directories if needed.

1. **Set the minor version**
    * [ ] Set the minor version in `package.json`, re-run `npm shrinkwrap` and commit the change

1. **Update Changelog**
    * [ ] Create a new section where the version number matches the release number. Move all released PR's to this section, while keeping the unreleased PR's in the `## Unreleased` section.
    * [ ] Update links at the bottom
    * [ ] Commit the Changelog changes

1. **Perform Unit and E2E Tests**
    * [ ] Run `npm start` that includes tests, linting, and build.
        * All tasks and tests should pass
            * [ ] Linux (WSL/VM/native Ubuntu LTS)
            * [ ] MacOS
        * [ ] Any changes to `dist/` directories should be examined and committed if ok
    * [ ] Any tests that were not automated should be performed manually.

1. **Start the release**
    * [ ] Tag a release on the release branch (**THIS STARTS THE RELEASE**)
        ```bash
        git tag -a v[x.Y.0] -m "Release [x.Y.0]"
        git push origin v[x.Y.0]
        ```
        * Optionally: If something goes bad during the CI run, you can revert the release by deleting the tag and pushing the change:
            ```bash
            git tag -d v[x.Y.0]
            git push origin --delete v[x.Y.0]
            ```
    * [ ] Wait for CI to finish the release process

1. **Publish the NPM package**
    * [ ] Publish the package to NPM with `npm publish`
    * [ ] Wait for the package to be published and verify that it is available on NPM

1. **Post-release Version increment**
    * [ ] Update the version to the next minor release version
    * [ ] Update shrinkwrap file with `npm shrinkwrap`.
    * [ ] Run the `npm run build` and commit any changes to `dist/` directories if there are any.
    * [ ] Commit the changes

1. **Merge-back PR**
    * [ ] Create a PR that merges changes from `release-v[x.Y.0]` back into `master` branch.
        * Use this template for the PR: `release: Merge back [x.Y.0] into master`
            ```markdown
            ## Description
            This PR merges release branch `v[x.Y.0]` into `master`.

            ## How to test
            Nothing to test in this step. Everything was already tested before the tag was pushed.

            ## Code review checklist
            Please check everything that applies for this PR.
            ```
