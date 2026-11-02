const RSX = require('app/data/resources');
const UNIT_LAYOUT = require('app/resources/card_ui/phobies_unit/card-layout.json');
const ABILITY_LAYOUT = require('app/resources/card_ui/phobies_ability/ability-layout.json');

// Fit the approved 226px face into the 140px hand card. JSON positions are 2x.
const CARD_SCALE = 140 / UNIT_LAYOUT.canvas.displayWidth;
const SCALE = CARD_SCALE * (UNIT_LAYOUT.canvas.displayWidth / UNIT_LAYOUT.canvas.width);
const CARD_CENTER = { x: UNIT_LAYOUT.canvas.width * 0.5, y: UNIT_LAYOUT.canvas.height * 0.5 };

function addSprite(node, resource, x, y, scale) {
  const sprite = cc.Sprite.create(resource.img);
  sprite.setAnchorPoint(0.5, 0.5);
  sprite.setPosition((x - CARD_CENTER.x) * SCALE, (CARD_CENTER.y - y) * SCALE);
  sprite.setScale((scale == null ? 1 : scale) * SCALE);
  node.addChild(sprite, 2);
  return sprite;
}

function addText(node, value, x, y, size, color) {
  const label = new cc.LabelTTF(`${value}`, RSX.font_regular.name, size * SCALE);
  label.setAnchorPoint(0.5, 0.5);
  label.setPosition((x - CARD_CENTER.x) * SCALE, (CARD_CENTER.y - y) * SCALE);
  label.setFontFillColor(color || cc.color(255, 255, 255));
  node.addChild(label, 3);
  return label;
}

function createBase(frameResource) {
  const node = new cc.Node();
  const frame = cc.Sprite.create(frameResource.img);
  frame.setAnchorPoint(0.5, 0.5);
  frame.setPosition(0, 0);
  frame.setScale(CARD_SCALE);
  node.addChild(frame, 1);
  return node;
}

function createUnit(card) {
  const node = createBase(RSX.card_ui_unit_frame);
  const stats = [
    { value: card.getATK(), icon: RSX.card_ui_attack_melee },
    { value: card.getHP(), icon: RSX.card_ui_health },
    { value: card.getMovementDistance(), icon: RSX.card_ui_move_walk },
    { value: card.getAttackRangeValue(), icon: RSX.card_ui_range },
  ];
  const attackIcons = {
    melee: RSX.card_ui_attack_melee,
    ranged: RSX.card_ui_attack_ranged,
    lobbed: RSX.card_ui_attack_arc,
    area: RSX.card_ui_attack_area,
  };
  const moveIcons = { walk: RSX.card_ui_move_walk, fly: RSX.card_ui_move_fly, phase: RSX.card_ui_move_phase };
  stats[0].icon = attackIcons[card.getAttackType()] || attackIcons.melee;
  stats[2].icon = moveIcons[card.getMovementType()] || moveIcons.walk;

  const positions = UNIT_LAYOUT.positions;
  addText(node, card.getName().toUpperCase(), positions.name[0], positions.name[1], 25, cc.color(255, 255, 255));
  addText(node, `LEVEL ${card.getLevel()}`, positions.level[0], positions.level[1], UNIT_LAYOUT.levelStyle.fontSize, cc.color(155, 206, 216));
  addText(node, card.getManaCost(), positions.cost[0], positions.cost[1], 22, cc.color(255, 255, 255));
  const rarityIcons = {
    1: RSX.card_ui_rarity_common,
    2: RSX.card_ui_rarity_rare,
    3: RSX.card_ui_rarity_epic,
    4: RSX.card_ui_rarity_legendary,
    6: RSX.card_ui_rarity_mythron,
  };
  const rarityIcon = rarityIcons[card.getRarityId()];
  if (rarityIcon) addSprite(node, rarityIcon, positions.rarity.center[0], positions.rarity.center[1], 1);
  stats.forEach((stat, index) => {
    const [x, y] = positions.stats[index];
    addSprite(node, stat.icon, x, y, 1);
    addText(node, stat.value, x, y + 48, 23, cc.color(255, 255, 255));
  });
  return node;
}

function createAbility(card, state) {
  const node = createBase(RSX.card_ui_ability_frame);
  const counters = ABILITY_LAYOUT.counters;
  const cooldown = Math.max(0, state.cooldown || 0);
  const lockdown = Math.max(0, state.lockdown || 0);
  const counter = lockdown > 0
    ? {
      value: lockdown,
      ring: RSX.card_ui_lockdown_ring,
      icon: RSX.card_ui_lockdown_icon,
      x: counters.lockdown.center[0],
      iconX: counters.lockdown.iconCenter[0],
      valueX: counters.lockdown.center[0] + 19,
      color: cc.color(232, 185, 255),
    }
    : cooldown > 0
      ? {
        value: cooldown,
        ring: RSX.card_ui_cooldown_ring,
        icon: RSX.card_ui_cooldown_icon,
        x: counters.cooldown.center[0],
        iconX: counters.cooldown.iconCenter[0],
        valueX: counters.cooldown.center[0] - 19,
        color: cc.color(123, 230, 245),
      }
      : null;
  addText(node, card.getName().toUpperCase(), ABILITY_LAYOUT.name.center[0], ABILITY_LAYOUT.name.center[1], ABILITY_LAYOUT.name.fontSize, cc.color(255, 255, 255));
  addText(node, `LEVEL ${card.getLevel()}`, ABILITY_LAYOUT.level.center[0], ABILITY_LAYOUT.level.center[1], ABILITY_LAYOUT.level.fontSize, cc.color(155, 206, 216));
  if (counter) {
    const layout = lockdown > 0 ? counters.lockdown : counters.cooldown;
    addSprite(node, counter.ring, counter.x, layout.center[1], 1);
    addSprite(node, counter.icon, counter.iconX, layout.iconCenter[1], 1);
    addText(node, counter.value, counter.valueX, layout.center[1], layout.valueFontSize, counter.color);
  }
  return node;
}

module.exports = { createUnit, createAbility };
