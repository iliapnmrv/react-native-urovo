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

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

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

Releases are built and published by the [Release workflow](https://github.com/iliapnmrv/react-native-urovo/actions/workflows/release.yml). CI calculates versions from the last stable npm release and Conventional Commits. You do not need to edit `package.json` or choose a beta branch in repository settings.

To start a release:

1. Develop in one branch with any name, for example `feature/output-mode`, `fix/scanner`, or `scanner-experiment`. Pushes run the full CI checks without publishing.
2. Open a PR into `main` manually. Use a Conventional Commit title describing the whole change. A draft PR runs checks; mark it ready when you want a beta.
3. After lint, type checking, unit tests, release automation tests, the library build, and both Android architecture builds pass, a ready PR from this repository publishes a beta. Opening or reopening a ready PR, updating its title, and subsequent pushes trigger this flow. PRs from forks run checks without publishing.
4. Install and test the published beta in a consuming app, including on Urovo hardware:

```sh
yarn add react-native-urovo@beta
```

5. Merge the PR into `main` when it is ready. Prefer **Squash and merge** with the PR title. After checks pass on the merged commit, CI publishes a stable version under `latest` and creates a GitHub release.

The PR title selects the release type:

| PR title                                                             | Version change | Example from stable `1.1.0` |
| -------------------------------------------------------------------- | -------------- | --------------------------- |
| `fix: scanner crash`                                                 | patch          | `1.1.1-beta.1` → `1.1.1`    |
| `perf: faster scanning`                                              | patch          | `1.1.1-beta.1` → `1.1.1`    |
| `feat: add output mode`                                              | minor          | `1.2.0-beta.1` → `1.2.0`    |
| `feat!: replace scanner API`                                         | major          | `2.0.0-beta.1` → `2.0.0`    |
| `docs: update README`, `ci: update Actions`, `chore: update tooling` | none           | checks only                 |

The target is bumped once from npm's `latest`; each push increments only `beta.N`. Existing beta numbers are read from npm and Git tags, so a feature PR currently continues the `1.2.0-beta.5` series with `1.2.0-beta.6`. Non-release PR titles skip publishing even if their individual commits use `feat:` or `fix:`. Invalid PR titles fail a CI check.

Stable releases analyze changes since the previous stable tag. Merged PR titles determine their release type; direct commits on `main` use their Conventional Commit messages. The largest change wins: major, then minor, then patch. Unreleased changes already on `main` are included in beta targets too. In this repository, existing main changes already require `1.2.0`, even though npm `latest` is still `1.1.0`. Pushes with no release changes skip publication.

Versions and `gitHead` are written only to the CI checkout and packed artifact; no version commit is pushed back. The committed `package.json` version is not the source of release numbering. Update branches from `main` when another PR has released: a later merge can change the next target version. The shared npm `beta` tag points to the most recently published beta from any PR; install an exact version from the workflow summary when testing concurrent PRs.

Publication runs are queued across the whole package, keeping version allocation and publishing together. The workflow retains npm Trusted Publishing through `release.yml` and the GitHub `npm` environment; no npm token is required. If deployment restrictions are added later, allow `main` and same-repository PRs. Immediately before publishing, the workflow rechecks the PR state, title, and head commit. Closed, draft, and superseded PR runs cannot publish their old artifacts.

For a build preview, run the Release workflow manually on a branch with an open ready PR, with **Publish after all checks pass** unchecked. It uploads an `npm-package-<run-id>` artifact containing the tarball and release plan without publishing or reserving a beta number. A manual run on `main` previews the next stable release. Enable publishing for a manual release or recovery run.

If npm publishing succeeds but GitHub release creation fails, rerun the failed publish job. It checks the version's recorded commit and existing GitHub tag, skips the npm upload, and finishes the GitHub release. Rerunning the whole workflow for the same commit also reuses its existing version. A version or tag associated with different code will not be overwritten, and retries do not move npm distribution tags backwards.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn test:release`: verify version allocation, package artifacts, and publication recovery without publishing anything.
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
