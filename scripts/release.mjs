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

export function planRelease({ name, version, ref, sha, registry, tags = {} }) {
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new Error('Expected a full commit SHA');
  const isMain = ref === 'refs/heads/main';
  const branchTarget = ref.startsWith('refs/heads/release/')
    ? ref.slice('refs/heads/release/'.length)
    : undefined;
  if (!isMain && !branchTarget) {
    throw new Error('Releases require main or a release/<version> branch');
  }

  const target = version.split('-')[0];
  stableParts(target);
  const plan = { name, target, sha, distTag: isMain ? 'latest' : 'beta' };
  const skip = (reason) => ({ ...plan, action: 'skip', reason });
  if (isMain && version !== target) {
    return skip(
      'Set a stable target version on a release branch before merging'
    );
  }
  if (version !== target || (!isMain && branchTarget !== target)) {
    throw new Error(
      'The release branch and package.json must use the same stable target version'
    );
  }

  const versions = registry.versions ?? {};
  if (versions[target]) {
    if (isMain && sameCommit(versions[target], tags[target], sha)) {
      return { ...plan, version: target, action: 'recover' };
    }
    return skip(`${target} has already been published as stable`);
  }
  const latest = registry['dist-tags']?.latest;
  if (latest && compareStable(target, latest.split('-')[0]) <= 0) {
    throw new Error(`Target ${target} must be newer than latest ${latest}`);
  }

  if (isMain) {
    if (tags[target] && tags[target] !== sha) {
      throw new Error(`Tag v${target} belongs to another commit`);
    }
    return { ...plan, version: target, action: 'publish' };
  }

  const betaTag = registry['dist-tags']?.beta;
  if (betaTag && compareStable(target, betaTag.split('-')[0]) < 0) {
    throw new Error(`A newer beta line ${betaTag} is already active`);
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

export async function prepareRelease({
  cwd = process.cwd(),
  env = process.env,
  loadRegistry = readRegistry,
} = {}) {
  verifyCheckout(cwd, env.GITHUB_SHA);
  const packagePath = join(cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const plan = planRelease({
    name: pkg.name,
    version: pkg.version,
    ref: env.GITHUB_REF,
    sha: env.GITHUB_SHA,
    registry: await loadRegistry(pkg.name),
    tags: readTags(cwd),
  });
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
  verifyCheckout(cwd, env.GITHUB_SHA);
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  const expectedTag = env.GITHUB_REF === 'refs/heads/main' ? 'latest' : 'beta';
  if (
    plan.sha !== env.GITHUB_SHA ||
    plan.name !== pkg.name ||
    plan.distTag !== expectedTag ||
    !['publish', 'recover'].includes(plan.action)
  ) {
    throw new Error('Release artifact does not match this workflow');
  }
  const registry = await loadRegistry(plan.name);
  const tagExists = await checkTag(plan, env);
  const expected = planRelease({
    name: pkg.name,
    version: pkg.version,
    ref: env.GITHUB_REF,
    sha: plan.sha,
    registry,
    tags: {
      ...readTags(cwd),
      ...(tagExists ? { [plan.version]: plan.sha } : {}),
    },
  });
  if (expected.action === 'skip' || expected.version !== plan.version) {
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
  else throw new Error('Usage: node scripts/release.mjs <prepare|publish>');
}
