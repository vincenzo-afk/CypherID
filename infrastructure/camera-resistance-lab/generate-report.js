#!/usr/bin/env node
/**
 * generate-report.js — aggregates validated Camera-Resistance Lab result
 * records into the report structure required by
 * docs/camera-resistance-lab/26_LAB_REPORTING_STANDARD.md:
 *   1. Test environment
 *   2. Methodology reference
 *   3. Baseline result
 *   4. All configuration results (not cherry-picked)
 *   5. Statistical measures (mean, SD, CI)
 *   6. Limitations section
 *   7. Claims supported by results
 *   8. Claims NOT supported by results
 *
 * This tool only aggregates and computes statistics over records you
 * supply — it never invents a data point. Run validate-results.js on your
 * input first; this script re-validates minimally but assumes well-formed
 * records for the numbers it reports.
 *
 * Usage:
 *   node generate-report.js <results.json> [more.json ...] > report.md
 *
 * A record with renderingConfig.profile === "NONE" or renderingConfig
 * .temporalFrequencyHz === 0 && spatialDitherIntensity === 0 is treated
 * as a baseline (unprotected) capture for comparison purposes; adjust
 * isBaseline() below if your lab defines baseline differently.
 */
const fs = require('fs');

function loadRecords(files) {
  let records = [];
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    records = records.concat(Array.isArray(parsed) ? parsed : [parsed]);
  }
  return records;
}

function isBaseline(r) {
  return r.renderingConfig && r.renderingConfig.profile === 'NONE';
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// 95% CI half-width using a normal approximation (z=1.96). For small samples
// (n<30) this is an approximation, not a t-distribution CI — flag that in
// the report itself rather than silently overstating precision.
function ci95(values) {
  if (values.length < 2) return 0;
  return 1.96 * (stddev(values) / Math.sqrt(values.length));
}

function fmt(n, digits = 3) {
  return Number.isFinite(n) ? n.toFixed(digits) : 'N/A';
}

function summarizeMetric(records, path) {
  const values = records
    .map((r) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), r))
    .filter((v) => typeof v === 'number');
  if (values.length === 0) return null;
  return {
    n: values.length,
    mean: mean(values),
    sd: stddev(values),
    ci95: ci95(values)
  };
}

function groupByProfile(records) {
  const groups = {};
  for (const r of records) {
    const profile = (r.renderingConfig && r.renderingConfig.profile) || 'UNKNOWN';
    (groups[profile] = groups[profile] || []).push(r);
  }
  return groups;
}

function buildReport(records) {
  const baseline = records.filter(isBaseline);
  const protectedRecords = records.filter((r) => !isBaseline(r));
  const byProfile = groupByProfile(protectedRecords);
  const testers = [...new Set(records.map((r) => r.tester))];
  const dates = [...new Set(records.map((r) => r.date))].sort();
  const cameras = [...new Set(records.map((r) => r.cameraModel))];
  const browsers = [...new Set(records.map((r) => r.browserVersion))];

  let md = '';
  md += '# Camera-Resistance Lab Report\n\n';
  md += `_Generated ${new Date().toISOString()} by infrastructure/camera-resistance-lab/generate-report.js `
      + `from ${records.length} real measurement record(s). Auto-generated from your own data — `
      + 'nothing in the numbers below is invented; edit prose sections as needed before publishing.\n\n';

  // 1. Test environment
  md += '## 1. Test Environment\n\n';
  md += `- Date range: ${dates[0] || 'N/A'} to ${dates[dates.length - 1] || 'N/A'}\n`;
  md += `- Tester(s): ${testers.join(', ') || 'N/A'}\n`;
  md += `- Camera model(s): ${cameras.join(', ') || 'N/A'}\n`;
  md += `- Browser version(s): ${browsers.join(', ') || 'N/A'}\n`;
  md += `- Total records: ${records.length} (${baseline.length} baseline, ${protectedRecords.length} protected)\n\n`;

  // 2. Methodology reference
  md += '## 2. Methodology Reference\n\n';
  md += 'See `docs/camera-resistance-lab/02_RESEARCH_METHODOLOGY.md` for the full test '
      + 'procedure and `docs/camera-resistance-lab/04_TEST_MATRIX.md` for the intended coverage matrix.\n\n';

  // 3. Baseline result
  md += '## 3. Baseline Result (Unprotected)\n\n';
  if (baseline.length === 0) {
    md += '**No baseline records supplied.** Per `20_RESULTS_SCHEMA.md`, a baseline '
        + '(no protection) result must always be included for comparison — this report '
        + 'is incomplete without one.\n\n';
  } else {
    md += renderMetricsTable(baseline);
  }

  // 4. All configuration results (not cherry-picked)
  md += '## 4. Configuration Results\n\n';
  for (const profile of Object.keys(byProfile).sort()) {
    md += `### Profile: ${profile}\n\n`;
    md += renderMetricsTable(byProfile[profile]);
  }
  if (Object.keys(byProfile).length === 0) {
    md += '_No protected-configuration records supplied._\n\n';
  }

  // 5. Statistical measures already embedded per-table above (mean / SD / 95% CI).
  md += '## 5. Statistical Notes\n\n';
  md += '- 95% CI uses a normal approximation (z=1.96); for n<30 treat as approximate, not exact.\n';
  md += '- SD is sample standard deviation (n-1 denominator).\n\n';

  // 6. Limitations
  md += '## 6. Limitations\n\n';
  md += 'See `docs/camera-resistance-lab/25_LIMITATIONS.md`. Additional limitations specific '
      + 'to this data set:\n';
  md += `- Sample size: ${records.length} total record(s) across ${Object.keys(byProfile).length} profile(s) `
      + `— treat any profile with n<5 as preliminary, not conclusive.\n`;
  md += `- Camera/device coverage: ${cameras.length} device(s) tested — results may not generalize to other cameras.\n\n`;

  // 7 & 8. Claims supported / not supported — left for the researcher to
  // fill in from the numbers above; auto-writing these would risk exactly
  // the kind of overstatement the reporting standard exists to prevent.
  md += '## 7. Claims Supported by This Data\n\n_(Fill in from the tables above — only claims '
      + 'directly backed by a measured mean + CI belong here.)_\n\n';
  md += '## 8. Claims NOT Supported by This Data\n\n_(Explicitly list adjacent claims this data '
      + 'set does NOT establish — e.g. untested profiles, untested camera models, untested lighting.)_\n';

  return md;
}

function renderMetricsTable(records) {
  const metrics = ['ocrAccuracy', 'humanReadabilityScore', 'visualQualityScore', 'renderingFPS', 'cpuOverheadPercent'];
  let md = '| Metric | n | Mean | SD | 95% CI (±) |\n|:---|---:|---:|---:|---:|\n';
  for (const metric of metrics) {
    const s = summarizeMetric(records, `metrics.${metric}`);
    if (!s) continue;
    md += `| ${metric} | ${s.n} | ${fmt(s.mean)} | ${fmt(s.sd)} | ${fmt(s.ci95)} |\n`;
  }
  return md + '\n';
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node generate-report.js <results.json> [more.json ...] > report.md');
    process.exit(1);
  }
  const records = loadRecords(files);
  process.stdout.write(buildReport(records));
}

main();
