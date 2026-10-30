exports.up = function (knex) {
  return knex.schema.table('user_decks', (table) => {
    table.string('purpose', 16).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('user_decks', (table) => {
    table.dropColumn('purpose');
  });
};
