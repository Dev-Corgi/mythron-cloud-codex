# Canonical topology for the practice-sandbox-hex ruleset. The rendered board
# uses five horizontal pointy-top rows, with odd rows shifted half a cell right.
# Axial positions remain the values stored in game state.
HEX_TOPOLOGY = {}

HEX_TOPOLOGY.neighborDeltas = [
  {q: 1, r: 0}
  {q: -1, r: 0}
  {q: 0, r: 1}
  {q: 0, r: -1}
  {q: 1, r: -1}
  {q: -1, r: 1}
]

HEX_TOPOLOGY.rowLengths = [9, 8, 9, 8, 9]
HEX_TOPOLOGY.version2Holes = [
  {q: 2, r: 0} # (row, column) (0, 2)
  {q: 4, r: 4} # (row, column) (4, 6)
]
HEX_TOPOLOGY.version2WallPositions = [
  {q: 1, r: 0} # (row, column) (0, 1)
  {q: 6, r: 0} # (row, column) (0, 6)
  {q: 3, r: 1} # (row, column) (1, 3)
  {q: 1, r: 2} # (row, column) (2, 2)
  {q: 5, r: 2} # (row, column) (2, 6)
  {q: 7, r: 2} # (row, column) (2, 8)
  {q: 3, r: 3} # (row, column) (3, 4)
  {q: 0, r: 4} # (row, column) (4, 2)
  {q: 5, r: 4} # (row, column) (4, 7)
]

HEX_TOPOLOGY.isAxialPosition = (position) ->
  return position? and Number.isInteger(position.q) and Number.isInteger(position.r)

HEX_TOPOLOGY.renderedToAxial = (c, k) ->
  return null unless Number.isInteger(c) and Number.isInteger(k)
  return null unless k >= 0 and k < HEX_TOPOLOGY.rowLengths.length and c >= 0 and c < HEX_TOPOLOGY.rowLengths[k]
  return {q: c - Math.floor(k / 2), r: k}

HEX_TOPOLOGY.axialToRendered = (position) ->
  return null unless HEX_TOPOLOGY.isAxialPosition(position)
  c = position.q + Math.floor(position.r / 2)
  return {c: c, k: position.r}

HEX_TOPOLOGY.isOnBoard = (position) ->
  return false unless HEX_TOPOLOGY.isAxialPosition(position)
  rendered = HEX_TOPOLOGY.axialToRendered(position)
  return rendered? and rendered.k >= 0 and rendered.k < HEX_TOPOLOGY.rowLengths.length and rendered.c >= 0 and rendered.c < HEX_TOPOLOGY.rowLengths[rendered.k]

HEX_TOPOLOGY.getPositions = () ->
  positions = []
  for k in [0...HEX_TOPOLOGY.rowLengths.length]
    rowLength = HEX_TOPOLOGY.rowLengths[k]
    for c in [0...rowLength]
      positions.push(HEX_TOPOLOGY.renderedToAxial(c, k))
  return positions

HEX_TOPOLOGY.hasTile = (position, rulesetVersion=1) ->
  return false unless HEX_TOPOLOGY.isOnBoard(position)
  return true if rulesetVersion is 1
  return false unless rulesetVersion is 2
  return !HEX_TOPOLOGY.version2Holes.some((hole) -> hole.q is position.q and hole.r is position.r)

HEX_TOPOLOGY.getTilePositions = (rulesetVersion=1) ->
  return (position for position in HEX_TOPOLOGY.getPositions() when HEX_TOPOLOGY.hasTile(position, rulesetVersion))

HEX_TOPOLOGY.getNeighbors = (position) ->
  return [] unless HEX_TOPOLOGY.isAxialPosition(position)
  return ({q: position.q + delta.q, r: position.r + delta.r} for delta in HEX_TOPOLOGY.neighborDeltas)

HEX_TOPOLOGY.getDistance = (a, b) ->
  return null unless HEX_TOPOLOGY.isAxialPosition(a) and HEX_TOPOLOGY.isAxialPosition(b)
  dq = a.q - b.q
  dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2

HEX_TOPOLOGY.getPositionsInRange = (position, radius, isLegalPosition) ->
  return [] unless HEX_TOPOLOGY.isAxialPosition(position) and Number.isInteger(radius) and radius >= 0
  positions = []
  for dq in [-radius..radius]
    minDr = Math.max(-radius, -dq - radius)
    maxDr = Math.min(radius, -dq + radius)
    for dr in [minDr..maxDr]
      candidate = {q: position.q + dq, r: position.r + dr}
      if (!isLegalPosition? or isLegalPosition(candidate)) then positions.push(candidate)
  return positions

HEX_TOPOLOGY.getLine = (start, finish) ->
  return [] unless HEX_TOPOLOGY.isAxialPosition(start) and HEX_TOPOLOGY.isAxialPosition(finish)
  distance = HEX_TOPOLOGY.getDistance(start, finish)
  return [] if distance == 0
  positions = []
  for i in [1..distance]
    t = i / distance
    q = start.q + (finish.q - start.q) * t
    r = start.r + (finish.r - start.r) * t
    # Round in cube coordinates so the returned cells follow a shortest hex line.
    x = q
    z = r
    y = -x - z
    rx = Math.round(x)
    ry = Math.round(y)
    rz = Math.round(z)
    xDiff = Math.abs(rx - x)
    yDiff = Math.abs(ry - y)
    zDiff = Math.abs(rz - z)
    if xDiff > yDiff and xDiff > zDiff then rx = -ry - rz
    else if yDiff > zDiff then ry = -rx - rz
    else rz = -rx - ry
    positions.push({q: rx, r: rz})
  return positions

module.exports = HEX_TOPOLOGY
