const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const Spell = require('../../../../app/sdk/spells/spell.coffee');
const HexAttackGeometry = require('../../../../app/sdk/rulesets/hexAttackGeometry.coffee');
const HexTopology = require('../../../../app/sdk/rulesets/hexTopology.coffee');

Logger.enabled = false;

describe('hex attack geometry (v2 ranged, lobbed, area)', () => {
  let session;
  let board;
  let attacker;

  const addUnit = (ownerId, position) => {
    const unit = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    unit.setOwnerId(ownerId);
    unit.setPosition(position);
    unit.setIsPlayed(true);
    unit.setIsRemoved(false);
    board.addCard(unit);
    return unit;
  };
  const addWall = (position) => {
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition(position);
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    return wall;
  };
  const flush = () => attacker.getAttackRange().flushCachedState();
  const valid = (target) => attacker.getAttackRange().getIsValidTarget(board, attacker, target);
  const key = (entity) => `${entity.getPosition().q},${entity.getPosition().r}`;

  beforeEach(() => {
    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction4.General }], true, true);
    session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    board = session.getBoard();
    attacker = session.getGeneralForPlayer1();
    attacker.setPosition({ q: 4, r: 0 });
    attacker.atk = 2;
    attacker.refreshExhaustion();
    for (const unit of board.getUnits()) {
      if (unit !== attacker) unit.setIsRemoved(true);
    }
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  it('RANGED_BLOCKED: a Wall strictly between on an axis invalidates the target', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const enemy = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    expect(valid(enemy)).to.equal(true);
    addWall({ q: 6, r: 0 });
    flush();
    expect(valid(enemy)).to.equal(false);
    expect(attacker.getAttackRange().getValidTargets(board, attacker)).not.to.include(enemy);
  });

  it('RANGED_ENDPOINT_WALL: Walls on the origin or target cell do not block', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const enemy = addUnit(session.getPlayer2Id(), { q: 6, r: 0 });
    addWall({ q: 6, r: 0 });
    addWall({ q: 4, r: 0 });
    flush();
    expect(valid(enemy)).to.equal(true);
  });

  it('RANGED: a Wall is targetable, supports a target Unit, and zero health does not stop blocking while present', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const wallTarget = addWall({ q: 5, r: 1 });
    expect(valid(wallTarget)).to.equal(true);
    const supportedEnemy = addUnit(session.getPlayer2Id(), { q: 5, r: 1 });
    expect(valid(supportedEnemy)).to.equal(true);

    const fartherEnemy = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    const blocker = addWall({ q: 6, r: 0 });
    blocker.setDamage(blocker.getMaxHP());
    flush();
    expect(valid(fartherEnemy)).to.equal(false);
    blocker.setIsRemoved(true);
    flush();
    expect(valid(fartherEnemy)).to.equal(true);
  });

  it('RANGED: off-axis in-range targets are legal when the center line is clear', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const offAxis = addUnit(session.getPlayer2Id(), { q: 5, r: 2 });
    expect(valid(offAxis)).to.equal(true);
  });

  it('RANGED: walls crossed away from their centers do not block', () => {
    attacker.setReach(4);
    attacker.setAttackType('ranged');
    const enemy = addUnit(session.getPlayer2Id(), { q: 3, r: 1 });
    addWall({ q: 1, r: 1 });
    flush();
    expect(HexTopology.segmentEntersHexInterior({ q: 0, r: 0 }, { q: 3, r: 1 }, { q: 1, r: 1 })).to.equal(true);
    expect(valid(enemy)).to.equal(true);
  });

  it('RANGED fixtures: table-driven center-line and linked-Wall outcomes', () => {
    const fixtures = [
      { range: 2, grid: ['.##x.', ' ##W# ', 'xWA##', ' !WW# ', '.x!x.'] },
      { range: 3, grid: ['..####...', ' .######. ', '.xxWA##..', ' .######. ', '..####...'] },
      { range: 3, grid: ['..####...', ' .####W. ', '.###A###.', ' .####W. ', '..####...'] },
      { range: 4, grid: ['.######x.', ' .####W!!. ', 'xxxWA#Wxx', ' !!!WW### ', '.!!x!x##.'] },
      { range: 4, grid: ['.##x!x!x.', ' ###WWWW# ', '####A####', ' ######## ', '.#######.'] },
      { range: 4, grid: ['.##x!x##.', ' ###WW#WW ', '####A####', ' ######## ', '.#######.'] },
    ];

    for (const fixture of fixtures) {
      const walls = [];
      const targets = [];
      let origin;
      fixture.grid.forEach((line, r) => {
        [...line.trim()].forEach((symbol, c) => {
          if (symbol === '.') return;
          const position = { q: c - Math.floor(r / 2), r };
          if (symbol === 'A') origin = position;
          else if (symbol === 'W' || symbol === 'w') walls.push(position);
          else targets.push({ symbol, position });
        });
      });

      const fakeWalls = walls.map((position) => ({
        getIsActive: () => true,
        getType: () => SDK.CardType.Tile,
        getId: () => SDK.Cards.Tile.Wall,
        getIsObstructing: () => true,
        getPosition: () => position,
      }));
      const fakeBoard = {
        getEntities: () => fakeWalls,
        positionsEqual: (a, b) => a.q === b.q && a.r === b.r,
      };
      const rangedEntity = { getAttackType: () => 'ranged' };

      for (const target of targets) {
        const distance = HexTopology.getDistance(origin, target.position);
        expect(distance, `fixture target ${target.symbol} at ${target.position.q},${target.position.r}`).to.be.within(1, fixture.range);
        const expected = target.symbol === '#' || target.symbol === 'W';
        expect(HexAttackGeometry.canDeliver(fakeBoard, rangedEntity, origin, target.position), `${target.symbol} at ${target.position.q},${target.position.r}`).to.equal(expected);
      }
    }
  });

  it('RANGED: adjacent Walls block their center-to-center link, while an unlinked pair does not', () => {
    attacker.setReach(4);
    attacker.setAttackType('ranged');
    const enemy = addUnit(session.getPlayer2Id(), { q: 4, r: 4 });
    addWall({ q: 5, r: 1 });
    addWall({ q: 4, r: 2 });
    flush();
    expect(valid(enemy)).to.equal(false);
    for (const e of board.getEntities()) if (e.getType() === SDK.CardType.Tile && e.getId() === SDK.Cards.Tile.Wall) e.setIsRemoved(true);
    addWall({ q: 5, r: 1 });
    addWall({ q: 3, r: 2 });
    flush();
    expect(valid(enemy)).to.equal(true);
  });

  it('RANGED: the Ranged keyword keeps attack type but does not grant v2 reach', () => {
    const ranged = attacker;
    ranged.setReach(2);
    session.applyModifierContextObject(SDK.ModifierRanged.createContextObject(), ranged);
    expect(ranged.getAttackType()).to.equal('ranged');
    expect(ranged.getAttackRangeValue()).to.equal(2);
    expect(ranged.getReach()).to.equal(2);
    const near = addUnit(session.getPlayer2Id(), { q: 5, r: 1 });
    const far = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    expect(ranged.getAttackRange().getIsValidTarget(board, ranged, near)).to.equal(true);
    expect(ranged.getAttackRange().getIsValidTarget(board, ranged, far)).to.equal(false);

    const banded = attacker;
    banded.setReach(2);
    const ModifierBandedRanged = require('../../../../app/sdk/modifiers/modifierBandedRanged.coffee');
    session.applyModifierContextObject(ModifierBandedRanged.createContextObject(), banded);
    expect(banded.getAttackType()).to.equal('ranged');
    expect(banded.getAttackRangeValue()).to.equal(2);
    expect(banded.getReach()).to.equal(2);
  });

  it('LOBBED: Walls and Units between do not block any in-reach target', () => {
    attacker.setReach(3);
    attacker.setAttackType('lobbed');
    const enemy = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    const wall = addWall({ q: 6, r: 0 });
    addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const offAxis = addUnit(session.getPlayer2Id(), { q: 5, r: 2 });
    flush();
    expect(valid(enemy)).to.equal(true);
    expect(valid(wall)).to.equal(true);
    expect(valid(offAxis)).to.equal(true);
    const far = addUnit(session.getPlayer2Id(), { q: 8, r: 0 });
    expect(valid(far)).to.equal(false);
  });

  it('LOBBED: an enemy Wall covered by an allied Unit stays targetable', () => {
    attacker.setReach(3);
    attacker.setAttackType('lobbed');
    const wall = addWall({ q: 6, r: 0 });
    const ally = addUnit(session.getPlayer1Id(), { q: 6, r: 0 });
    flush();
    expect(valid(ally)).to.equal(false);
    expect(valid(wall)).to.equal(true);
    expect(attacker.getAttackRange().getTargetAtPosition(board, attacker, { q: 6, r: 0 })).to.equal(wall);
  });

  it('SHARED_CELL: an enemy Unit on a Wall has priority and the validator rejects the Wall', () => {
    attacker.setReach(2);
    attacker.setAttackType('lobbed');
    const wall = addWall({ q: 6, r: 0 });
    const enemy = addUnit(session.getPlayer2Id(), { q: 6, r: 0 });
    flush();
    expect(attacker.getAttackRange().getTargetAtPosition(board, attacker, { q: 6, r: 0 })).to.equal(enemy);
    expect(valid(enemy)).to.equal(true);
    expect(valid(wall)).to.equal(false);
    const targets = attacker.getAttackRange().getValidTargets(board, attacker);
    expect(targets).to.include(enemy);
    expect(targets).not.to.include(wall);
    const wallAttack = attacker.actionAttack(wall);
    session.validateAction(wallAttack, false);
    expect(wallAttack.getIsValid()).to.equal(false);
  });

  it('getValidTargets and getIsValidTarget agree for ranged attackers', () => {
    attacker.setReach(4);
    attacker.setAttackType('ranged');
    const enemies = [
      addUnit(session.getPlayer2Id(), { q: 6, r: 0 }),
      addUnit(session.getPlayer2Id(), { q: 4, r: 2 }),
      addUnit(session.getPlayer2Id(), { q: 5, r: 2 }),
    ];
    const walls = [addWall({ q: 5, r: 0 }), addWall({ q: 4, r: 1 })];
    flush();
    const targets = attacker.getAttackRange().getValidTargets(board, attacker);
    for (const candidate of [...enemies, ...walls]) {
      expect(targets.includes(candidate), `candidate ${key(candidate)}`).to.equal(valid(candidate));
    }
    expect(targets).not.to.include(enemies[0]);
  });

  it('AREA_PER_VICTIM and BOUNDARY_CONTACT: only unblocked enemy Units and Walls take damage', () => {
    attacker.setReach(3);
    attacker.setAttackType('area');
    const initiator = addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const blocked = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    const ally = addUnit(session.getPlayer1Id(), { q: 5, r: 1 });
    const offAxis = addUnit(session.getPlayer2Id(), { q: 5, r: 2 });
    const blockerWall = addWall({ q: 6, r: 0 });
    const boundaryWall = addWall({ q: 4, r: 2 });
    const before = [blocked, ally, blockerWall, boundaryWall].map((e) => e.getHP());
    flush();
    session.executeAction(attacker.actionAttack(initiator));
    expect(initiator.getHP()).to.be.below(initiator.getMaxHP());
    expect(offAxis.getHP()).to.be.below(offAxis.getMaxHP());
    expect(blocked.getHP()).to.equal(before[0]);
    expect(ally.getHP()).to.equal(before[1]);
    expect(blockerWall.getHP()).to.equal(before[2] - 2);
    expect(boundaryWall.getHP()).to.equal(before[3] - 2);
  });

  it('AREA: a Wall beneath an enemy victim does not shield it, and allied cover is excluded', () => {
    attacker.setReach(2);
    attacker.setAttackType('area');
    const wall = addWall({ q: 6, r: 0 });
    const enemy = addUnit(session.getPlayer2Id(), { q: 6, r: 0 });
    const wall2 = addWall({ q: 4, r: 2 });
    const ally = addUnit(session.getPlayer1Id(), { q: 4, r: 2 });
    const wallHp = wall.getHP();
    const wall2Hp = wall2.getHP();
    const allyHp = ally.getHP();
    flush();
    session.executeAction(attacker.actionAttack(enemy));
    expect(enemy.getHP()).to.be.below(enemy.getMaxHP());
    expect(wall.getHP()).to.equal(wallHp - 2);
    expect(wall2.getHP()).to.equal(wall2Hp - 2);
    expect(ally.getHP()).to.equal(allyHp);
  });

  it('SPELL_AREA: a spell radius yields the same candidate set as the equivalent area attack', () => {
    addWall({ q: 6, r: 0 });
    addWall({ q: 5, r: 2 });
    const center = { q: 4, r: 0 };
    const spell = new Spell(session);
    spell.radius = 3;
    const spellKeys = spell._findApplyEffectPositions(center, null).map((p) => `${p.q},${p.r}`);

    attacker.setReach(3);
    attacker.setAttackType('area');
    attacker.atk = 1;
    const victims = [];
    for (const p of board.getHexPositionsInRange(center, 3)) {
      if (p.q === center.q && p.r === center.r) continue;
      victims.push(addUnit(session.getPlayer2Id(), p));
    }
    flush();
    const hpBefore = victims.map((v) => v.getHP());
    const target = victims.find((v) => key(v) === '5,0');
    session.executeAction(attacker.actionAttack(target));
    const hitKeys = victims.filter((v, i) => v.getHP() < hpBefore[i]).map(key);
    for (const victim of victims) {
      expect(spellKeys.includes(key(victim)), `victim ${key(victim)}`).to.equal(hitKeys.includes(key(victim)));
    }
    expect(hitKeys.length).to.be.greaterThan(0);
    expect(spellKeys).to.include('5,0');
    expect(spellKeys).to.include('6,0');
    expect(spellKeys).not.to.include('7,0');
  });

  it('AREA_RESOLUTION_ORDER: a Wall destroyed by the same area attack still shields victims behind it', () => {
    attacker.setReach(3);
    attacker.setAttackType('area');
    const initiator = addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const frontWall = addWall({ q: 6, r: 0 });
    const backWall = addWall({ q: 7, r: 0 });
    frontWall.setDamage(frontWall.getMaxHP() - 2);
    const backHp = backWall.getHP();
    flush();
    session.executeAction(attacker.actionAttack(initiator));
    expect(frontWall.getHP()).to.be.at.most(0);
    expect(backWall.getHP()).to.equal(backHp);
  });

  it('AREA_RESOLUTION_ORDER: an intact front Wall keeps shielding the Wall behind it', () => {
    attacker.setReach(3);
    attacker.setAttackType('area');
    const initiator = addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const frontWall = addWall({ q: 6, r: 0 });
    const backWall = addWall({ q: 7, r: 0 });
    const backHp = backWall.getHP();
    flush();
    session.executeAction(attacker.actionAttack(initiator));
    expect(frontWall.getHP()).to.be.below(frontWall.getMaxHP());
    expect(backWall.getHP()).to.equal(backHp);
  });

  it('RANGED: Units between attacker and target never block a ranged shot', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    addUnit(session.getPlayer1Id(), { q: 5, r: 0 });
    addUnit(session.getPlayer2Id(), { q: 6, r: 0 });
    const far = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    flush();
    expect(valid(far)).to.equal(true);
  });

  it('RANGED: a Wall no longer on the board stops blocking', () => {
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const enemy = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    const wall = addWall({ q: 6, r: 0 });
    flush();
    expect(valid(enemy)).to.equal(false);
    wall.setIsRemoved(true);
    flush();
    expect(valid(enemy)).to.equal(true);
  });

  it('BULL_RUSH: prefers the legal three-step path that crosses the most enemy Units', () => {
    const enemies = new Map();
    const fakeSource = {
      getPosition: () => ({ q: 3, r: 2 }),
      getIsSameTeamAs: (entity) => entity.ownerId === 1,
    };
    enemies.set('4,2', { getType: () => SDK.CardType.Unit, ownerId: 2, getIsActive: () => true });
    const fakeBoard = {
      getGameSession: () => ({ getIsPracticeSandboxV2: () => true }),
      positionsEqual: (a, b) => a.q === b.q && a.r === b.r,
      isOnBoard: HexTopology.isOnBoard,
      hasTileAtPosition: (p) => HexTopology.hasTile(p, 2),
      getObstructionAtPositionForEntity: (p) => enemies.get(`${p.q},${p.r}`) || null,
      getUnitAtPosition: (p) => enemies.get(`${p.q},${p.r}`) || null,
    };
    const path = HexAttackGeometry.getBullRushPath(fakeBoard, fakeSource, { q: 6, r: 2 });
    expect(path.map((p) => `${p.q},${p.r}`)).to.deep.equal(['3,2', '4,2', '5,2', '6,2']);
  });

  it('BULL_RUSH: keeps topology neighbor order for tied paths and rejects occupied endpoints', () => {
    const fakeSource = { getPosition: () => ({ q: 3, r: 2 }), getIsSameTeamAs: () => false };
    let occupiedEndpoint = false;
    const fakeBoard = {
      getGameSession: () => ({ getIsPracticeSandboxV2: () => true }),
      positionsEqual: (a, b) => a.q === b.q && a.r === b.r,
      isOnBoard: HexTopology.isOnBoard,
      hasTileAtPosition: (p) => HexTopology.hasTile(p, 2),
      getObstructionAtPositionForEntity: (p) => { if (occupiedEndpoint && p.q === 6 && p.r === 2) return {}; return null; },
      getUnitAtPosition: () => null,
    };
    const path = HexAttackGeometry.getBullRushPath(fakeBoard, fakeSource, { q: 6, r: 2 });
    expect(path[1]).to.deep.equal({ q: 4, r: 2 });
    occupiedEndpoint = true;
    expect(HexAttackGeometry.getBullRushPath(fakeBoard, fakeSource, { q: 6, r: 2 })).to.deep.equal([]);
    expect(HexAttackGeometry.getBullRushPath(fakeBoard, fakeSource, { q: 5, r: 2 })).to.deep.equal([]);
  });

  it('PUSH: only returns an empty on-board straight-line destination', () => {
    const occupants = new Set();
    const fakeBoard = {
      isOnBoard: HexTopology.isOnBoard,
      hasTileAtPosition: (p) => HexTopology.hasTile(p, 2),
      getObstructionAtPosition: (p) => { if (occupants.has(`${p.q},${p.r}`)) return {}; return null; },
    };
    expect(HexAttackGeometry.getPushDestination(fakeBoard, { q: 2, r: 2 }, { q: 3, r: 2 })).to.deep.equal({ q: 4, r: 2 });
    occupants.add('4,2');
    expect(HexAttackGeometry.getPushDestination(fakeBoard, { q: 2, r: 2 }, { q: 3, r: 2 })).to.equal(null);
    expect(HexAttackGeometry.getPushDestination(fakeBoard, { q: 2, r: 2 }, { q: 3, r: 3 })).to.equal(null);
  });

  it('NON_V2: version 1 ranged attackers are not restricted to hex axes', () => {
    session.setRuleset('practice-sandbox-hex', 1);
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const offAxis = addUnit(session.getPlayer2Id(), { q: 5, r: 2 });
    flush();
    expect(valid(offAxis)).to.equal(true);
  });

  it('NON_V2: version 1 keeps the single-target area stat behaviour', () => {
    session.setRuleset('practice-sandbox-hex', 1);
    attacker.setReach(3);
    attacker.setAttackType('area');
    const a = addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const b = addUnit(session.getPlayer2Id(), { q: 5, r: 1 });
    const bHp = b.getHP();
    flush();
    session.executeAction(attacker.actionAttack(a));
    expect(b.getHP()).to.equal(bHp);
  });
});
