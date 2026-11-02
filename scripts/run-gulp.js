const path = require('path');
const { spawnSync } = require('child_process');

// Keep Babel's cache under the project. The default home-directory path may be
// unwritable in managed Windows environments and makes every Gulp build fail.
process.env.BABEL_CACHE_PATH = process.env.BABEL_CACHE_PATH
  || path.join(__dirname, '..', '.tmp', 'babel-register', '.babel.json');

const gulpPath = path.join(__dirname, '..', 'node_modules', 'gulp', 'bin', 'gulp.js');
const result = spawnSync(process.execPath, [
  '--max_old_space_size=2048',
  '--stack-size=100000',
  gulpPath,
  ...process.argv.slice(2),
], { stdio: 'inherit', env: process.env });

if (result.error) throw result.error;
process.exit(result.status == null ? 1 : result.status);
