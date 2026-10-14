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
import { planRelease, prepareRelease, publishRelease } from './release.mjs';

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const registry = {
  'versions': {
    '1.1.0': {},
    '1.2.0-beta.0': {},
    '1.2.0-beta.5': {},
    '1.2.0-beta.10': {},
    '1.3.0-alpha.20': {},
  },
  'dist-tags': { latest: '1.1.0', beta: '1.2.0-beta.10' },
};
const options = {
  name: 'react-native-urovo',
  version: '1.2.0',
  ref: 'refs/heads/release/1.2.0',
  sha,
  registry,
};

test('beta counters use the largest published or tagged number, not lexical order', () => {
  assert.equal(planRelease(options).version, '1.2.0-beta.11');
  assert.equal(
    planRelease({ ...options, tags: { '1.2.0-beta.15': otherSha } }).version,
    '1.2.0-beta.16'
  );
  assert.equal(
    planRelease({
      ...options,
      version: '1.3.0',
      ref: 'refs/heads/release/1.3.0',
    }).version,
    '1.3.0-beta.1'
  );
});

test('a retry reuses the version published from the same commit', () => {
  const result = planRelease({
    ...options,
    registry: {
      ...registry,
      versions: { ...registry.versions, '1.2.0-beta.5': { gitHead: sha } },
    },
  });
  assert.equal(result.version, '1.2.0-beta.5');
  assert.equal(result.action, 'recover');
  assert.equal(result.distTag, 'beta');
});

test('legacy releases can be identified by their tag, but conflicting gitHead wins', () => {
  const tags = { '1.2.0-beta.5': sha };
  assert.equal(planRelease({ ...options, tags }).action, 'recover');
  assert.equal(
    planRelease({
      ...options,
      tags,
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

test('main publishes the exact stable target and leaves ordinary subsequent pushes alone', () => {
  const main = { ...options, ref: 'refs/heads/main' };
  assert.deepEqual(
    [planRelease(main).version, planRelease(main).distTag],
    ['1.2.0', 'latest']
  );
  const published = {
    ...registry,
    versions: { ...registry.versions, '1.2.0': { gitHead: otherSha } },
  };
  assert.equal(planRelease({ ...main, registry: published }).action, 'skip');
  assert.equal(
    planRelease({ ...main, registry: published, sha: otherSha }).action,
    'recover'
  );
  assert.equal(planRelease({ ...options, registry: published }).action, 'skip');
  assert.equal(
    planRelease({ ...main, version: '1.2.0-beta.5' }).action,
    'skip'
  );
});

test('invalid branches, prerelease targets, and channel downgrades are rejected', () => {
  for (const change of [
    { ref: 'refs/heads/feature/scanner' },
    { ref: 'refs/tags/v1.2.0' },
    { ref: 'refs/heads/release/1.3.0' },
    { version: '1.2.0-beta.5' },
    { version: '1.02.0' },
    { sha: 'short-sha' },
    { version: '1.0.0', ref: 'refs/heads/release/1.0.0' },
    {
      registry: {
        ...registry,
        'dist-tags': { ...registry['dist-tags'], beta: '1.3.0-beta.1' },
      },
    },
  ]) {
    assert.throws(() => planRelease({ ...options, ...change }));
  }
});

function fixture(t, ref = options.ref) {
  const cwd = mkdtempSync(join(tmpdir(), 'urovo-release-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const pkg = {
    name: options.name,
    version: options.version,
    files: ['index.js'],
  };
  const original = JSON.stringify(pkg, null, 2) + '\n';
  writeFileSync(join(cwd, 'package.json'), original);
  writeFileSync(join(cwd, 'index.js'), 'module.exports = {};\n');
  git('init', '--quiet');
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
    'fixture'
  );
  const env = {
    GITHUB_SHA: git('rev-parse', 'HEAD'),
    GITHUB_REF: ref,
    GITHUB_REPOSITORY: 'iliapnmrv/react-native-urovo',
    GITHUB_OUTPUT: join(cwd, 'outputs'),
  };
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
  return { cwd, env, git, resetManifest, pack };
}

test('prepare → npm pack → publish uses the generated beta manifest, then retries without republishing', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease({
    ...f,
    loadRegistry: async () => registry,
  });
  assert.equal(plan.version, '1.2.0-beta.11');
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
  assert.equal(packed.gitHead, f.env.GITHUB_SHA);
  // The publish job gets a fresh checkout and the same artifact.
  f.resetManifest();
  const commands = [];
  const dependencies = {
    ...f,
    loadRegistry: async () => registry,
    checkTag: async () => false,
    getRelease: async () => undefined,
    run: (command, args) => commands.push([command, args]),
  };
  await publishRelease(dependencies);
  assert.deepEqual(
    commands.map(([command]) => command),
    ['npm', 'gh']
  );
  assert.ok(commands[0][1].includes('beta'));
  assert.ok(commands[1][1].includes('--prerelease'));
  assert.ok(commands[1][1].includes(f.env.GITHUB_SHA));

  const published = {
    ...registry,
    versions: {
      ...registry.versions,
      [plan.version]: { gitHead: f.env.GITHUB_SHA },
    },
  };
  commands.length = 0;
  await publishRelease({
    ...dependencies,
    loadRegistry: async () => published,
  });
  assert.deepEqual(
    commands.map(([command]) => command),
    ['gh']
  );
  commands.length = 0;
  await publishRelease({
    ...dependencies,
    loadRegistry: async () => published,
    getRelease: async () => ({ tag_name: `v${plan.version}` }),
  });
  assert.equal(commands.length, 0);
});

test('stable artifacts keep the exact target and publish to latest', async (t) => {
  const f = fixture(t, 'refs/heads/main');
  const plan = await prepareRelease({
    ...f,
    loadRegistry: async () => registry,
  });
  assert.equal(plan.version, '1.2.0');
  f.pack();
  f.resetManifest();
  const commands = [];
  await publishRelease({
    ...f,
    loadRegistry: async () => registry,
    checkTag: async () => false,
    getRelease: async () => undefined,
    run: (command, args) => commands.push([command, args]),
  });
  assert.ok(commands[0][1].includes('latest'));
  assert.ok(!commands[1][1].includes('--prerelease'));
});

test('a version reserved by a Git tag can be published and tagged beta counters stay consistent', async (t) => {
  const f = fixture(t);
  f.git('tag', 'v1.2.0-beta.15');
  const plan = await prepareRelease({
    ...f,
    loadRegistry: async () => registry,
  });
  assert.equal(plan.version, '1.2.0-beta.15');
  f.pack();
  f.resetManifest();
  const commands = [];
  await publishRelease({
    ...f,
    loadRegistry: async () => registry,
    checkTag: async () => true,
    getRelease: async () => undefined,
    run: (command, args) => commands.push([command, args]),
  });
  assert.equal(commands[0][0], 'npm');
});

test('a stale plan or a mismatched tarball never reaches npm publish', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease({
    ...f,
    loadRegistry: async () => registry,
  });
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
  const dependencies = {
    ...f,
    loadRegistry: async () => registry,
    checkTag: async () => false,
    getRelease: async () => undefined,
    run: () => assert.fail('Must not publish'),
  };
  await assert.rejects(
    publishRelease(dependencies),
    /Packed package does not match/
  );
  await assert.rejects(
    publishRelease({
      ...dependencies,
      loadRegistry: async () => ({
        ...registry,
        versions: {
          ...registry.versions,
          [plan.version]: { gitHead: otherSha },
        },
      }),
    }),
    /Release plan is no longer current/
  );
});

test('skipped releases leave package.json unchanged and produce no artifact', async (t) => {
  const f = fixture(t, 'refs/heads/main');
  const before = readFileSync(join(f.cwd, 'package.json'), 'utf8');
  const result = await prepareRelease({
    ...f,
    loadRegistry: async () => ({
      ...registry,
      versions: { ...registry.versions, '1.2.0': {} },
    }),
  });
  assert.equal(result.action, 'skip');
  assert.equal(readFileSync(join(f.cwd, 'package.json'), 'utf8'), before);
  assert.equal(existsSync(join(f.cwd, '.release')), false);
});

test('GitHub tags are verified through annotated tags before any npm upload', async (t) => {
  const f = fixture(t);
  const plan = await prepareRelease({
    ...f,
    loadRegistry: async () => registry,
  });
  f.pack();
  f.resetManifest();
  const annotatedSha = 'c'.repeat(40);
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith(`git/ref/tags/v${plan.version}`)) {
      return new Response(
        JSON.stringify({ object: { type: 'tag', sha: annotatedSha } })
      );
    }
    if (url.endsWith(`git/tags/${annotatedSha}`)) {
      return new Response(
        JSON.stringify({ object: { type: 'commit', sha: otherSha } })
      );
    }
    assert.fail(`Unexpected request ${url}`);
  });
  await assert.rejects(
    publishRelease({
      ...f,
      loadRegistry: async () => registry,
      run: () => assert.fail('Must not publish with a conflicting GitHub tag'),
    }),
    /belongs to another commit/
  );
});
