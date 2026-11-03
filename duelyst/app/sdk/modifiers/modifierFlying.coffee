CONFIG =       require('app/common/config')
Modifier =   require './modifier'
i18next = require 'i18next'

class ModifierFlying extends Modifier

  type:"ModifierFlying"
  @type:"ModifierFlying"

  @isKeyworded: true
  @modifierName: i18next.t("modifiers.flying_name")
  @description: null
  @keywordDefinition: i18next.t("modifiers.flying_def")

  maxStacks: 1

  attributeBuffs:
    speed: CONFIG.SPEED_INFINITE

  constructor: (gameSession) ->
    super(gameSession)
    # Practice/Sandbox version 2: fly and phase only change what a unit may cross; the unit still
    # moves its movement distance stat, so the "move anywhere" speed grant does not apply.
    @attributeBuffs = null if gameSession?.getIsPracticeSandboxV2?()

  fxResource: ["FX.Modifiers.ModifierFlying"]

module.exports = ModifierFlying
