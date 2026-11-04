const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../..');
const mochaBin = path.join(projectRoot, 'node_modules/mocha/bin/_mocha');
const suites = [
  'test/unit/sdk/cards/phobies_factory.js',
  'test/unit/sdk/game/active_abilities.js',
  'test/unit/sdk/game/card_eligibility.js',
  'test/unit/view/phobies_presentation_regressions.js',
  'test/unit/view/phobies_collection_card_visual.js',
  'test/unit/view/game_layer_active_ability_inspect.js',
  'test/unit/view/hand_ability_slot.js',
  'test/unit/view/unique_collection_card_models.js',
  'test/unit/ui/models/deck_phobies_eligibility.js',
];
const reportPath = process.env.PHOBIES_SWEEP_REPORT
  ? path.resolve(process.env.PHOBIES_SWEEP_REPORT)
  : path.join(projectRoot, '.tmp', 'phobies-regression-sweep-report.json');

const result = spawnSync(process.execPath, [mochaBin, '-t', '10000', '--reporter', 'json', ...suites], {
  cwd: projectRoot,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
const stdout = result.stdout || '';
const statsMarker = stdout.indexOf('"stats"');
const jsonStart = statsMarker >= 0 ? stdout.lastIndexOf('{', statsMarker) : -1;
let mochaReport = null;
let parseError = null;
if (jsonStart >= 0) {
  try {
    mochaReport = JSON.parse(stdout.slice(jsonStart));
  } catch (error) {
    parseError = error.message;
  }
}

const failures = mochaReport
  ? mochaReport.failures.map((failure) => ({
    title: failure.fullTitle,
    message: failure.err && failure.err.message,
  }))
  : [{
    title: 'sweep runner',
    message: parseError || (result.error && result.error.message) || 'Mocha JSON report was unavailable',
  }];
const report = {
  schemaVersion: 1,
  kind: 'phobies-regression-suite-sweep',
  complete: false,
  incompleteReasons: [
    'Does not play each of the 35 units from a Practice/Sandbox v2 deck.',
    'Does not compare rendered board entity state after every required action.',
    'Built-client browser captures require an available built-in browser session.',
    'Does not recreate pre-fix failures for all historical defect-register entries.',
  ],
  conformanceCardIds: Array.from({ length: 35 }, (_, index) => 50001 + index),
  exercisedAbilityEffectIds: Array.from({ length: 16 }, (_, index) => 51001 + index),
  suites,
  redisDependentSuitesExcluded: ['test/unit/server/api/practice_entry.js'],
  tests: mochaReport ? mochaReport.stats : null,
  defects: failures,
  exitCode: result.status == null || failures.length > 0 ? 1 : result.status,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  reportPath,
  tests: report.tests,
  defects: report.defects.length,
  complete: report.complete,
}, null, 2)}\n`);
process.exitCode = report.exitCode;
