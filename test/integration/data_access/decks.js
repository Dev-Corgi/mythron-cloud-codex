const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const chai = require('chai');

const { expect } = chai;
const Promise = require('bluebird');
const sinon = require('sinon');
const _ = require('underscore');
const moment = require('moment');
const DuelystFirebase = require('../../../server/lib/duelyst_firebase_module.coffee');
const Errors = require('../../../server/lib/custom_errors.coffee');
const UsersModule = require('../../../server/lib/data_access/users.coffee');
const SyncModule = require('../../../server/lib/data_access/sync.coffee');
const DecksModule = require('../../../server/lib/data_access/decks.coffee');
const FirebasePromises = require('../../../server/lib/firebase_promises.coffee');
const config = require('../../../config/config');
const Logger = require('../../../app/common/logger.coffee');
const SDK = require('../../../app/sdk.coffee');
const knex = require('../../../server/lib/data_access/knex.coffee');

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && true;

describe('decks module', () => {
  let userId = null;

  // before cleanup to check if user already exists and delete
  before(function () {
    this.timeout(25000);
    Logger.module('UNITTEST').log('creating user');
    return UsersModule.createNewUser('unit-test@duelyst.local', 'unittest', 'hash', 'kumite14')
      .then((userIdCreated) => {
        Logger.module('UNITTEST').log('created user ', userIdCreated);
        userId = userIdCreated;
      }).catch(Errors.AlreadyExistsError, (error) => {
        Logger.module('UNITTEST').log('existing user');
        return UsersModule.userIdForEmail('unit-test@duelyst.local').then((userIdExisting) => {
          Logger.module('UNITTEST').log('existing user retrieved', userIdExisting);
          userId = userIdExisting;
          return SyncModule.wipeUserData(userIdExisting);
        }).then(() => {
          Logger.module('UNITTEST').log('existing user data wiped', userId);
        });
      });
  });

  // // after cleanup
  // after(function(){
  //   this.timeout(25000);
  //   return DuelystFirebase.connect().getRootRef()
  //   .bind({})
  //   .then(function(fbRootRef){
  //     this.fbRootRef = fbRootRef;
  //     if (userId)
  //       return clearUserData(userId,this.fbRootRef);
  //   });
  // });

  describe('addDeck()', () => {
    it('adds a deck and persists its purpose', () => DecksModule.addDeck(userId, SDK.Factions.Lyonar, 'lyonoobs', [1, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206], 0, 8, 0, 0, null, 'practice')
      .then(() => knex('user_decks').select().where('user_id', userId)).then((deckRows) => {
        expect(deckRows.length).to.equal(1);
        expect(deckRows[0].name).to.equal('lyonoobs');
        expect(deckRows[0].cards.length).to.equal(9);
        expect(deckRows[0].cards).to.contain(10979);
        expect(deckRows[0].purpose).to.equal('practice');
        expect(deckRows[0].minion_count).to.equal(8);
      }));
  });

  describe('updateDeck()', () => {
    it('updates a deck', () => knex('user_decks').first().where('user_id', userId)
      .then((deckRow) => DecksModule.updateDeck(userId, deckRow.id, SDK.Factions.Lyonar, 'lyonoobs 2', [23, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206], 0, 8, 0, 0, null, 'sandbox'))
      .then(() => knex('user_decks').select().where('user_id', userId))
      .then((deckRows) => {
        expect(deckRows.length).to.equal(1);
        expect(deckRows[0].name).to.equal('lyonoobs 2');
        expect(deckRows[0].cards.length).to.equal(9);
        expect(deckRows[0].cards).to.contain(23);
        expect(deckRows[0].purpose).to.equal('sandbox');
        expect(deckRows[0].minion_count).to.equal(8);
      }));
  });

  describe('hashCodeForDeck()', () => {
    it('generates a deck digest', () => {
      const digest = DecksModule.hashForDeck([SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser], '');
      expect(digest).to.exist;
    });

    it('generates two different digests based on salt', () => {
      const digest1 = DecksModule.hashForDeck([SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser], '2');
      const digest2 = DecksModule.hashForDeck([SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser, SDK.Cards.Faction1.Sunriser], '1');
      expect(digest1).to.not.equal(digest2);
    });
  });
});
