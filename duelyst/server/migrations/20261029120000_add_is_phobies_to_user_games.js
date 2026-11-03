exports.up = function (knex) {
  return knex.schema.table('user_games', (table) => {
    table.boolean('is_phobies');
  });
};

exports.down = function (knex) {
  return knex.schema.table('user_games', (table) => {
    table.dropColumn('is_phobies');
  });
};
