// pragma PKGS: all

'use strict';

var RSX = require('app/data/resources');
var SDK = require('app/sdk');
var CONFIG = require('app/common/config');
var UNIT_LAYOUT = require('app/resources/card_ui/phobies_unit/card-layout.json');
var ABILITY_LAYOUT = require('app/resources/card_ui/phobies_ability/ability-layout.json');

var ATTACK_ICONS = {
  melee: RSX.collection_card_attack_melee.img,
  ranged: RSX.collection_card_attack_ranged.img,
  lobbed: RSX.collection_card_attack_arc.img,
  area: RSX.collection_card_attack_area.img,
};
var MOVEMENT_ICONS = {
  walk: RSX.collection_card_move_walk.img,
  fly: RSX.collection_card_move_fly.img,
  phase: RSX.collection_card_move_phase.img,
};
var RARITY_ICONS = {
  common: RSX.collection_card_rarity_common.img,
  rare: RSX.collection_card_rarity_rare.img,
  epic: RSX.collection_card_rarity_epic.img,
  legendary: RSX.collection_card_rarity_legendary.img,
  mythron: RSX.collection_card_rarity_mythron.img,
};

// Sprite atlas frame for each Duelyst skill icon. The imported skills without
// dedicated art reuse their closest existing game icon or attack indicator.
var ABILITY_ICONS = {
  51001: { atlas: 'iconFlashReincarnationIdle', x: 49, y: 147 },
  51002: { atlas: 'icon_f2_phoenixfire', x: 0, y: 196 },
  51003: { atlas: 'iconFlashReincarnationIdle', x: 49, y: 147 },
  51004: { atlas: 'iconWarSurgeIdle', x: 49, y: 0 },
  51005: { atlas: 'iconBlindScorchIdle', x: 49, y: 196 },
  51006: { atlas: 'iconFlashReincarnationIdle', x: 49, y: 147 },
  51007: { atlas: 'iconDivineBondIdle', x: 98, y: 49 },
  51008: { atlas: 'iconEggGrenadeIdle', x: 49, y: 196 },
  51009: { atlas: 'iconFlashFreezeIdle', x: 49, y: 196 },
  51010: { atlas: 'iconEggGrenadeIdle', x: 49, y: 196 },
  51011: { atlas: 'iconHolyImmolationIdle', x: 49, y: 147 },
  51013: { atlas: 'iconSpiralCounterIdle', x: 49, y: 147 },
  51014: { atlas: 'iconKoanOfHornsIdle', x: 49, y: 98 },
  51015: { atlas: 'iconBoulderHurlIdle', x: 49, y: 49 },
  51016: { atlas: 'iconThunderbombIdle', x: 98, y: 0 },
};

function getAbilityIcon(effect, effectCardId) {
  var icon = ABILITY_ICONS[effectCardId];
  if (icon && icon.image) return { atlas: icon.image, portrait: true };
  if (icon && RSX[icon.atlas]) {
    return { atlas: RSX[icon.atlas].img, x: icon.x, y: icon.y };
  }
  var portrait = effect && effect.getPortraitResource && effect.getPortraitResource();
  return portrait ? { atlas: portrait, portrait: true } : null;
}

function getAbilityArtPresentation(icon) {
  if (!icon) return null;
  return {
    art: icon.atlas,
    artPosition: icon.portrait ? 'center' : `${-icon.x * 2}px ${-icon.y * 2}px`,
    artSize: icon.portrait ? 'cover' : '512px 512px',
  };
}

function centerAt(element, x, y) {
  element.css({ left: `${(x / UNIT_LAYOUT.canvas.width) * 100}%`, top: `${(y / UNIT_LAYOUT.canvas.height) * 100}%` });
}

function addLabel($container, className, text, x, y) {
  var $label = $('<span>').addClass(`phobies-card-${className}`).text(text);
  centerAt($label, x, y);
  $container.append($label);
  return $label;
}

function addImage($container, className, assetPath, x, y) {
  var $image = $('<img>').addClass(`phobies-card-${className}`).attr({ src: assetPath, alt: '', 'aria-hidden': 'true' });
  centerAt($image, x, y);
  $container.append($image);
  return $image;
}

function getAbilityDetail(card) {
  var ability = card && card.activeAbility;
  if (!ability || !ability.effectCardId) return null;
  var effect;
  try {
    effect = SDK.CardFactory.cardForIdentifier(ability.effectCardId, card.getGameSession && card.getGameSession());
  } catch (error) {
    return null;
  }
  if (!effect) return null;
  var icon = getAbilityIcon(effect, ability.effectCardId);
  if (!icon) return null;
  return {
    name: effect.getName().replace(/^\[PB\]\s*/, ''),
    description: effect.getDescription(),
    level: effect.getLevel ? effect.getLevel() : 1,
    icon: icon,
    lockdown: Math.max(0, Math.floor(ability.lockdown || 0)),
    cooldown: Math.max(1, Math.floor(ability.cooldown || 1)),
  };
}

function getCardFaceType(cardModel) {
  if (!cardModel || !cardModel.get('card')) return null;
  if (cardModel.get('isUnit')) return 'unit';
  if (cardModel.get('isSpell')) return 'ability';
  return null;
}

function getUnitStatData(card) {
  return [
    { label: 'Attack', value: card.getATK(), icon: ATTACK_ICONS[card.getAttackType()] || ATTACK_ICONS.melee },
    { label: 'Health', value: card.getHP(), icon: RSX.collection_card_health.img },
    { label: 'Movement', value: card.getMovementDistance(), icon: MOVEMENT_ICONS[card.getMovementType()] || MOVEMENT_ICONS.walk },
    { label: 'Range', value: card.getAttackRangeValue(), icon: RSX.collection_card_range.img },
  ];
}

function getStatPositions(position) {
  return { icon: [position[0] - 36, position[1]], value: [position[0], position[1]] };
}

function createFace($, cardModel) {
  var card = cardModel.get('card');
  var faceType = getCardFaceType(cardModel);
  if (!faceType) return null;

  var isUnit = faceType === 'unit';
  var isAbility = faceType === 'ability';
  var $face = $('<div>').addClass(`phobies-collection-face ${isAbility ? 'phobies-ability-face' : 'phobies-unit-face'}`);
  var framePath = isAbility ? RSX.collection_card_ability_frame.img : RSX.collection_card_unit_frame.img;
  $face.append($('<img>').addClass('phobies-card-frame').attr({ src: framePath, alt: '', 'aria-hidden': 'true' }));

  if (isUnit) {
    var positions = UNIT_LAYOUT.positions;
    var statData = getUnitStatData(card);

    var $unitName = addLabel($face, 'name', card.getName().toUpperCase(), positions.name[0], positions.name[1]);
    if ($unitName.text().length > 20) $unitName.addClass('is-long');
    addLabel($face, 'level', `LEVEL ${card.getLevel()}`, positions.level[0], positions.level[1]);

    var rarityIcon = RARITY_ICONS[cardModel.get('rarityDevName')];
    if (rarityIcon) addImage($face, 'rarity', rarityIcon, positions.rarity.center[0], positions.rarity.center[1]);

    var $unitEffect = $('<div>').addClass('phobies-card-effect').html(card.getDescription(CONFIG.FORMATTING_ENGINE) || '');
    $unitEffect.attr('aria-label', $unitEffect.text() || '');
    if (($unitEffect.text() || '').length > 100) $unitEffect.addClass('is-long');
    centerAt($unitEffect, positions.effect.center[0], positions.effect.center[1]);
    $face.append($unitEffect);

    positions.stats.forEach(function (position, index) {
      // The stat ring is centered at position. Its left edge is one ring
      // radius (36 design units) to the left; values stay centered in it.
      var statPositions = getStatPositions(position);
      addImage($face, 'stat-icon', statData[index].icon, statPositions.icon[0], statPositions.icon[1]);
      addLabel($face, 'stat-value', statData[index].value, statPositions.value[0], statPositions.value[1])
        .attr('aria-label', `${statData[index].label}: ${statData[index].value}`);
    });
  } else {
    var namePosition = ABILITY_LAYOUT.name.center;
    var levelPosition = ABILITY_LAYOUT.level.center;
    var effectPosition = ABILITY_LAYOUT.effect.center;
    var $abilityName = addLabel($face, 'name', card.getName().toUpperCase(), namePosition[0], namePosition[1]);
    if ($abilityName.text().length > 21) $abilityName.addClass('is-long');
    addLabel($face, 'level', `LEVEL ${card.getLevel ? card.getLevel() : 1}`, levelPosition[0], levelPosition[1]);
    var $effect = $('<div>').addClass('phobies-card-effect').html(cardModel.get('description') || '');
    $effect.attr('aria-label', $effect.text() || '');
    if (($effect.text() || '').length > 100) $effect.addClass('is-long');
    centerAt($effect, effectPosition[0], effectPosition[1]);
    $face.append($effect);
  }

  return $face;
}

function render($, cardModel, $cardElement) {
  var $face = createFace($, cardModel);
  var $sprite = $cardElement.find('.card-sprite').first().detach();
  $cardElement.removeClass('phobies-unit phobies-ability');
  $cardElement.find('.phobies-collection-face').remove();
  if (!$face) {
    if ($sprite.length) $cardElement.append($sprite);
    return null;
  }

  // Keep the original animated unit art as a live layer between the frame
  // fill and the text/stat overlays.
  if ($sprite.length) $face.append($sprite);

  var isUnit = cardModel.get('isUnit');
  $cardElement.addClass(isUnit ? 'phobies-unit' : 'phobies-ability');
  $cardElement.append($face);
  return $face;
}

module.exports = {
  createFace: createFace,
  getCardFaceType: getCardFaceType,
  getAbilityDetail: getAbilityDetail,
  getAbilityIcon: getAbilityIcon,
  getAbilityArtPresentation: getAbilityArtPresentation,
  getStatPositions: getStatPositions,
  getUnitStatData: getUnitStatData,
  render: render,
};
