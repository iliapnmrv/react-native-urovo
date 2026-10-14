import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const registryUrl = 'https://registry.npmjs.org';
const stablePattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function stableParts(version) {
  const parts = stablePattern.exec(version)?.slice(1).map(Number);
  if (!parts || !parts.every(Number.isSafeInteger)) {
    throw new Error(`Expected a stable target version, received ${version}`);
  }
  return parts;
}

function compareStable(left, right) {
  const a = stableParts(left);
  const b = stableParts(right);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

function betaNumber(version, target) {
  const prefix = `${target}-beta.`;
  if (!version.startsWith(prefix)) return undefined;
  const suffix = version.slice(prefix.length);
  if (!/^(0|[1-9]\d*)$/.test(suffix)) return undefined;
  const number = Number(suffix);
  if (!Number.isSafeInteger(number))
    throw new Error('Beta counter is too large');
  return number;
}

function sameCommit(metadata, tagCommit, sha) {
  return metadata?.gitHead === sha || (!metadata?.gitHead && tagCommit === sha);
}

const commitPattern =
  /^(feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert)(?:\([^\r\n()]+\))?(!)?: [^\r\n]+/;
const releaseRanks = { patch: 1, minor: 2, major: 3 };

export function releaseType(messages) {
  let result;
  for (const message of messages) {
    const match = commitPattern.exec(message);
    if (!match) continue;
    const type =
      match[2] || /^BREAKING[ -]CHANGE: /m.test(message)
        ? 'major'
        : match[1] === 'feat'
          ? 'minor'
          : ['fix', 'perf', 'revert'].includes(match[1])
            ? 'patch'
            : undefined;
    if ((releaseRanks[type] ?? 0) > (releaseRanks[result] ?? 0)) result = type;
  }
  return result;
}

export function validateTitle(title) {
  if (
    typeof title !== 'string' ||
    /[\r\n]/.test(title) ||
    !commitPattern.test(title)
  ) {
    throw new Error(
      'PR title must use Conventional Commits, e.g. feat: add output mode, fix: scanner crash, or feat!: change the API'
    );
  }
  return releaseType([title]);
}

function bumpVersion(version, type) {
  const [major, minor, patch] = stableParts(version);
  const next =
    type === 'major'
      ? `${major + 1}.0.0`
      : type === 'minor'
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`;
  stableParts(next);
  return next;
}

export function planRelease({
  name,
  sha,
  registry,
  mode,
  title,
  pullRequest,
  changes = [],
  tags = {},
}) {
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new Error('Expected a full commit SHA');
  if (!['beta', 'stable'].includes(mode))
    throw new Error('Expected beta or stable release mode');
  const isMain = mode === 'stable';
  const plan = {
    name,
    sha,
    mode,
    distTag: isMain ? 'latest' : 'beta',
    ...(isMain ? {} : { pullRequest, title }),
  };
  const skip = (reason) => ({ ...plan, action: 'skip', reason });
  if (!isMain) {
    if (!Number.isSafeInteger(pullRequest) || pullRequest < 1)
      throw new Error('Beta releases require an open pull request');
    if (!validateTitle(title)) return skip('PR has no release changes');
  }
  const versions = registry.versions ?? {};
  if (isMain) {
    const existing = Object.keys(versions).find(
      (version) =>
        stablePattern.test(version) &&
        sameCommit(versions[version], tags[version], sha)
    );
    if (existing) {
      return {
        ...plan,
        target: existing,
        version: existing,
        action: 'recover',
      };
    }
  }

  const baseline = registry['dist-tags']?.latest ?? '0.0.0';
  stableParts(baseline);
  const type = releaseType(isMain ? changes : [...changes, title]);
  if (!type) return skip('No release changes since the last stable release');
  const target = bumpVersion(baseline, type);
  Object.assign(plan, { target, baseline, type });
  if (versions[target]) {
    throw new Error(`Target ${target} is already published; check npm latest`);
  }

  if (isMain) {
    if (tags[target] && tags[target] !== sha) {
      throw new Error(`Tag v${target} belongs to another commit`);
    }
    return { ...plan, version: target, action: 'publish' };
  }

  const candidates = [
    ...new Set([...Object.keys(versions), ...Object.keys(tags)]),
  ]
    .filter((candidate) => betaNumber(candidate, target) !== undefined)
    .sort((a, b) => betaNumber(b, target) - betaNumber(a, target));
  const existing = candidates.find((candidate) =>
    sameCommit(versions[candidate], tags[candidate], sha)
  );
  if (existing) {
    return {
      ...plan,
      version: existing,
      action: versions[existing] ? 'recover' : 'publish',
    };
  }

  const next = (betaNumber(candidates[0] ?? '', target) ?? 0) + 1;
  if (!Number.isSafeInteger(next)) throw new Error('Beta counter is too large');
  return { ...plan, version: `${target}-beta.${next}`, action: 'publish' };
}

async function readRegistry(name) {
  const response = await fetch(`${registryUrl}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return { versions: {} };
  if (!response.ok) {
    throw new Error(`npm registry returned HTTP ${response.status}`);
  }
  const metadata = await response.json();
  if (metadata.name !== name || !metadata.versions) {
    throw new Error('Unexpected npm registry response');
  }
  return metadata;
}

function readTags(cwd) {
  const output = execFileSync(
    'git',
    [
      'for-each-ref',
      '--format=%(refname:strip=2) %(objectname) %(*objectname)',
      'refs/tags',
    ],
    { cwd, encoding: 'utf8' }
  );
  return Object.fromEntries(
    output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [tag, commit, peeled] = line.split(' ');
        return [tag.replace(/^v/, ''), peeled || commit];
      })
  );
}

function verifyCheckout(cwd, sha) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  if (head !== sha)
    throw new Error('Checkout does not match the release commit');
}

async function releaseContext(env) {
  const sha = env.RELEASE_SHA ?? env.GITHUB_SHA;
  const event = env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  let pull;
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    pull = event.pull_request;
    if (pull?.head.repo?.full_name !== env.GITHUB_REPOSITORY) {
      return { sha, reason: 'Fork PRs run checks without publishing' };
    }
    pull = await githubGet(`pulls/${pull.number}`, env);
  } else if (env.GITHUB_REF === 'refs/heads/main') {
    return { sha, mode: 'stable', baseSha: sha };
  } else if (
    env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_REF?.startsWith('refs/heads/')
  ) {
    const branch = env.GITHUB_REF.slice('refs/heads/'.length);
    const owner = env.GITHUB_REPOSITORY.split('/')[0];
    const query = new URLSearchParams({
      state: 'open',
      base: 'main',
      head: `${owner}:${branch}`,
    });
    const pulls = await githubGet(`pulls?${query}`, env);
    if (pulls?.length !== 1) {
      return { sha, reason: 'Open a PR into main before building a beta' };
    }
    pull = pulls[0];
  } else {
    return { sha, reason: 'Beta publishing starts when a PR is opened' };
  }

  if (
    !pull ||
    pull.state !== 'open' ||
    pull.base.ref !== 'main' ||
    pull.head.repo?.full_name !== env.GITHUB_REPOSITORY ||
    pull.draft
  ) {
    return { sha, reason: 'Beta requires an open, ready PR into main' };
  }
  if (pull.head.sha !== sha) {
    return { sha, reason: 'A newer commit is already in this PR' };
  }
  return {
    sha,
    mode: 'beta',
    title: pull.title,
    pullRequest: pull.number,
    baseSha: pull.base.sha,
  };
}

async function readChanges(cwd, context, registry, tags, env) {
  // A retry may refer to an older stable commit after a newer release exists.
  if (
    context.mode === 'stable' &&
    Object.entries(registry.versions ?? {}).some(
      ([version, metadata]) =>
        stablePattern.test(version) &&
        sameCommit(metadata, tags[version], context.sha)
    )
  ) {
    return [];
  }
  const latest = registry['dist-tags']?.latest;
  const baseline = latest
    ? (registry.versions?.[latest]?.gitHead ?? tags[latest])
    : undefined;
  if (latest && !/^[a-f0-9]{40}$/.test(baseline ?? '')) {
    throw new Error(`Cannot find the source commit for stable ${latest}`);
  }
  if (baseline) {
    try {
      execFileSync(
        'git',
        ['merge-base', '--is-ancestor', baseline, context.baseSha],
        {
          cwd,
          stdio: 'pipe',
        }
      );
      if (context.mode === 'beta') {
        execFileSync(
          'git',
          ['merge-base', '--is-ancestor', baseline, context.sha],
          {
            cwd,
            stdio: 'pipe',
          }
        );
      }
    } catch {
      throw new Error(`Checkout is behind stable ${latest}; update from main`);
    }
  }
  const output = execFileSync(
    'git',
    [
      'log',
      '--first-parent',
      '--reverse',
      '--format=%H%x00%B%x00',
      baseline ? `${baseline}..${context.baseSha}` : context.baseSha,
    ],
    { cwd, encoding: 'utf8' }
  );
  const fields = output.split('\0');
  const messages = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const commit = fields[i].trim();
    const pulls = await githubGet(`commits/${commit}/pulls`, env);
    const merged = pulls?.filter(
      (pull) => pull.merged_at && pull.base.ref === 'main'
    );
    const pull =
      merged?.find((candidate) => candidate.merge_commit_sha === commit) ??
      merged?.[0];
    messages.push(pull?.title ?? fields[i + 1]);
  }
  return messages;
}

async function currentPlan(cwd, env, pkg, loadRegistry, extraTags = {}) {
  const context = await releaseContext(env);
  const skip = (reason) => ({
    name: pkg.name,
    sha: context.sha,
    action: 'skip',
    reason,
  });
  if (context.reason) return skip(context.reason);
  if (context.mode === 'beta' && !validateTitle(context.title)) {
    return skip('PR has no release changes');
  }
  const registry = await loadRegistry(pkg.name);
  const tags = { ...readTags(cwd), ...extraTags };
  const changes = await readChanges(cwd, context, registry, tags, env);
  return planRelease({ name: pkg.name, ...context, registry, tags, changes });
}

export async function prepareRelease({
  cwd = process.cwd(),
  env = process.env,
  loadRegistry = readRegistry,
} = {}) {
  verifyCheckout(cwd, env.RELEASE_SHA ?? env.GITHUB_SHA);
  const packagePath = join(cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const plan = await currentPlan(cwd, env, pkg, loadRegistry);
  if (plan.action !== 'skip') {
    mkdirSync(join(cwd, '.release'), { recursive: true });
    writeFileSync(
      join(cwd, '.release/plan.json'),
      JSON.stringify(plan, null, 2) + '\n'
    );
    if (plan.action === 'publish') {
      pkg.version = plan.version;
      pkg.gitHead = plan.sha;
      writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `action=${plan.action}\n`);
  }
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      plan.action === 'skip'
        ? `Release skipped: ${plan.reason}.\n`
        : `Release: **${plan.version}** → **${plan.distTag}** (${plan.action}).\n`
    );
  }
  console.log(JSON.stringify(plan));
  return plan;
}

async function githubGet(path, env) {
  const response = await fetch(
    `${env.GITHUB_API_URL ?? 'https://api.github.com'}/repos/${env.GITHUB_REPOSITORY}/${path}`,
    {
      headers: {
        Authorization: `Bearer ${env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  return response.json();
}

async function verifyTag(plan, env) {
  const ref = await githubGet(`git/ref/tags/v${plan.version}`, env);
  if (!ref) return false;
  let object = ref.object;
  while (object.type === 'tag') {
    object = (await githubGet(`git/tags/${object.sha}`, env)).object;
  }
  if (object.type !== 'commit' || object.sha !== plan.sha) {
    throw new Error(`Tag v${plan.version} belongs to another commit`);
  }
  return true;
}

function readArtifact(cwd, artifact) {
  return JSON.parse(
    execFileSync('tar', ['-xOf', join(cwd, artifact), 'package/package.json'], {
      encoding: 'utf8',
    })
  );
}

export async function publishRelease({
  cwd = process.cwd(),
  env = process.env,
  loadRegistry = readRegistry,
  checkTag = verifyTag,
  getRelease = (version) => githubGet(`releases/tags/v${version}`, env),
  run = (command, args) =>
    execFileSync(command, args, { cwd, stdio: 'inherit' }),
} = {}) {
  const plan = JSON.parse(
    readFileSync(join(cwd, '.release/plan.json'), 'utf8')
  );
  const sha = env.RELEASE_SHA ?? env.GITHUB_SHA;
  verifyCheckout(cwd, sha);
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  if (
    plan.sha !== sha ||
    plan.name !== pkg.name ||
    !['publish', 'recover'].includes(plan.action)
  ) {
    throw new Error('Release artifact does not match this workflow');
  }
  const registry = await loadRegistry(plan.name);
  const tagExists = await checkTag(plan, env);
  const expected = await currentPlan(cwd, env, pkg, async () => registry, {
    ...(tagExists ? { [plan.version]: plan.sha } : {}),
  });
  if (
    expected.action === 'skip' ||
    expected.version !== plan.version ||
    expected.distTag !== plan.distTag ||
    expected.pullRequest !== plan.pullRequest ||
    expected.title !== plan.title
  ) {
    throw new Error('Release plan is no longer current');
  }
  const published = registry.versions?.[plan.version];
  if (published) {
    if (!sameCommit(published, tagExists ? plan.sha : undefined, plan.sha)) {
      throw new Error('npm version belongs to another commit');
    }
    console.log(
      `${plan.version} is already on npm; checking its GitHub release`
    );
  } else {
    if (plan.action === 'recover') {
      throw new Error('The published version is missing from npm');
    }
    const artifacts = readdirSync(join(cwd, '.release')).filter((file) =>
      file.endsWith('.tgz')
    );
    if (artifacts.length !== 1) {
      throw new Error('Expected exactly one package artifact');
    }
    const artifact = join('.release', artifacts[0]);
    const packed = readArtifact(cwd, artifact);
    if (
      packed.name !== plan.name ||
      packed.version !== plan.version ||
      packed.gitHead !== plan.sha
    ) {
      throw new Error('Packed package does not match the release plan');
    }
    run('npm', [
      'publish',
      artifact,
      '--tag',
      plan.distTag,
      '--registry',
      registryUrl,
    ]);
  }
  if (!(await getRelease(plan.version))) {
    const args = [
      'release',
      'create',
      `v${plan.version}`,
      '--repo',
      env.GITHUB_REPOSITORY,
      '--target',
      plan.sha,
      '--title',
      `v${plan.version}`,
      '--generate-notes',
    ];
    if (plan.distTag === 'beta') args.push('--prerelease', '--latest=false');
    else if (
      registry['dist-tags']?.latest &&
      compareStable(plan.version, registry['dist-tags'].latest) < 0
    ) {
      args.push('--latest=false');
    }
    run('gh', args);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const command = process.argv[2];
  if (command === 'prepare') await prepareRelease();
  else if (command === 'publish') await publishRelease();
  else if (command === 'validate') {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
    );
    validateTitle(event.pull_request?.title);
  } else
    throw new Error(
      'Usage: node scripts/release.mjs <prepare|publish|validate>'
    );
}
