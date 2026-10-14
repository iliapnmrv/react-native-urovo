# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, use Yarn for dependency installation; npm is supported for running the release scripts below.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or XCode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/UrovoExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > react-native-urovo`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-urovo` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "UrovoExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typecheck
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Coverage reports

`yarn test:ci` enforces the Jest coverage thresholds in `package.json` and generates an HTML report in `coverage/lcov-report/index.html`, a JSON summary, and LCOV data. CI displays overall and per-file coverage in the workflow summary and uploads a `coverage-<run-id>` artifact, including when tests fail after producing coverage. Download that artifact from the Actions run and open `lcov-report/index.html` to inspect uncovered lines and branches. Reports are retained for 14 days.

The README badge shows **line coverage on `main`**. Successful test jobs on `main` update `coverage.svg` and `metrics.json` on the generated `coverage` branch using GitHub's built-in token. PRs and feature branches produce their own reports and leave the main badge alone. Coverage reporting requires no external account, service, or secret.

### Publishing to npm

Development happens in working branches. PRs and ordinary pushes run CI and never publish. Test changes in the example app on Urovo hardware, merge ready PRs into `main`, and release when you choose. Several merged changes can be included in one release.

Every successful library build uploads an `npm-package-<run-id>` artifact with a `.tgz` package. CI verifies its compiled entry points, declarations, native package files, version, and source commit. Download it to test installation in a separate app without publishing a beta. The example uses local source code, so checking the packed package also catches packaging problems. Artifacts are retained for 14 days.

Install development dependencies with Yarn, then run the npm release script from a clean, up-to-date `main`:

```sh
git switch main
git pull --ff-only
yarn install --immutable
npm run release -- patch
```

Choose the increment yourself:

```sh
npm run release -- patch  # 1.2.0 -> 1.2.1
npm run release -- minor  # 1.2.0 -> 1.3.0
npm run release -- major  # 1.2.0 -> 2.0.0
```

The command uses `release-it` to update the root `package.json`, create a `chore(release): v<version>` commit and an annotated `v<version>` tag, and push the branch and tags atomically. It requires an upstream branch and commits since the previous stable release. The npm command runs a script; dependency installation still uses Yarn. No local npm login or token is required.

Pushing the version tag starts the [Release workflow](https://github.com/iliapnmrv/react-native-urovo/actions/workflows/release.yml). After tests, lint, types, the library build, and both Android architecture builds pass, it publishes the exact tested tarball to npm using Trusted Publishing, then creates a GitHub release. Release notes list commits and their authors since the previous reachable stable tag, with links to the commits and full diff. Version-only release commits are omitted. Commit messages never select the version increment.

The committed package version is the source of numbering. Its current `1.2.0-beta.5` promotes to `1.2.0` with a stable `patch` or `minor` release; subsequent increments follow the examples above. Stable tags must point to a commit contained in `main`. Keep the npm trusted publisher configured for `release.yml` and the GitHub `npm` environment.

To preview the version and local changelog without committing, tagging, or pushing:

```sh
npm run release -- minor --dry-run
```

You can also run Release manually in GitHub Actions with an empty **tag** and **Publish the selected tag** unchecked. This runs checks and uploads the package artifact from the selected branch without changing its version or publishing.

Betas are optional and always manual. From a working branch with an upstream, start a beta for the chosen next version:

```sh
npm run release:beta -- minor  # 1.2.0 -> 1.3.0-beta.1
npm run release:beta           # next beta in the same series
```

The beta command commits its version and pushes its tag too. The workflow publishes it under npm `beta` and creates a GitHub prerelease. Test it with `yarn add react-native-urovo@beta`, then merge ready work into `main` and run the stable release command when ready. Beta tags are excluded when collecting stable release notes, so the stable release includes the complete change history.

If the command creates a local commit and tag but pushing fails, resolve the Git issue and push that same commit and tag; do not bump again just to retry the push. For example: `git push --atomic origin main v1.2.0`. If a publish job fails, rerun it, or run Release manually with the existing **tag** and publishing enabled. A retry verifies the tag and npm commit, skips an already completed npm upload, and finishes the GitHub release. Tags and published versions associated with other code are never overwritten.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn test:release`: verify the release command against local test remotes, package artifacts, release notes, and publication recovery without publishing anything.
- `npm run release -- patch|minor|major`: create and push a stable release tag from `main`.
- `npm run release:beta -- minor`: create and push an optional beta release tag from a working branch.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
