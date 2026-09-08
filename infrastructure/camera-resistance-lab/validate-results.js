#!/usr/bin/env node
/**
 * validate-results.js — validates Camera-Resistance Lab test result
 * records against the schema in docs/camera-resistance-lab/20_RESULTS_SCHEMA.md.
 *
 * This does NOT generate results. Per that doc's "Fabrication Prohibition"
 * and docs/camera-resistance-lab/26_LAB_REPORTING_STANDARD.md, every record
 * must come from an actual physical test (real camera, real display, real
 * OCR run against the real capture) — this script only checks that a
 * researcher's real measurements are complete and well-formed before they
 * go into a report.
 *
 * Usage:
 *   node validate-results.js <results.json>
 *   node validate-results.js <results-dir>/*.json
 *
 * <results.json> is either a single test-result object or a JSON array
 * of them, matching the shape in 20_RESULTS_SCHEMA.md.
 *
 * Exit code 0 if every record is valid, 1 otherwise (prints all problems
 * found, across all input files, before exiting).
 */
const fs = require('fs');

const REQUIRED_FIELDS = [
  'testId', 'date', 'tester', 'renderingConfig', 'captureMethod',
  'cameraModel', 'cameraFrameRate', 'cameraExposure', 'displayRefreshRate',
  'distance_cm', 'angle_degrees', 'lighting_lux', 'browserVersion', 'metrics'
];

const REQUIRED_RENDERING_CONFIG_FIELDS = [
  'profile', 'temporalFrequencyHz', 'spatialDitherIntensity', 'rollingShutterEnabled'
];

const REQUIRED_METRIC_FIELDS = [
  'ocrAccuracy', 'humanReadabilityScore', 'visualQualityScore',
  'renderingFPS', 'cpuOverheadPercent'
];

// LOW/MEDIUM/HIGH/EXTREME are the only real protection profiles — docs/protection/profiles,
// mirrored in frontend/src/renderer/profiles.js. NEVER invent new protection profiles.
// "NONE" is accepted here as one addition: it denotes an unprotected baseline capture,
// which 20_RESULTS_SCHEMA.md requires every report to include for comparison but which
// has no representation in the four real profiles (see generate-report.js's isBaseline()).
const VALID_PROFILES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRecord(record, index) {
  const errors = [];
  const where = `record[${index}]${record && record.testId ? ` (${record.testId})` : ''}`;

  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return [`${where}: must be a JSON object`];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) errors.push(`${where}: missing required field "${field}"`);
  }

  if (record.date && !DATE_RE.test(record.date)) {
    errors.push(`${where}: "date" must be YYYY-MM-DD, got "${record.date}"`);
  }

  if (record.renderingConfig && typeof record.renderingConfig === 'object') {
    for (const field of REQUIRED_RENDERING_CONFIG_FIELDS) {
      if (!(field in record.renderingConfig)) {
        errors.push(`${where}: renderingConfig missing "${field}"`);
      }
    }
    if (record.renderingConfig.profile && !VALID_PROFILES.includes(record.renderingConfig.profile)) {
      errors.push(`${where}: renderingConfig.profile "${record.renderingConfig.profile}" is not one of ${VALID_PROFILES.join('/')}`);
    }
  }

  if (record.metrics && typeof record.metrics === 'object') {
    for (const field of REQUIRED_METRIC_FIELDS) {
      if (!(field in record.metrics)) errors.push(`${where}: metrics missing "${field}"`);
    }
    if (typeof record.metrics.ocrAccuracy === 'number'
        && (record.metrics.ocrAccuracy < 0 || record.metrics.ocrAccuracy > 1)) {
      errors.push(`${where}: metrics.ocrAccuracy must be a fraction in [0,1], got ${record.metrics.ocrAccuracy}`);
    }
    if (typeof record.metrics.humanReadabilityScore === 'number'
        && (record.metrics.humanReadabilityScore < 0 || record.metrics.humanReadabilityScore > 5)) {
      errors.push(`${where}: metrics.humanReadabilityScore expected on a 0-5 scale, got ${record.metrics.humanReadabilityScore}`);
    }
    if (typeof record.metrics.visualQualityScore === 'number'
        && (record.metrics.visualQualityScore < 0 || record.metrics.visualQualityScore > 5)) {
      errors.push(`${where}: metrics.visualQualityScore expected on a 0-5 scale, got ${record.metrics.visualQualityScore}`);
    }
  }

  if (typeof record.cameraModel === 'string' && record.cameraModel.trim() === '') {
    errors.push(`${where}: cameraModel is empty — use "Redacted" if anonymizing, not blank`);
  }

  return errors;
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node validate-results.js <results.json> [more.json ...]');
    process.exit(1);
  }

  let allErrors = [];
  let totalRecords = 0;

  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      allErrors.push(`${file}: could not parse JSON — ${e.message}`);
      continue;
    }
    const records = Array.isArray(parsed) ? parsed : [parsed];
    totalRecords += records.length;
    records.forEach((record, i) => {
      const errors = validateRecord(record, i).map((msg) => `${file} — ${msg}`);
      allErrors = allErrors.concat(errors);
    });
  }

  if (allErrors.length > 0) {
    console.error(`Found ${allErrors.length} problem(s) across ${totalRecords} record(s):\n`);
    allErrors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }

  console.log(`✓ All ${totalRecords} record(s) across ${files.length} file(s) match the schema in docs/camera-resistance-lab/20_RESULTS_SCHEMA.md`);
  process.exit(0);
}

main();
