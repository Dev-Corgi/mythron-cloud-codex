// Resolve the complete resource closure of the imported event aliases.
const DATA = require('../data.coffee');
const RSX = require('./resources');

module.exports = function phobiesFXResources(identifiers) {
  const resources = [];
  const visit = (data) => {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (key === 'spriteIdentifier' || key === 'plistFile') {
        RSX.getResourcesByPath(value).forEach((resource) => {
          if (resources.indexOf(resource) === -1) resources.push(resource);
        });
      } else visit(value);
    });
  };
  (identifiers || []).filter((id) => id.indexOf('FX.Phobies.') === 0).forEach((id) => {
    visit(DATA.dataForIdentifier(id));
  });
  return resources;
};
