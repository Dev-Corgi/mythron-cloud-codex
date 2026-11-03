const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierCannotMove = require('app/sdk/modifiers/modifierCannotMove');
const HexAttackGeometry = require('app/sdk/rulesets/hexAttackGeometry');
const HexTopology = require('app/sdk/rulesets/hexTopology');
const CardIntentType = require('./card_intent_type');
const CardTargetType = require('./card_target_type');
const ScoreForUnit = require('../scoring/base/unit');
const ScoreForUnitDamage = require('../scoring/base/unit_damage');
const ScoreForCardAtTargetPosition = require('../scoring/position/position_ScoreForCardAtTargetPosition');

// Phobies effect cards are scored by the same intent scorers as regular spells.
// Amounts use their imported-game values so damage and healing are measured
// against the actual Health and Attack scale of these cards.
const PA = Cards.PhobiesAbility;
const intents = {};

intents[PA.FeelGreat] = [
  { type: CardIntentType.Heal, amount: 650, targets: CardTargetType.Minion | CardTargetType.Friendly },
  { type: CardIntentType.ModifyATK, amount: 300, targets: CardTargetType.Minion | CardTargetType.Friendly },
];
intents[PA.Monty] = [{
  type: CardIntentType.Burn,
  amount: 450,
  targets: CardTargetType.Minion | CardTargetType.General | CardTargetType.Enemy,
}];
intents[PA.PureAdrenaline] = [{ type: CardIntentType.Heal, amount: 1500, targets: CardTargetType.Minion | CardTargetType.Friendly }];
intents[PA.ClangClang] = [{ type: CardIntentType.ModifyATK, amount: 300, targets: CardTargetType.Minion | CardTargetType.Friendly }];
intents[PA.PeekABoo] = [{
  type: CardIntentType.ModifyATK,
  amount: -300,
  amountIsRebase: false,
  targets: CardTargetType.Minion | CardTargetType.General | CardTargetType.Enemy,
}];
intents[PA.HelpingHand] = [{ type: CardIntentType.ModifyATK, amount: 300, targets: CardTargetType.Minion | CardTargetType.Friendly }];
intents[PA.GroupHug] = [{ type: CardIntentType.Heal, amount: 1100, targets: CardTargetType.Nearby | CardTargetType.Minion | CardTargetType.Friendly }];
intents[PA.SpecialDelivery] = [{ type: CardIntentType.Burn, amount: 550, targets: CardTargetType.Nearby | CardTargetType.Minion | CardTargetType.Enemy }];
intents[PA.Gotcha] = [{
  type: CardIntentType.ApplyModifiers,
  amount: 1,
  modifiers: [ModifierCannotMove.type],
  targets: CardTargetType.Minion | CardTargetType.Enemy,
}];
intents[PA.Poof] = [{ type: CardIntentType.Burn, amount: 1400, targets: CardTargetType.Nearby | CardTargetType.Minion | CardTargetType.Enemy }];
intents[PA.RaisingHell] = [{ type: CardIntentType.Burn, amount: 600, targets: CardTargetType.Nearby | CardTargetType.Minion | CardTargetType.Enemy }];
intents[PA.CawClaw] = [{ type: CardIntentType.Burn, amount: 425, targets: CardTargetType.Minion | CardTargetType.Enemy }];
intents[PA.PlaySmashface] = [{ type: CardIntentType.Burn, amount: 350, targets: CardTargetType.Minion | CardTargetType.Enemy }];
intents[PA.Behold] = [{ type: CardIntentType.Burn, amount: 500, targets: CardTargetType.Minion | CardTargetType.Enemy }];

const scoreWallPlacement = (card, source, position) => {
  const board = source.getGameSession().getBoard();
  const wall = board.getTileAtPosition(position, true);
  const nearbyAllies = board.getFriendlyEntitiesForEntity(source)
    .filter((unit) => !unit.getIsGeneral() && board.getHexDistance(unit.getPosition(), position) <= 2).length;
  const nearbyEnemies = board.getEnemyEntitiesForEntity(source)
    .filter((unit) => board.getHexDistance(unit.getPosition(), position) <= 2).length;
  if (wall && wall.getId() === Cards.Tile.Wall) {
    // Removing a Wall is useful when it opens space for our nearby units.
    return Math.max(0, 35 + nearbyAllies * 18 - nearbyEnemies * 8);
  }
  // A new Wall scores only when it obstructs nearby enemy access more than ours.
  return Math.max(0, nearbyEnemies * 32 - nearbyAllies * 18);
};

const scorePathAndPosition = (card, source, targetPosition) => {
  const board = source.getGameSession().getBoard();
  const distance = HexTopology.getDistance(source.getPosition(), targetPosition);
  if (card.getId() === PA.BullRush) {
    const path = HexAttackGeometry.getBullRushPath(board, source, targetPosition);
    if (path.length !== 4) return -100000;
    let score = 0;
    for (const position of path.slice(1, -1)) {
      const target = board.getUnitAtPosition(position, true);
      if (target && !source.getIsSameTeamAs(target)) score += ScoreForUnitDamage(target, 550);
    }
    const oldPositionScore = ScoreForCardAtTargetPosition(source, source.getPosition());
    const newPositionScore = ScoreForCardAtTargetPosition(source, targetPosition);
    return score + Math.max(0, newPositionScore - oldPositionScore);
  }

  if (card.getId() === PA.CawClaw && distance === 2) {
    const destinations = HexTopology.getNeighbors(targetPosition).filter((position) =>
      HexTopology.getDistance(source.getPosition(), position) === 1
        && !board.getObstructionAtPositionForEntity(position, source)
        && source.getMovementRange().getIsPositionValid(board, source, position, true));
    if (destinations.length === 0) return -100000;
    const currentScore = ScoreForCardAtTargetPosition(source, source.getPosition());
    return Math.max(...destinations.map((position) =>
      ScoreForCardAtTargetPosition(source, position) - currentScore));
  }

  if (card.getId() === PA.PlaySmashface) {
    const target = board.getUnitAtPosition(targetPosition, true);
    const destination = HexAttackGeometry.getPushDestination(board, source.getPosition(), targetPosition);
    return target && destination ? 20 : 0;
  }
  return 0;
};

// Extra scoring for effects whose target value is not represented by a single
// ordinary spell intent (source-centred blasts, movement, and neutral Walls).
Object.defineProperty(intents, 'scoreAbilityPosition', {
  enumerable: false,
  value(card, source, targetPosition) {
    if (!card || !source || !targetPosition) return 0;
    const id = card.getId();
    let score = 0;
    if (id === PA.Terrorform) score += scoreWallPlacement(card, source, targetPosition);
    if (id === PA.SpecialDelivery || id === PA.Poof) {
      score -= ScoreForUnit(source) * 0.5;
    } else if (id === PA.RaisingHell) {
      const origin = source.getPosition();
      score += source.getGameSession().getBoard().getUnits().reduce((rayScore, target) => {
        const targetPosition = target.getPosition();
        if (!target.getIsActive() || target.getOwnerId() === source.getOwnerId()
          || HexTopology.getDistance(origin, targetPosition) !== 2
          || !HexTopology.isOnHexAxis(origin, targetPosition)
          || !HexAttackGeometry.isAreaVictim(source.getGameSession().getBoard(), source, origin, 2, target)) return rayScore;
        return rayScore + ScoreForUnitDamage(target, 300);
      }, 0);
    } else if (id === PA.Gotcha) {
      const target = source.getGameSession().getBoard().getUnitAtPosition(targetPosition, true);
      if (target && target.getOwnerId() !== source.getOwnerId()) score += target.getATK() * 0.75;
      score -= ScoreForUnit(source) * 0.5;
    }
    score += scorePathAndPosition(card, source, targetPosition);
    return score;
  },
});

module.exports = intents;
