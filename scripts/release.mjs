import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const registryUrl = 'https://registry.npmjs.org';
const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/;
const stablePattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function compareStable(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function isAncestor(cwd, ancestor, commit) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, commit], {
      cwd,
      stdio: 'pipe',
    });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

function artifact(cwd) {
  const files = readdirSync(join(cwd, '.release')).filter((file) =>
    file.endsWith('.tgz')
  );
  if (files.length !== 1)
    throw new Error('Expected exactly one package artifact');
  return join('.release', files[0]);
}

export function packPackage({ cwd = process.cwd(), env = process.env } = {}) {
  const path = join(cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.gitHead = git(cwd, ['rev-parse', 'HEAD']);
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  mkdirSync(join(cwd, '.release'), { recursive: true });
  execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--pack-destination', '.release'],
    { cwd, env, stdio: 'inherit' }
  );
}

export function verifyArtifact({ cwd = process.cwd() } = {}) {
  const file = artifact(cwd);
  const packed = JSON.parse(
    execFileSync('tar', ['-xOf', join(cwd, file), 'package/package.json'], {
      encoding: 'utf8',
    })
  );
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  const sha = git(cwd, ['rev-parse', 'HEAD']);
  if (
    packed.name !== pkg.name ||
    packed.version !== pkg.version ||
    packed.gitHead !== sha
  ) {
    throw new Error('Packed package does not match the checked-out commit');
  }
  const contents = new Set(
    execFileSync('tar', ['-tf', join(cwd, file)], { encoding: 'utf8' })
      .trim()
      .split('\n')
  );
  const paths = [];
  const collect = (value) => {
    if (typeof value === 'string' && value.startsWith('./'))
      paths.push(value.slice(2));
    else if (value && typeof value === 'object')
      Object.values(value).forEach(collect);
  };
  collect(pkg.exports);
  for (const value of [pkg.main, pkg.module, pkg.types]) {
    if (value) paths.push(value.replace(/^\.\//, ''));
  }
  for (const path of paths) {
    if (!contents.has(`package/${path}`))
      throw new Error(`Package entry point is missing: ${path}`);
  }
  for (const path of ['android/build.gradle', 'react-native.config.js']) {
    if (
      pkg.files?.includes(path.split('/')[0]) &&
      !contents.has(`package/${path}`)
    ) {
      throw new Error(`Native package file is missing: ${path}`);
    }
  }
  if (pkg.files?.includes('*.podspec')) {
    for (const file of readdirSync(cwd).filter((path) =>
      path.endsWith('.podspec')
    )) {
      if (!contents.has(`package/${file}`))
        throw new Error(`Package podspec is missing: ${file}`);
    }
  }
  return { file, name: pkg.name, version: pkg.version, sha };
}

export function planRelease({ version, tag, sha, onMain, registry }) {
  if (
    !versionPattern.test(version) ||
    tag !== `v${version}` ||
    !/^[a-f0-9]{40}$/.test(sha)
  ) {
    throw new Error(
      'Release requires a matching v<version> tag and full commit SHA'
    );
  }
  const beta = version.includes('-');
  if (!beta && !onMain)
    throw new Error('Stable release tags must point to a commit on main');
  const published = registry.versions?.[version];
  if (published?.gitHead && published.gitHead !== sha)
    throw new Error('npm version belongs to another commit');
  const latest = registry['dist-tags']?.latest;
  if (latest && !stablePattern.test(latest))
    throw new Error('npm latest must point to a stable version');
  if (
    !published &&
    latest &&
    compareStable(version.split('-')[0], latest) <= 0
  ) {
    throw new Error(
      `Release ${version} must be newer than npm latest ${latest}`
    );
  }
  return {
    version,
    tag,
    sha,
    distTag: beta ? 'beta' : 'latest',
    action: published ? 'recover' : 'publish',
  };
}

function escapeMarkdown(text) {
  return text.replace(/[\r\n]/g, ' ').replace(/[\\`*_\[\]<>]/g, '\\$&');
}

export function releaseNotes({
  cwd = process.cwd(),
  version,
  sha,
  repository,
}) {
  const target = version.split('-')[0];
  const previous = git(cwd, ['tag', '--list', 'v*'])
    .split('\n')
    .filter(
      (tag) =>
        stablePattern.test(tag.slice(1)) &&
        compareStable(tag.slice(1), target) < 0 &&
        isAncestor(cwd, tag, sha)
    )
    .sort((a, b) => compareStable(b.slice(1), a.slice(1)))[0];
  const output = execFileSync(
    'git',
    [
      'log',
      '--reverse',
      '--no-merges',
      '--format=%H%x00%s%x00%an%x00',
      previous ? `${previous}..${sha}` : sha,
    ],
    { cwd, encoding: 'utf8' }
  );
  const fields = output.split('\0');
  const changes = [];
  for (let i = 0; i + 2 < fields.length; i += 3) {
    const commit = fields[i].trim();
    const subject = fields[i + 1];
    if (/^chore\(release\): v/.test(subject)) continue;
    changes.push(
      `- ${escapeMarkdown(subject)} ([${commit.slice(0, 7)}](https://github.com/${repository}/commit/${commit})) — ${escapeMarkdown(fields[i + 2])}`
    );
  }
  if (previous)
    changes.push(
      `\n[Full diff](https://github.com/${repository}/compare/${previous}...v${version})`
    );
  return (
    (changes.length
      ? changes.join('\n')
      : 'No code changes since the previous stable release.') + '\n'
  );
}

async function readRegistry(name) {
  const response = await fetch(`${registryUrl}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return { versions: {} };
  if (!response.ok)
    throw new Error(`npm registry returned HTTP ${response.status}`);
  const metadata = await response.json();
  if (metadata.name !== name || !metadata.versions)
    throw new Error('Unexpected npm registry response');
  return metadata;
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
  const ref = await githubGet(`git/ref/tags/${plan.tag}`, env);
  if (!ref) throw new Error('Release tag is missing on GitHub');
  let object = ref.object;
  while (object.type === 'tag')
    object = (await githubGet(`git/tags/${object.sha}`, env)).object;
  if (object.type !== 'commit' || object.sha !== plan.sha)
    throw new Error('GitHub release tag points to another commit');
}

export async function publishRelease({
  cwd = process.cwd(),
  env = process.env,
  loadRegistry = readRegistry,
  checkTag = verifyTag,
  getRelease = (tag) => githubGet(`releases/tags/${tag}`, env),
  run = (command, args) =>
    execFileSync(command, args, { cwd, stdio: 'inherit' }),
} = {}) {
  const packed = verifyArtifact({ cwd });
  const tag = env.RELEASE_TAG;
  if (!tag || git(cwd, ['rev-parse', `${tag}^{commit}`]) !== packed.sha)
    throw new Error('Release tag does not match the tested package');
  const registry = await loadRegistry(packed.name);
  const plan = planRelease({
    ...packed,
    tag,
    onMain: isAncestor(cwd, packed.sha, 'refs/remotes/origin/main'),
    registry,
  });
  await checkTag(plan, env);
  const notes = releaseNotes({
    cwd,
    ...plan,
    repository: env.GITHUB_REPOSITORY,
  });
  mkdirSync(join(cwd, '.release'), { recursive: true });
  writeFileSync(join(cwd, '.release/notes.md'), notes);
  if (plan.action === 'publish') {
    run('npm', [
      'publish',
      packed.file,
      '--tag',
      plan.distTag,
      '--registry',
      registryUrl,
    ]);
  }
  if (!(await getRelease(plan.tag))) {
    const args = [
      'release',
      'create',
      plan.tag,
      '--repo',
      env.GITHUB_REPOSITORY,
      '--verify-tag',
      '--title',
      plan.tag,
      '--notes-file',
      '.release/notes.md',
    ];
    if (plan.distTag === 'beta') args.push('--prerelease', '--latest=false');
    else if (
      registry['dist-tags']?.latest &&
      compareStable(plan.version, registry['dist-tags'].latest) < 0
    )
      args.push('--latest=false');
    run('gh', args);
  }
  console.log(JSON.stringify(plan));
  return plan;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv[2] === 'pack') packPackage();
  else if (process.argv[2] === 'verify')
    console.log(JSON.stringify(verifyArtifact()));
  else if (process.argv[2] === 'publish') await publishRelease();
  else throw new Error('Usage: node scripts/release.mjs <pack|verify|publish>');
}
