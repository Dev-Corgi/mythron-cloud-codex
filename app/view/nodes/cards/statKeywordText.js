// Version 2 unit faces show movement and attack types as stat icons, so the keyword text for them
// (Flying, Phasing, Ranged, Blast) is dropped from the description. Only lines made up entirely of
// keyword names are touched, so prose such as "Flying minions gain +1 attack" is left alone.

const TAG_PATTERN = /<\/?[a-z]+>|[[\]]/gi;

function normalizeToken(token) {
  return token.replace(TAG_PATTERN, '').trim();
}

function removeStatKeywordText(description, statKeywordNames, allKeywordNames) {
  if (!description || !statKeywordNames || statKeywordNames.length === 0) return description;
  const statNames = new Set(statKeywordNames);
  const keywordNames = new Set((allKeywordNames || []).concat(statKeywordNames));

  // a line that only held stat keywords becomes null and is dropped; every other line is kept as is
  const lines = description.split('\n').map((line) => {
    const tokens = line.split(',');
    const names = tokens.map(normalizeToken);
    const isKeywordLine = names.length > 0 && names.every((name) => keywordNames.has(name));
    if (!isKeywordLine) return line;
    const kept = tokens.filter((token, index) => !statNames.has(names[index]));
    if (kept.length === tokens.length) return line;
    return kept.length === 0 ? null : kept.map((token) => token.trim()).join(', ');
  });

  return lines.filter((line) => line !== null).join('\n').replace(/^\n+|\n+$/g, '');
}

module.exports = { removeStatKeywordText };
