---
name: Patch Release x.y.Z
about: Releasing a patch version of the nexus-webfont-converter
title: "[PATCH RELEASE] nexus-webfont-converter x.y.Z"
labels: RELEASE
assignees: vsjov
---

# Patch Release x.y.Z

Release date: _date_

**IMPORTANT:** `master` branch is considered to be a stable branch and should always work. Unfinished features should never be merged there!

## Release Workflow

1. **Pre-release tasks**
    * [ ] Create a release issue from this template
    * [ ] List features / PRs that go into this release (below this check)
        * [Github issue number]
    * [ ] Confirm that the required features and fixes are implemented on the `master` branch.

1. **Create a `release-v[x.y.Z]` branch:**
    * [ ] Create branch from the previous release
    * [ ] (optional) Cherry-pick all fixes from `master` that are going into this release and resolve any conflicts.
    * [ ] Run `npm run lint`, `npm run build`, and `npm run test` to ensure that build is successful.
    * [ ] Ensure that everything works as expected and that no code is broken from the cherry-picked commits.
    * [ ] (optional) Create `release-fix` commits, which may solve some issues spawning from the cherry-picked commits.
        * [ ] (optional) Recreate npm-shrinkwrap.json file with `npm shrinkwrap` if the `package.json` file was changed.
        * [ ] (optional) Push any changes to dist directories if needed.

1. **Set the patch version**
    * [ ] Set the patch version in `package.json`, re-run `npm shrinkwrap` and commit the change

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
        git tag -a v[x.y.Z] -m "Release [x.y.Z]"
        git push origin v[x.y.Z]
        ```
        * Optionally: If something goes bad during the CI run, you can revert the release by deleting the tag and pushing the change:
            ```bash
            git tag -d v[x.y.Z]
            git push origin --delete v[x.y.Z]
            ```
    * [ ] Wait for CI to finish the release process

1. **Publish the NPM package**
    * [ ] Publish the package to NPM with `npm publish`
    * [ ] Wait for the package to be published and verify that it is available on NPM

1. **Post-release cleanup**
    * [ ] Create a branch `release-v[x.y.Z]-merge` that merges changes back into `master` branch using `ours` strategy
    * [ ] Cherry pick specific commits from the release branch, if there are any, like changelog, changes to issue templates or similar.
    * [ ] Update changelog by adding `[unreleased]` section and all of the commits that were not included in the patch release.

1. **Post-release Version increment**
    * [ ] Update the version to the next minor release version
    * [ ] Update shrinkwrap file with `npm shrinkwrap`.
    * [ ] Run the `npm run build` and commit any changes to `dist/` directories if there are any.
    * [ ] Commit the changes

1. **Merge-back PR**
    * [ ] Create a PR that merges changes from `release-v[x.y.Z]` back into `master` branch.
        * Use this template for the PR: `release: Merge back [x.y.Z] into master`
            ```markdown
            ## Description
            This PR merges release branch `v[x.y.Z]` into `master`.

            ## How to test
            Nothing to test in this step. Everything was already tested before the tag was pushed.

            ## Code review checklist
            Please check everything that applies for this PR.
            ```

