CONFIG = require 'app/common/config'
Modifier = require './modifier'
i18next = require 'i18next'

# Keyworded like ModifierFlying; deliberately not a subclass so that Flying class checks
# (hasModifierClass / hasActiveModifierClass with ModifierFlying) never match a Phase unit.
# Passing through enemy units is decided in movementRange.
class ModifierPhasing extends Modifier

  type: "ModifierPhasing"
  @type: "ModifierPhasing"

  @isKeyworded: true
  @modifierName: i18next.t("modifiers.phasing_name")
  @description: null
  @keywordDefinition: i18next.t("modifiers.phasing_def")

  maxStacks: 1

  attributeBuffs:
    speed: CONFIG.SPEED_INFINITE

  fxResource: ["FX.Modifiers.ModifierPhasing"]

  getIsAllowedToBeActiveForCache: () ->
    return super() and @getGameSession().getIsPracticeSandboxV2()

module.exports = ModifierPhasing
