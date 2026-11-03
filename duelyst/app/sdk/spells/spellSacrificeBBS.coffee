SpellKillTarget = require './spellKillTarget'
DamageAction = require 'app/sdk/actions/damageAction'
Cards = require 'app/sdk/cards/cardsLookupComplete'

class SpellSacrificeBBS extends SpellKillTarget

  getGeneralDamageAmount: (sourceAction) ->
    damageAmount = 2
    if Cards.getNonPrismaticCardId(@getId()) is Cards.Spell.SacrificeBBS and sourceAction?.getIsGeneralAbility?() and sourceAction.getIsGeneralAbility() and @getGameSession().getIsPracticeSandboxV2()
      damageAmount *= @getGameSession().getRulesetConfig().bloodboundSpellEffectScale
    return damageAmount

  onApplyEffectToBoardTile: (board,x,y,sourceAction) ->

    super(board,x,y,sourceAction)

    general = @getGameSession().getGeneralForPlayerId(@getOwnerId())
    damageAction = new DamageAction(this.getGameSession())
    damageAction.setOwnerId(@getOwnerId())
    damageAction.setTarget(general)
    damageAction.setDamageAmount(@getGeneralDamageAmount(sourceAction))
    @getGameSession().executeAction(damageAction)

    return true

module.exports = SpellSacrificeBBS
