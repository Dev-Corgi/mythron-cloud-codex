Modifier =            require './modifier'
CardType =         require 'app/sdk/cards/cardType'
CONFIG = require 'app/common/config'

i18next = require('i18next')

class ModifierRanged extends Modifier

  type:"ModifierRanged"
  @type:"ModifierRanged"

  @isKeyworded: true
  @keywordDefinition: i18next.t("modifiers.ranged_def")
  maxStacks: 1

  @modifierName:i18next.t("modifiers.ranged_name")
  @description: null

  constructor: (gameSession) ->
    super(gameSession)
    # In v2 Ranged defines delivery geometry only; reach remains the unit stat.
    @attributeBuffs = null if gameSession?.getIsPracticeSandboxV2?()

  attributeBuffs:
    reach: CONFIG.REACH_RANGED - CONFIG.REACH_MELEE

  fxResource: ["FX.Modifiers.ModifierRanged"]

module.exports = ModifierRanged
