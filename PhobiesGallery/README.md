# Phobies Card Gallery

A small static local site for browsing Phobies cards. No package install or build step is required: open `index.html` in a browser.

## What it includes

- Search by card name or ability text
- Filter by rarity, key cost, and movement type
- Sort by name, key cost, or health
- Change the displayed level from 1 to 20. Level-scaled stats use the game's +3% per-level rule; movement, range, cooldown, and duration stay fixed.
- Links to each card's Phobies Wiki page

## Data note

The bundled dataset contains 158 cards from the public v1.7 Phobies database. It does not include every card in the current game and may not reflect later balance changes. The database source is linked in the page footer. `cards-data.json` is the readable data source and `cards.js` is the browser-ready copy used by the page.
