const fs = require('fs');
const path = require('path');
const vm = require('vm');
const espree = require('espree');
const coffee = require('coffeescript');
const Promise = require('bluebird');
const { expect } = require('chai');

function productionFunction(file, name, globals, compile = false) {
  const source = fs.readFileSync(path.join(__dirname, '../../../', file), 'utf8');
  const js = compile ? coffee.compile(source, { bare: true }) : source;
  const tree = espree.parse(js, { ecmaVersion: 2020, range: true });
  let found;
  let method;
  function visit(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'MethodDefinition' && node.key.name === name) method = node.value;
    if (node.type === 'Property' && node.key.name === name && node.method) method = node.value;
    else if (node.type === 'Property' && node.key.name === name) found = node.value;
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.property.name === name) found = node.right;
    Object.keys(node).forEach((key) => {
      if (key === 'range') return;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    });
  }
  visit(tree);
  if (method) {
    const parameters = method.params.map((parameter) => js.slice(parameter.range[0], parameter.range[1])).join(', ');
    return vm.runInNewContext(`(function(${parameters}) ${js.slice(method.body.range[0], method.body.range[1])})`, globals);
  }
  if (!found) throw new Error(`Missing production function: ${name}`);
  return vm.runInNewContext(`(${js.slice(found.range[0], found.range[1])})`, globals);
}

class ViewStub {
  constructor() {
    this.listenTo = () => {};
    this.on = () => {};
    this.off = () => {};
    this.setConfirmButtonVisibility = () => {};
  }
}

describe('New-rules UI entry and confirmation', () => {
  it('uses canonical v2 targets for board hover and click, including enemy-over-Wall and Wall-under-ally priority', () => {
    const click = productionFunction('app/view/layers/game/GameLayer.js', '_actionSelectedCardOnBoard', {
      SDK: { GameSession: { getInstance: () => session } },
      getActionPositionArgs: (position) => position,
    });
    const hover = productionFunction('app/view/layers/game/GameLayer.js', 'updateMouseCursor', {
      SDK: { GameSession: { current: () => session, getInstance: () => session } },
      EVENTS: { canvas_mouse_state: 'cursor' },
    });
    const board = {};
    const position = { q: 4, r: 3 };
    const session = { getBoard: () => board, getRulesetId: () => 'practice-sandbox-hex', getRulesetVersion: () => 2, getIsSpectateMode: () => false };

    for (const scenario of [
      { name: 'enemy Unit priority', resolvedKind: 'enemy', mouseKind: 'wall' },
      { name: 'Wall under an allied occupant', resolvedKind: 'wall', mouseKind: 'ally' },
    ]) {
      const targets = {
        enemy: { kind: 'enemy', getIsActive: () => true, getIsSameTeamAs: () => false },
        wall: { kind: 'wall', getIsActive: () => true, getIsSameTeamAs: () => false },
        ally: { kind: 'ally', getIsActive: () => true, getIsSameTeamAs: () => false },
      };
      let validatedTarget;
      let clickedPosition;
      const selected = {
        getAttackRange: () => ({
          getTargetAtPosition: (actualBoard, entity, actualPosition) => {
            expect(actualBoard).to.equal(board);
            expect(actualPosition).to.equal(position);
            return targets[scenario.resolvedKind];
          },
          getIsValidTarget: (actualBoard, entity, target) => { validatedTarget = target; return true; },
        }),
        getIsSameTeamAs: () => false,
        actionAttackEntityAtPosition: (actualPosition) => { clickedPosition = actualPosition; return { target: targets[scenario.resolvedKind] }; },
        getCanMove: () => false,
      };
      const mouseTarget = targets[scenario.mouseKind];
      const action = click.call({ _player: { getMouseBoardPosition: () => position } }, { getSdkCard: () => selected }, { getSdkCard: () => mouseTarget });
      expect(validatedTarget, scenario.name).to.equal(targets[scenario.resolvedKind]);
      expect(clickedPosition, scenario.name).to.equal(position);
      expect(action.target, scenario.name).to.equal(targets[scenario.resolvedKind]);

      const player = {
        getIsMouseOnBoard: () => true, getHoverChanged: () => true, getMouseBoardPosition: () => position,
        getSelectedCard: () => null, getMouseOverSdkCard: () => null, getMouseOverSdkEntity: () => mouseTarget,
        getFollowupCard: () => null, getMouseOverArtifactNode: () => null, getMouseOverReplaceNode: () => null,
        getSelectedSdkEntity: () => selected, getMouseDragging: () => false,
      };
      let cursorState;
      const layer = {
        _player: player, _battleLog: { getMouseOverBattleLogNode: () => null },
        getIsGameOver: () => false, getPlayerSelectionLocked: () => false, getIsActive: () => true,
        updateMouseCursorByState: (state) => { cursorState = state; },
      };
      hover.call(layer, false);
      expect(validatedTarget, scenario.name).to.equal(targets[scenario.resolvedKind]);
      expect(cursorState, scenario.name).to.equal('attack');
    }
  });

  describe('Practice UI caller paths', () => {
    it('passes the selected saved ID through the selection event into the serialized Practice request', () => {
      const noop = () => {};
      const pending = new Promise(() => {});
      const instance = (value) => ({ getInstance: () => value });
      const logger = { module: () => ({ log: noop }) };
      let body;
      const app = {};
      const globals = {
        App: app,
        Promise,
        ChatManager: instance({ getStatusIsInBattle: () => false, setStatus: noop }),
        Analytics: { page: noop },
        Logger: logger,
        SDK: { GameType: { SinglePlayer: 'practice' }, GameSession: { getCardCaches: () => ({ getCardById: () => ({ getName: () => 'Opponent' }) }) } },
        InventoryManager: instance({ hasAnyBattleMapCosmetics: () => false }),
        $: { ajax: (options) => { body = JSON.parse(options.data); return { done: noop, fail: noop }; } },
        process: { env: { API_URL: '' } },
        FindingGameItemView: ViewStub,
        Backbone: { Model: ViewStub },
        Scene: instance({ showContentByClass: () => pending, showFindingGame: () => pending }),
        PlayLayer: ViewStub,
        NavigationManager: instance({ showContentView: () => pending, showUtilityView: () => pending }),
        UtilityMatchmakingMenuItemView: ViewStub,
        ProfileManager: instance({ profile: {} }),
      };
      app._startSinglePlayerGame = productionFunction('app/application.coffee', '_startSinglePlayerGame', globals, true);
      const selection = productionFunction('app/ui/views/composite/deck_select_single_player.js', 'onConfirmSelection', {
        process: { env: {} },
        EventBus: instance({ trigger: (event, ...args) => app._startSinglePlayerGame(...args) }),
        UtilsJavascript: { deepCopy: (value) => JSON.parse(JSON.stringify(value)) },
        ProfileManager: instance({ get: () => null }),
        audio_engine: { current: () => ({ play_effect_for_interaction: noop }) },
        RSX: { sfx_ui_confirm: { audio: 'confirm' } },
        CONFIG: {},
      });
      const saved = { id: 'owned-practice-deck', cards: [{ id: 1 }], faction_id: 1 };
      selection.call({
        _selectedDeckModel: { get: (key) => saved[key] },
        _selectedOpponentId: 23,
        ui: { $deckSelectConfirm: { addClass: noop } },
        getConfirmSelectionEvent: () => 'start_single_player',
      });
      expect(body.deck_id).to.equal(saved.id);
      expect(body).not.to.have.property('deck');
      expect(body.ai_general_id).to.equal(23);
      app._singlePlayerGamePromise.cancel();
    });

    function chooser() {
      let reveal;
      const revealPromise = new Promise((resolve) => { reveal = resolve; });
      const submissions = [];
      const current = {
        getRulesetId: () => 'practice-sandbox-hex',
        getIsSpectateMode: () => false,
        getEventBus: () => ({}),
        getGameType: () => 'sandbox',
        getMyPlayer: () => ({ actionDrawStartingHand: (indices) => ({ indices }) }),
        submitExplicitAction: (action) => { submissions.push(action); return true; },
      };
      let selectedSession = current;
      const layer = { showChooseHand: () => revealPromise, getMulliganIndices: () => [], showSubmitChosenHand: () => {} };
      const globals = {
        Promise,
        Logger: { module: () => ({ log: () => {} }) },
        SDK: { GameSession: { getInstance: () => selectedSession, current: () => selectedSession }, GameType: { isNetworkGameType: () => false } },
        Scene: { getInstance: () => ({ getGameLayer: () => layer }) },
        GameChooseHandItemView: ViewStub,
        Backbone: { Model: ViewStub },
        CONFIG: {},
        EVENTS: { action: 'action' },
      };
      const layout = {
        isDestroyed: false,
        middleRegion: { show: () => Promise.resolve(), empty: () => {} },
        listenTo: () => {},
      };
      layout.showSubmitChosenHand = productionFunction('app/ui/views/layouts/game.js', 'showSubmitChosenHand', globals);
      layout.showChooseHand = productionFunction('app/ui/views/layouts/game.js', 'showChooseHand', globals);
      return {
        layout, reveal, submissions, changeSession: () => { selectedSession = {}; },
      };
    }

    it('submits exactly one empty starting-hand confirmation after the fixed-hand reveal', async () => {
      const fixture = chooser();
      const shown = fixture.layout.showChooseHand();
      expect(fixture.submissions).to.have.length(0);
      fixture.reveal();
      await shown;
      expect(fixture.submissions).to.have.length(1);
      expect(fixture.submissions[0].indices).to.deep.equal([]);
      expect(fixture.layout.chooseHandView).to.equal(null);
    });

    ['destroyed', 'replaced', 'session-changed'].forEach((condition) => {
      it(`suppresses automatic confirmation when the chooser is ${condition}`, async () => {
        const fixture = chooser();
        const shown = fixture.layout.showChooseHand();
        if (condition === 'destroyed') fixture.layout.isDestroyed = true;
        if (condition === 'replaced') fixture.layout.chooseHandView = {};
        if (condition === 'session-changed') fixture.changeSession();
        fixture.reveal();
        await shown;
        expect(fixture.submissions).to.have.length(0);
      });
    });
  });

  describe('purpose-specific deck selection regressions', () => {
    const sandboxFile = 'app/ui/views/composite/deck_select_sandbox.js';
    const baseFile = 'app/ui/views/composite/deck_select.js';
    const ids = [1, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    function deck(id, purpose = 'sandbox', valid = true) {
      const data = { id, purpose, cards: ids.map((cardId) => ({ id: cardId })) };
      return {
        get: (key) => data[key], getPurpose: () => purpose, isValid: () => valid, toJSON: () => data,
      };
    }
    function sandboxFixture(developer = false) {
      const config = {};
      const events = [];
      const globals = {
        CONFIG: config,
        VirtualCollection: function VirtualCollection() {},
        SDK: {
          CardEligibility: { validateSavedDeck: (data) => ({ valid: data.purpose === 'sandbox' && data.cards.length === 9 }) }, Sandbox: { type: 'Sandbox' }, SandboxDeveloper: { type: 'SandboxDeveloper' }, ChallengeFactory: { challengeForType: (type) => ({ type, setPlayer1DeckData: (data) => events.push(data), setPlayer2DeckData: (data) => events.push(data) }) },
        },
        audio_engine: { current: () => ({ play_effect_for_interaction: () => {} }) },
        RSX: { sfx_ui_confirm: {}, sfx_ui_error: {} },
        UtilsJavascript: { deepCopy: (data) => JSON.parse(JSON.stringify(data)) },
        ProfileManager: { getInstance: () => ({ get: () => null }) },
        EventBus: { getInstance: () => ({ trigger: (name, challenge) => events.push(challenge) }) },
        EVENTS: { start_challenge: 'start' },
      };
      const view = {
        model: { get: () => developer },
        selectedDeckGroup: 'custom',
        filterDeckColorCode: 0,
        filterDeckFaction: 0,
        requiredDeckPurpose: developer ? 'legacy' : 'sandbox',
        ui: {},
        _showSelectDeckWarningPopover: () => events.push('warning'),
      };
      view.filterDecks = productionFunction(baseFile, 'filterDecks', {});
      ['_canUseDeck', 'setStartingSelectedDeckModel', 'onConfirmSelection'].forEach((name) => { view[name] = productionFunction(sandboxFile, name, globals); });
      return { view, config, events };
    }
    for (const invalid of [deck('legacy', 'legacy'), deck('practice', 'practice'), deck('invalid', 'sandbox', false)]) {
      it(`clears cached ${invalid.get('id')} decks on either side before restoring or confirming`, () => {
        for (const side of [1, 2]) {
          const fixture = sandboxFixture();
          fixture.config.lastSelectedSandboxPlayer1DeckId = side === 1 ? invalid.get('id') : 'valid';
          fixture.config.lastSelectedSandboxPlayer2DeckId = side === 2 ? invalid.get('id') : 'valid';
          fixture.view.collection = [invalid, deck('valid')];
          fixture.view.setStartingSelectedDeckModel();
          expect(fixture.view[`_selectedDeckModelPlayer${side}`]).to.equal(null);
          expect(fixture.config[`lastSelectedSandboxPlayer${side}DeckId`]).to.equal(null);
          fixture.view[`_selectedDeckModelPlayer${side}`] = invalid;
          fixture.view.onConfirmSelection();
          expect(fixture.events).to.deep.equal(['warning']);
        }
      });
    }

    it('starts concrete Sandbox with two compatible saved descriptors', () => {
      const fixture = sandboxFixture();
      fixture.view.collection = [deck('one'), deck('two')];
      fixture.config.lastSelectedSandboxPlayer1DeckId = 'one';
      fixture.config.lastSelectedSandboxPlayer2DeckId = 'two';
      fixture.view.setStartingSelectedDeckModel();
      fixture.view.onConfirmSelection();
      expect(fixture.events[0].purpose).to.equal('sandbox');
      expect(fixture.events[1].purpose).to.equal('sandbox');
      expect(fixture.events[2].type).to.equal('Sandbox');
    });

    it('preserves Developer Sandbox cached legacy arrays', () => {
      const fixture = sandboxFixture(true);
      fixture.view.collection = [deck('legacy', 'legacy')];
      fixture.config.lastSelectedSandboxPlayer1DeckId = 'legacy';
      fixture.config.lastSelectedSandboxPlayer2DeckId = 'legacy';
      fixture.view.setStartingSelectedDeckModel();
      fixture.view.onConfirmSelection();
      expect(fixture.events[0]).to.be.an('array');
      expect(fixture.events[2].type).to.equal('SandboxDeveloper');
    });

    it('exposes all nine audited Practice generals without AI tools', () => {
      const generals = [1, 23, 51, 223, 254, 323, 401, 527, 558];
      const opponents = productionFunction('app/ui/views/composite/deck_select_single_player.js', 'getOpponents', {
        process: { env: {} },
        SDK: { CardEligibility: { getPracticeGeneralIds: () => generals }, GameSession: { getCardCaches: () => ({ getCardById: (id) => ({ getFactionId: () => 1, getName: () => `General ${id}`, getPortraitHexResource: () => ({ img: `${id}.png` }) }) }) } },
        GameDataManager: { getInstance: () => ({ visibleFactionsCollection: { get: () => ({ get: () => true }) } }) },
      }).call({ getRecommendedOpponentId: () => 23 });
      expect(opponents.map((opponent) => opponent.id)).to.deep.equal(generals);
      expect(opponents.find((opponent) => opponent.id === 23).recommended).to.equal(true);
    });

    it('shows saved nine-card instructions for each new purpose and keeps legacy empty views', () => {
      const legacy = {}; const standard = {}; const rift = {}; const
        arena = {};
      const getEmptyView = productionFunction(baseFile, 'getEmptyView', {
        DeckSelectPurposeEmptyView: { extend: (options) => options },
        DeckSelectEmptyView: legacy,
        DeckSelectEmptyViewStandard: standard,
        RiftDeckSelectEmptyView: rift,
        ArenaDeckSelectEmptyView: arena,
      });
      const handlebars = require('handlebars');
      const template = handlebars.compile(fs.readFileSync(path.join(__dirname, '../../../app/ui/templates/item/deck_select_purpose_empty.hbs'), 'utf8'));
      for (const purpose of ['practice', 'sandbox']) {
        const empty = getEmptyView.call({ requiredDeckPurpose: purpose });
        const html = template(empty.templateHelpers);
        expect(html).to.include(purpose === 'practice' ? 'Practice' : 'Sandbox');
        expect(html).to.include('save exactly nine cards');
        expect(html).to.include('one eligible general and eight eligible cards');
        expect(html).to.include('Open deck builder');
      }
      expect(getEmptyView.call({ requiredDeckPurpose: 'legacy' })).to.equal(legacy);
      expect(getEmptyView.call({ requiredDeckPurpose: 'legacy', filterLegacy: true })).to.equal(standard);
      expect(getEmptyView.call({ selectedDeckGroup: 'rift' })).to.equal(rift);
      expect(getEmptyView.call({ selectedDeckGroup: 'gauntlet' })).to.equal(arena);
      let navigated = false;
      productionFunction(baseFile, 'openDeckBuilder', { EventBus: { getInstance: () => ({ trigger: (event) => { navigated = event === 'collection'; } }) }, EVENTS: { show_collection: 'collection' } })();
      expect(navigated).to.equal(true);
    });
  });
});
