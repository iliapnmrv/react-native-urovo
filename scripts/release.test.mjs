import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  packPackage,
  planRelease,
  publishRelease,
  releaseNotes,
  verifyArtifact,
} from './release.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const releaseIt = join(project, 'node_modules/release-it/bin/release-it.js');
const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const registry = {
  'versions': { '1.1.0': {} },
  'dist-tags': { latest: '1.1.0' },
};
const options = {
  version: '1.1.1',
  tag: 'v1.1.1',
  sha,
  onMain: true,
  registry,
};

test('the version tag selects stable or beta without analyzing commits', () => {
  assert.equal(planRelease(options).distTag, 'latest');
  assert.equal(
    planRelease({
      ...options,
      version: '1.2.0-beta.6',
      tag: 'v1.2.0-beta.6',
      onMain: false,
    }).distTag,
    'beta'
  );
});

test('invalid tags, stable releases outside main, and version downgrades fail', () => {
  for (const change of [
    { tag: 'v1.1.2' },
    { version: '1.01.1', tag: 'v1.01.1' },
    { version: '1.2.0-alpha.1', tag: 'v1.2.0-alpha.1' },
    { sha: 'short' },
    { onMain: false },
    { version: '1.0.0', tag: 'v1.0.0' },
    { registry: { 'dist-tags': { latest: '1.2.0-beta.5' } } },
  ])
    assert.throws(() => planRelease({ ...options, ...change }));
});

test('published versions are recovered only from their original commit', () => {
  const published = {
    ...registry,
    versions: { ...registry.versions, '1.1.1': { gitHead: sha } },
  };
  assert.equal(
    planRelease({ ...options, registry: published }).action,
    'recover'
  );
  assert.throws(
    () => planRelease({ ...options, sha: otherSha, registry: published }),
    /another commit/
  );
});

function fixture(t, { version = '1.1.1', release = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'urovo-release-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const writePackage = (value) =>
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'urovo-release-test-fixture',
          version: value,
          files: ['index.js', 'index.d.ts'],
          main: './index.js',
          types: './index.d.ts',
          exports: { '.': { types: './index.d.ts', default: './index.js' } },
        },
        null,
        2
      ) + '\n'
    );
  const commit = (message, author = 'Release test') => {
    git('add', 'package.json', 'index.js', 'index.d.ts', '.release-it.json');
    git(
      '-c',
      `user.name=${author}`,
      '-c',
      'user.email=release@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      message
    );
    return git('rev-parse', 'HEAD');
  };
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'Release test');
  git('config', 'user.email', 'release@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  copyFileSync(
    join(project, '.release-it.json'),
    join(cwd, '.release-it.json')
  );
  writePackage('1.1.0');
  writeFileSync(join(cwd, 'index.js'), 'module.exports = {};\n');
  writeFileSync(
    join(cwd, 'index.d.ts'),
    'export declare const scanner: boolean;\n'
  );
  commit('chore: initial package');
  git('tag', 'v1.1.0');
  writeFileSync(join(cwd, 'index.js'), 'module.exports = { scanner: true };\n');
  const changeSha = commit('fix: scanner crash', 'Alice Contributor');
  if (release) {
    writePackage(version);
    commit(`chore(release): v${version}`);
    git('tag', `v${version}`);
  }
  const headSha = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', headSha);
  const env = {
    ...process.env,
    npm_config_cache: join(cwd, '.git', 'npm-cache'),
  };
  const pack = () => packPackage({ cwd, env });
  return {
    cwd,
    git,
    pack,
    headSha,
    changeSha,
    writePackage,
    commit,
    commandEnv: env,
    env: {
      RELEASE_TAG: `v${version}`,
      GITHUB_REPOSITORY: 'iliapnmrv/react-native-urovo',
    },
  };
}

const dependencies = (f, commands = []) => ({
  ...f,
  loadRegistry: async () => registry,
  checkTag: async () => {},
  getRelease: async () => undefined,
  run: (command, args) => commands.push([command, args]),
});

test('packing records the source commit and validates real tarball entry points', (t) => {
  const f = fixture(t);
  f.pack();
  const packed = verifyArtifact(f);
  assert.equal(packed.sha, f.headSha);
  assert.equal(packed.version, '1.1.1');
});

test('an Android-only package may declare an unused podspec glob', (t) => {
  const f = fixture(t);
  const path = join(f.cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.files.push('*.podspec');
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  f.commit('chore: use the standard native package file list');
  f.pack();
  assert.doesNotThrow(() => verifyArtifact(f));
});

test('missing declarations and a wrong source commit are rejected', (t) => {
  const f = fixture(t);
  rmSync(join(f.cwd, 'index.d.ts'));
  f.pack();
  assert.throws(() => verifyArtifact(f), /entry point is missing/);
  f.writePackage('1.1.2');
  assert.throws(() => verifyArtifact(f), /does not match/);
});

test('release notes include other contributors and omit version-only commits', (t) => {
  const f = fixture(t);
  const notes = releaseNotes({
    ...f,
    version: '1.1.1',
    sha: f.headSha,
    repository: f.env.GITHUB_REPOSITORY,
  });
  assert.match(notes, /fix: scanner crash/);
  assert.match(notes, /Alice Contributor/);
  assert.match(notes, new RegExp(f.changeSha));
  assert.ok(!notes.includes('chore(release)'));
  assert.ok(!notes.includes('initial package'));
  assert.match(notes, /compare\/v1\.1\.0\.\.\.v1\.1\.1/);
});

test('stable release notes include the complete beta cycle since the previous stable', (t) => {
  const f = fixture(t, { version: '1.2.0' });
  f.git('tag', 'v1.2.0-beta.5', f.changeSha);
  const notes = releaseNotes({
    ...f,
    version: '1.2.0',
    sha: f.headSha,
    repository: f.env.GITHUB_REPOSITORY,
  });
  assert.match(notes, /fix: scanner crash/);
  assert.match(notes, /compare\/v1\.1\.0\.\.\.v1\.2\.0/);
});

test('publish uses the tested tarball and a notes file, then recovers without republishing', async (t) => {
  const f = fixture(t);
  f.pack();
  const commands = [];
  await publishRelease(dependencies(f, commands));
  assert.deepEqual(
    commands.map(([command]) => command),
    ['npm', 'gh']
  );
  assert.ok(commands[0][1].includes('latest'));
  assert.ok(commands[1][1].includes('--verify-tag'));
  assert.ok(commands[1][1].includes('--notes-file'));
  assert.match(
    readFileSync(join(f.cwd, '.release/notes.md'), 'utf8'),
    /Alice Contributor/
  );
  const published = {
    ...registry,
    versions: { ...registry.versions, '1.1.1': { gitHead: f.headSha } },
  };
  commands.length = 0;
  await publishRelease({
    ...dependencies(f, commands),
    loadRegistry: async () => published,
  });
  assert.deepEqual(
    commands.map(([command]) => command),
    ['gh']
  );
  commands.length = 0;
  await publishRelease({
    ...dependencies(f, commands),
    loadRegistry: async () => published,
    getRelease: async () => ({ tag_name: 'v1.1.1' }),
  });
  assert.equal(commands.length, 0);
});

test('beta tags publish to beta and create a prerelease', async (t) => {
  const f = fixture(t, { version: '1.2.0-beta.6' });
  f.pack();
  const commands = [];
  await publishRelease(dependencies(f, commands));
  assert.ok(commands[0][1].includes('beta'));
  assert.ok(commands[1][1].includes('--prerelease'));
});

test('a mismatch between the tag, tarball, or npm commit never publishes', async (t) => {
  const f = fixture(t);
  f.pack();
  f.env.RELEASE_TAG = 'v1.1.0';
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      run: () => assert.fail('Must not publish'),
    }),
    /does not match/
  );
  f.env.RELEASE_TAG = 'v1.1.1';
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      loadRegistry: async () => ({
        versions: { '1.1.1': { gitHead: otherSha } },
      }),
      run: () => assert.fail('Must not publish'),
    }),
    /another commit/
  );
});

test('old stable recovery does not move GitHub latest backwards', async (t) => {
  const f = fixture(t);
  f.pack();
  const commands = [];
  await publishRelease({
    ...dependencies(f, commands),
    loadRegistry: async () => ({
      'versions': { '1.1.1': { gitHead: f.headSha } },
      'dist-tags': { latest: '1.2.0' },
    }),
  });
  assert.deepEqual(
    commands.map(([command]) => command),
    ['gh']
  );
  assert.ok(commands[0][1].includes('--latest=false'));
});

test('GitHub annotated tags are checked before uploading anything to npm', async (t) => {
  const f = fixture(t);
  f.pack();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/git/ref/tags/v1.1.1'))
      return new Response(JSON.stringify({ object: { type: 'tag', sha } }));
    if (url.endsWith(`/git/tags/${sha}`))
      return new Response(
        JSON.stringify({ object: { type: 'commit', sha: otherSha } })
      );
    assert.fail(`Unexpected request ${url}`);
  });
  await assert.rejects(
    publishRelease({
      ...f,
      loadRegistry: async () => registry,
      run: () => assert.fail('Must not publish'),
    }),
    /another commit/
  );
});

function localRemote(f) {
  const remote = join(f.cwd, '.git', 'test-remote.git');
  execFileSync('git', [
    'init',
    '--quiet',
    '--bare',
    '--initial-branch=main',
    remote,
  ]);
  f.git('remote', 'add', 'origin', remote);
  f.git('push', '--quiet', '--set-upstream', 'origin', 'main', '--tags');
  return remote;
}

test('the real release command bumps patch, commits, tags, and pushes to a local test remote', (t) => {
  const f = fixture(t, { release: false });
  const remote = localRemote(f);
  execFileSync(process.execPath, [releaseIt, 'patch', '--ci'], {
    cwd: f.cwd,
    env: f.commandEnv,
    stdio: 'pipe',
  });
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.1.1'
  );
  assert.equal(f.git('log', '-1', '--format=%s'), 'chore(release): v1.1.1');
  const head = f.git('rev-parse', 'HEAD');
  assert.equal(f.git('rev-parse', 'v1.1.1^{commit}'), head);
  assert.equal(
    execFileSync('git', ['--git-dir', remote, 'rev-parse', 'refs/heads/main'], {
      encoding: 'utf8',
    }).trim(),
    head
  );
  assert.equal(
    execFileSync('git', ['--git-dir', remote, 'rev-parse', 'v1.1.1^{commit}'], {
      encoding: 'utf8',
    }).trim(),
    head
  );
});

test('stable release command rejects a feature branch without changing the version', (t) => {
  const f = fixture(t, { release: false });
  localRemote(f);
  f.git('checkout', '--quiet', '-b', 'feature/test');
  assert.throws(() =>
    execFileSync(process.execPath, [releaseIt, 'minor', '--ci'], {
      cwd: f.cwd,
      env: f.commandEnv,
      stdio: 'pipe',
    })
  );
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.1.0'
  );
});

test('manual beta release command works in a feature branch and starts beta numbering at one', (t) => {
  const f = fixture(t, { release: false });
  localRemote(f);
  f.git('checkout', '--quiet', '-b', 'feature/test');
  f.git('push', '--quiet', '--set-upstream', 'origin', 'feature/test');
  execFileSync(
    process.execPath,
    [
      releaseIt,
      'minor',
      '--ci',
      '--preRelease=beta',
      '--preReleaseBase=1',
      '--no-git.requireBranch',
    ],
    { cwd: f.cwd, env: f.commandEnv, stdio: 'pipe' }
  );
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.2.0-beta.1'
  );
  execFileSync(
    process.execPath,
    [
      releaseIt,
      '--ci',
      '--preRelease=beta',
      '--preReleaseBase=1',
      '--no-git.requireBranch',
    ],
    { cwd: f.cwd, env: f.commandEnv, stdio: 'pipe' }
  );
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.2.0-beta.2'
  );
});

test('minor release is selected explicitly and beta promotion keeps the intended stable version', (t) => {
  const f = fixture(t, { release: false });
  localRemote(f);
  execFileSync(process.execPath, [releaseIt, 'minor', '--ci'], {
    cwd: f.cwd,
    env: f.commandEnv,
    stdio: 'pipe',
  });
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.2.0'
  );
  f.writePackage('1.3.0-beta.5');
  f.commit('feat: next feature');
  f.git('tag', 'v1.3.0-beta.5');
  execFileSync(process.execPath, [releaseIt, 'patch', '--ci'], {
    cwd: f.cwd,
    env: f.commandEnv,
    stdio: 'pipe',
  });
  assert.equal(
    JSON.parse(readFileSync(join(f.cwd, 'package.json'), 'utf8')).version,
    '1.3.0'
  );
});
