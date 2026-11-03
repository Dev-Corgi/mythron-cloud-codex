CardSet = require './cardSetLookup'

module.exports = (card) ->
  return card?.getCardSetId?() is CardSet.Phobies
