import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const reportPath = resolve(process.argv[2] ?? 'coverage/coverage-summary.json');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const thresholds = JSON.parse(readFileSync('package.json', 'utf8')).jest
  .coverageThreshold.global;
const metrics = ['lines', 'statements', 'functions', 'branches'];
if (!report.total?.lines?.total) {
  throw new Error('No code coverage data was generated');
}

function percentage(metric) {
  const value =
    metric.pct === 'Unknown' && metric.total === 0 ? 100 : metric.pct;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error('Invalid coverage percentage');
  }
  return value;
}

const rows = metrics.map((metric) => {
  const value = percentage(report.total[metric]);
  const minimum = thresholds[metric];
  return `| ${metric} | ${value}% | ${minimum}% | ${value >= minimum ? 'Pass' : 'Below threshold'} |`;
});
const fileRows = Object.entries(report)
  .filter(([file]) => file !== 'total')
  .map(([file, coverage]) => {
    const path = relative(process.cwd(), file)
      .replaceAll('\\', '/')
      .replaceAll('|', '\\|');
    return `| ${path} | ${metrics.map((metric) => `${percentage(coverage[metric])}%`).join(' | ')} |`;
  });
const summary = [
  '## Test coverage',
  '',
  '| Metric | Coverage | Required | Result |',
  '| --- | ---: | ---: | --- |',
  ...rows,
  '',
  '| File | Lines | Statements | Functions | Branches |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...fileRows,
  '',
  'Download the coverage artifact from this run and open `lcov-report/index.html` to inspect uncovered code.',
  '',
].join('\n');
writeFileSync(resolve(reportPath, '../summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

const value = percentage(report.total.lines);
const color = value >= thresholds.lines ? '#4c1' : '#e05d44';
const label = `${value}%`;
const rightWidth = label.length * 7 + 14;
const width = 44 + rightWidth;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="line coverage: ${label}">
  <title>line coverage: ${label}</title>
  <rect width="44" height="20" fill="#555"/>
  <rect x="44" width="${rightWidth}" height="20" fill="${color}"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="22" y="14">lines</text>
    <text x="${44 + rightWidth / 2}" y="14">${label}</text>
  </g>
</svg>\n`;
writeFileSync(resolve(reportPath, '../coverage.svg'), svg);
writeFileSync(
  resolve(reportPath, '../metrics.json'),
  JSON.stringify(
    { commit: process.env.GITHUB_SHA ?? null, coverage: report.total },
    null,
    2
  ) + '\n'
);
console.log(summary);
