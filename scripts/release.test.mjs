import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  planRelease,
  prepareRelease,
  publishRelease,
  releaseType,
  validateTitle,
} from './release.mjs';

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const registry = {
  'versions': {
    '1.1.0': {},
    '1.2.0-beta.0': {},
    '1.2.0-beta.5': {},
    '1.2.0-beta.10': {},
  },
  'dist-tags': { latest: '1.1.0', beta: '1.2.0-beta.10' },
};
const options = {
  name: 'react-native-urovo',
  mode: 'beta',
  title: 'feat: add output mode',
  pullRequest: 7,
  sha,
  registry,
};

test('Conventional Commits determine patch, minor, major, or no release', () => {
  assert.equal(releaseType(['fix(scanner): recover connection']), 'patch');
  assert.equal(releaseType(['perf: reduce polling']), 'patch');
  assert.equal(releaseType(['feat: add output mode']), 'minor');
  assert.equal(releaseType(['fix!: change an incompatible API']), 'major');
  assert.equal(
    releaseType(['refactor: change API\n\nBREAKING CHANGE: removed argument']),
    'major'
  );
  assert.equal(
    releaseType(['docs: update README', 'ci: update Actions']),
    undefined
  );
  assert.equal(releaseType(['fix build', 'wip', 'v1.1.0']), undefined);
  assert.equal(
    releaseType(['fix: crash', 'feat: API', 'fix: timeout']),
    'minor'
  );
});

test('invalid PR titles fail, while non-release titles remain valid', () => {
  for (const title of [
    'Add a feature',
    'feature: scanner',
    'feat: ',
    'feat: x\nfix: y',
  ]) {
    assert.throws(() => validateTitle(title), /Conventional Commits/);
  }
  assert.equal(validateTitle('chore: upgrade tooling'), undefined);
  assert.equal(
    planRelease({ ...options, title: 'docs: clarify usage' }).action,
    'skip'
  );
});

test('PR versions are bumped once from latest stable, with only the beta counter increasing', () => {
  assert.equal(planRelease(options).version, '1.2.0-beta.11');
  assert.equal(
    planRelease({ ...options, title: 'fix: scanner crash' }).version,
    '1.1.1-beta.1'
  );
  assert.equal(
    planRelease({ ...options, title: 'feat!: replace API' }).version,
    '2.0.0-beta.1'
  );
  assert.equal(
    planRelease({ ...options, tags: { '1.2.0-beta.15': otherSha } }).version,
    '1.2.0-beta.16'
  );
});

test('unreleased main features and breaking changes are included in the PR target', () => {
  assert.equal(
    planRelease({
      ...options,
      title: 'fix: scanner crash',
      changes: ['feat: new API'],
    }).target,
    '1.2.0'
  );
  assert.equal(
    planRelease({ ...options, changes: ['feat!: remove old API'] }).target,
    '2.0.0'
  );
});

test('a retry reuses a beta from the same commit, including legacy tags', () => {
  const published = {
    ...registry,
    versions: { ...registry.versions, '1.2.0-beta.5': { gitHead: sha } },
  };
  assert.equal(
    planRelease({ ...options, registry: published }).version,
    '1.2.0-beta.5'
  );
  assert.equal(
    planRelease({ ...options, registry: published }).action,
    'recover'
  );
  assert.equal(
    planRelease({ ...options, tags: { '1.2.0-beta.5': sha } }).action,
    'recover'
  );
  assert.equal(
    planRelease({
      ...options,
      tags: { '1.2.0-beta.5': sha },
      registry: {
        ...registry,
        versions: {
          ...registry.versions,
          '1.2.0-beta.5': { gitHead: otherSha },
        },
      },
    }).version,
    '1.2.0-beta.11'
  );
});

test('stable releases use the highest change since the previous stable, and skip tooling-only pushes', () => {
  const stable = { ...options, mode: 'stable' };
  assert.equal(
    planRelease({ ...stable, changes: ['fix: crash'] }).version,
    '1.1.1'
  );
  assert.equal(
    planRelease({ ...stable, changes: ['fix: crash', 'feat: scanner'] })
      .version,
    '1.2.0'
  );
  assert.equal(
    planRelease({ ...stable, changes: ['feat!: scanner'] }).version,
    '2.0.0'
  );
  assert.equal(
    planRelease({ ...stable, changes: ['ci: checks'] }).action,
    'skip'
  );
  assert.equal(
    planRelease({ ...stable, changes: ['feat: scanner'] }).distTag,
    'latest'
  );
});

test('stable retries recover the original version even after a newer stable exists', () => {
  assert.equal(
    planRelease({
      ...options,
      mode: 'stable',
      registry: {
        'versions': {
          '1.2.0': { gitHead: sha },
          '1.3.0': { gitHead: otherSha },
        },
        'dist-tags': { latest: '1.3.0' },
      },
    }).version,
    '1.2.0'
  );
});

test('invalid release metadata and conflicting stable tags are rejected', () => {
  for (const change of [
    { sha: 'short' },
    { mode: 'preview' },
    { pullRequest: 0 },
    { registry: { 'dist-tags': { latest: '1.02.0' } } },
    { registry: { 'dist-tags': { latest: '1.2.0-beta.1' } } },
    { mode: 'stable', changes: ['feat: scanner'], tags: { '1.2.0': otherSha } },
    {
      mode: 'stable',
      changes: ['feat: scanner'],
      registry: {
        ...registry,
        versions: { ...registry.versions, '1.2.0': {} },
      },
    },
  ]) {
    assert.throws(() => planRelease({ ...options, ...change }));
  }
});

function fixture(t, mode = 'beta') {
  const cwd = mkdtempSync(join(tmpdir(), 'urovo-release-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const pkg = {
    name: options.name,
    version: '1.2.0-beta.5',
    files: ['index.js'],
  };
  const original = JSON.stringify(pkg, null, 2) + '\n';
  writeFileSync(join(cwd, 'package.json'), original);
  writeFileSync(join(cwd, 'index.js'), 'module.exports = {};\n');
  git('init', '--quiet');
  const commit = (message) => {
    git('add', 'package.json', 'index.js');
    git(
      '-c',
      'user.name=Release test',
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
  const baseSha = commit('chore: fixture');
  git('tag', 'v1.1.0');
  writeFileSync(join(cwd, 'index.js'), 'module.exports = { scanner: true };\n');
  const headSha = commit('feat: add scanner');
  const env = {
    GITHUB_SHA: mode === 'beta' ? 'c'.repeat(40) : headSha,
    RELEASE_SHA: headSha,
    GITHUB_REF: mode === 'beta' ? 'refs/pull/7/merge' : 'refs/heads/main',
    GITHUB_EVENT_NAME: mode === 'beta' ? 'pull_request' : 'push',
    GITHUB_REPOSITORY: 'iliapnmrv/react-native-urovo',
    GITHUB_EVENT_PATH: join(cwd, 'event.json'),
    GITHUB_OUTPUT: join(cwd, 'outputs'),
    GH_TOKEN: 'test-token',
  };
  const pull = {
    number: 7,
    title: options.title,
    state: 'open',
    draft: false,
    head: {
      sha: headSha,
      ref: 'any-branch-name',
      repo: { full_name: env.GITHUB_REPOSITORY },
    },
    base: { ref: 'main', sha: baseSha },
  };
  writeFileSync(
    join(cwd, 'event.json'),
    JSON.stringify({ action: 'opened', pull_request: pull })
  );
  const mergedPulls = {};
  const fetchGithub = async (url) => {
    if (url.endsWith('/pulls/7')) return new Response(JSON.stringify(pull));
    if (url.includes('/pulls?'))
      return new Response(JSON.stringify(pull.state === 'open' ? [pull] : []));
    const match = /\/commits\/([a-f0-9]{40})\/pulls$/.exec(url);
    if (match) return new Response(JSON.stringify(mergedPulls[match[1]] ?? []));
    assert.fail(`Unexpected request ${url}`);
  };
  t.mock.method(globalThis, 'fetch', fetchGithub);
  const resetManifest = () =>
    writeFileSync(join(cwd, 'package.json'), original);
  const pack = () =>
    execFileSync(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--pack-destination',
        '.release',
        '--cache',
        join(cwd, 'cache'),
      ],
      { cwd, stdio: 'pipe' }
    );
  return {
    cwd,
    env,
    git,
    pull,
    mergedPulls,
    fetchGithub,
    resetManifest,
    pack,
    baseSha,
    headSha,
  };
}

const dependencies = (f, commands = []) => ({
  ...f,
  loadRegistry: async () => registry,
  checkTag: async () => false,
  getRelease: async () => undefined,
  run: (command, args) => commands.push([command, args]),
});

test('prepare → pack → publish uses the PR head and automatic version, then recovers without another upload', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease(dependencies(f));
  assert.equal(plan.version, '1.2.0-beta.11');
  assert.equal(plan.sha, f.headSha);
  assert.equal(readFileSync(f.env.GITHUB_OUTPUT, 'utf8'), 'action=publish\n');
  f.pack();
  const artifact = readdirSync(join(f.cwd, '.release')).find((name) =>
    name.endsWith('.tgz')
  );
  const packed = JSON.parse(
    execFileSync(
      'tar',
      ['-xOf', join(f.cwd, '.release', artifact), 'package/package.json'],
      { encoding: 'utf8' }
    )
  );
  assert.equal(packed.version, plan.version);
  assert.equal(packed.gitHead, f.headSha);
  f.resetManifest();
  const commands = [];
  await publishRelease(dependencies(f, commands));
  assert.deepEqual(
    commands.map(([command]) => command),
    ['npm', 'gh']
  );
  assert.ok(commands[0][1].includes('beta'));
  assert.ok(commands[1][1].includes('--prerelease'));
  assert.ok(commands[1][1].includes(f.headSha));

  const published = {
    ...registry,
    versions: { ...registry.versions, [plan.version]: { gitHead: f.headSha } },
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
    getRelease: async () => ({ tag_name: `v${plan.version}` }),
  });
  assert.equal(commands.length, 0);
});

test('stable planning analyzes actual git history and publishes to latest', async (t) => {
  const f = fixture(t, 'stable');
  const plan = await prepareRelease(dependencies(f));
  assert.equal(plan.version, '1.2.0');
  f.pack();
  f.resetManifest();
  const commands = [];
  await publishRelease(dependencies(f, commands));
  assert.ok(commands[0][1].includes('latest'));
  assert.ok(!commands[1][1].includes('--prerelease'));
});

test('merged PR titles determine stable versions even when commit titles differ', async (t) => {
  const f = fixture(t, 'stable');
  f.mergedPulls[f.headSha] = [
    {
      title: 'fix: scanner crash',
      merged_at: '2026-10-14T00:00:00Z',
      merge_commit_sha: f.headSha,
      base: { ref: 'main' },
    },
  ];
  assert.equal((await prepareRelease(dependencies(f))).version, '1.1.1');
});

test('unreleased main changes are included before calculating a beta', async (t) => {
  const f = fixture(t);
  f.pull.base.sha = f.headSha;
  f.pull.title = 'fix: scanner timeout';
  assert.equal(
    (await prepareRelease(dependencies(f))).version,
    '1.2.0-beta.11'
  );
});

test('manual previews accept any branch name with an open PR', async (t) => {
  const f = fixture(t);
  f.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
  f.env.GITHUB_REF = 'refs/heads/scanner-experiment';
  assert.equal(
    (await prepareRelease(dependencies(f))).version,
    '1.2.0-beta.11'
  );
  f.pull.state = 'closed';
  assert.equal((await prepareRelease(dependencies(f))).action, 'skip');
});

test('pushes without PRs leave the manifest unchanged and never query npm', async (t) => {
  const f = fixture(t);
  f.env.GITHUB_EVENT_NAME = 'push';
  f.env.GITHUB_REF = 'refs/heads/fix/scanner';
  const before = readFileSync(join(f.cwd, 'package.json'), 'utf8');
  assert.equal(
    (
      await prepareRelease({
        ...f,
        loadRegistry: async () => assert.fail('Must not query npm'),
      })
    ).action,
    'skip'
  );
  assert.equal(readFileSync(join(f.cwd, 'package.json'), 'utf8'), before);
  assert.equal(existsSync(join(f.cwd, '.release')), false);
});

test('draft, closed, fork, retargeted, and superseded PRs never allocate versions', async (t) => {
  const f = fixture(t);
  for (const change of [
    () => {
      f.pull.draft = true;
    },
    () => {
      f.pull.draft = false;
      f.pull.state = 'closed';
    },
    () => {
      f.pull.state = 'open';
      f.pull.head.repo.full_name = 'someone/fork';
    },
    () => {
      f.pull.head.repo.full_name = f.env.GITHUB_REPOSITORY;
      f.pull.base.ref = 'develop';
    },
    () => {
      f.pull.base.ref = 'main';
      f.pull.head.sha = otherSha;
    },
  ]) {
    change();
    assert.equal(
      (
        await prepareRelease({
          ...f,
          loadRegistry: async () => assert.fail('Must not query npm'),
        })
      ).action,
      'skip'
    );
  }
  assert.equal(existsSync(join(f.cwd, '.release')), false);
});

test('tooling-only PRs skip publication without a registry request', async (t) => {
  const f = fixture(t);
  f.pull.title = 'ci: update workflow';
  assert.equal(
    (
      await prepareRelease({
        ...f,
        loadRegistry: async () => assert.fail('Must not query npm'),
      })
    ).action,
    'skip'
  );
  assert.equal(existsSync(join(f.cwd, '.release')), false);
});

test('closing or retitling a PR prevents its older artifact from publishing', async (t) => {
  const f = fixture(t);
  await prepareRelease(dependencies(f));
  f.pack();
  f.resetManifest();
  f.pull.state = 'closed';
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      run: () => assert.fail('Must not publish'),
    }),
    /no longer current/
  );
  f.pull.state = 'open';
  f.pull.title = 'fix: scanner crash';
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      run: () => assert.fail('Must not publish'),
    }),
    /no longer current/
  );
});

test('a conflicting npm version or mismatched tarball never reaches npm publish', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease(dependencies(f));
  writeFileSync(
    join(f.cwd, 'package.json'),
    JSON.stringify({
      name: options.name,
      version: plan.version,
      gitHead: otherSha,
      files: ['index.js'],
    })
  );
  f.pack();
  f.resetManifest();
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      run: () => assert.fail('Must not publish'),
    }),
    /Packed package does not match/
  );
  await assert.rejects(
    publishRelease({
      ...dependencies(f),
      loadRegistry: async () => ({
        ...registry,
        versions: {
          ...registry.versions,
          [plan.version]: { gitHead: otherSha },
        },
      }),
      run: () => assert.fail('Must not publish'),
    }),
    /no longer current/
  );
});

test('a version reserved by a Git tag stays consistent across prepare and publish', async (t) => {
  const f = fixture(t);
  f.git('tag', 'v1.2.0-beta.15');
  const plan = await prepareRelease(dependencies(f));
  assert.equal(plan.version, '1.2.0-beta.15');
  f.pack();
  f.resetManifest();
  const commands = [];
  await publishRelease({
    ...dependencies(f, commands),
    checkTag: async () => true,
  });
  assert.equal(commands[0][0], 'npm');
});

test('old stable recovery does not move the GitHub latest release backwards', async (t) => {
  const f = fixture(t, 'stable');
  await prepareRelease(dependencies(f));
  f.resetManifest();
  const commands = [];
  await publishRelease({
    ...dependencies(f, commands),
    loadRegistry: async () => ({
      'versions': {
        '1.2.0': { gitHead: f.headSha },
        '1.3.0': { gitHead: otherSha },
      },
      'dist-tags': { latest: '1.3.0' },
    }),
  });
  assert.deepEqual(
    commands.map(([command]) => command),
    ['gh']
  );
  assert.ok(commands[0][1].includes('--latest=false'));
});

test('a checkout behind the latest stable cannot publish another stable', async (t) => {
  const f = fixture(t, 'stable');
  await assert.rejects(
    prepareRelease({
      ...f,
      loadRegistry: async () => ({
        'versions': { '1.2.0': { gitHead: otherSha } },
        'dist-tags': { latest: '1.2.0' },
      }),
    }),
    /behind stable/
  );
});

test('a PR must contain the latest stable before publishing its next beta', async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.cwd, 'index.js'), 'module.exports = { scanner: 2 };\n');
  f.git('add', 'index.js');
  f.git(
    '-c',
    'user.name=Release test',
    '-c',
    'user.email=release@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'feat: another released feature'
  );
  const releasedSha = f.git('rev-parse', 'HEAD');
  f.git('checkout', '--quiet', f.headSha);
  f.pull.base.sha = releasedSha;
  await assert.rejects(
    prepareRelease({
      ...f,
      loadRegistry: async () => ({
        'versions': { '1.2.0': { gitHead: releasedSha } },
        'dist-tags': { latest: '1.2.0' },
      }),
    }),
    /behind stable 1.2.0/
  );
});

test('GitHub tags are verified through annotated tags before any npm upload', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease(dependencies(f));
  f.pack();
  f.resetManifest();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith(`git/ref/tags/v${plan.version}`))
      return new Response(
        JSON.stringify({ object: { type: 'tag', sha: 'd'.repeat(40) } })
      );
    if (url.includes('/git/tags/'))
      return new Response(
        JSON.stringify({ object: { type: 'commit', sha: otherSha } })
      );
    return f.fetchGithub(url);
  });
  await assert.rejects(
    publishRelease({
      ...f,
      loadRegistry: async () => registry,
      run: () => assert.fail('Must not publish with a conflicting tag'),
    }),
    /belongs to another commit/
  );
});
