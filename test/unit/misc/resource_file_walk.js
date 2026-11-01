const assert = require('assert');
const fs = require('fs');
const path = require('path');
const helpers = require('../../../scripts/helpers');

describe('resource source traversal', () => {
  const originalRead = fs.readdir;
  const originalStat = fs.stat;
  const root = path.resolve('virtual-resources');

  afterEach(() => {
    fs.readdir = originalRead;
    fs.stat = originalStat;
  });

  it('awaits an earlier directory whose stat completes after the final entry', () => {
    fs.readdir = (directory, callback) => {
      let entries = [];
      if (directory === root) entries = ['slow', 'fast'];
      else if (directory === path.join(root, 'slow')) entries = ['frame.png'];
      setImmediate(() => callback(null, entries));
    };
    fs.stat = (file, callback) => {
      setTimeout(
        () => callback(null, { isDirectory: () => !file.endsWith('.png') }),
        file === path.join(root, 'slow') ? 20 : 0,
      );
    };
    return helpers.recursivelyGetFilesStartingFrom(root).then((files) => {
      assert.deepStrictEqual(files, [path.join(root, 'slow', 'frame.png')]);
    });
  });

  it('propagates traversal errors through the resource reader', () => {
    fs.readdir = (directory, callback) => setImmediate(() => callback(new Error('read failure')));
    return helpers.recursivelyReadDirectoryAndFiles(root, () => Promise.resolve()).then(
      () => { throw new Error('Expected traversal to reject'); },
      (error) => assert.strictEqual(error.message, 'read failure'),
    );
  });
});
