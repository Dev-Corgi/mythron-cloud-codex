const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const visual = require('../../../app/ui/views2/collection/PhobiesCollectionCardVisual');
const frames = require('../../../app/ui/views2/collection/phobiesAbilityIdleFrames.json');

describe('Phobies collection ability animation', () => {
  it('animates every imported skill atlas from its idle frames and stops on teardown', () => {
    for (let id = 51001; id <= 51016; id += 1) {
      const icon = visual.getAbilityIcon(null, id);
      const coordinates = frames[icon.atlas.split('/').pop()];
      expect(coordinates, `skill ${id}`).to.have.length.greaterThan(2);
      expect(coordinates.slice(0, 2), `first frame ${id}`).to.deep.equal([icon.x, icon.y]);
    }

    const icon = visual.getAbilityIcon(null, 51002);
    const positions = [];
    const art = { length: 1, css: (property, value) => positions.push([property, value]) };
    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    let tick;
    let cleared = false;
    global.setInterval = (callback) => { tick = callback; return 42; };
    global.clearInterval = (timer) => { if (timer === 42) cleared = true; };
    try {
      const stop = visual.animateAbilityArt(art, icon);
      tick();
      expect(positions).to.deep.equal([['background-position', '-98px -294px']]);
      stop();
      expect(cleared).to.equal(true);
    } finally {
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    }
  });
});
