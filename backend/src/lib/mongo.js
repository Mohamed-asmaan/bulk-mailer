const mongoose = require("mongoose");

function credentialsDb() {
  const override = process.env.MONGO_DB_NAME?.trim();
  if (override) {
    return mongoose.connection.useDb(override).db;
  }
  return mongoose.connection.db;
}

module.exports = { credentialsDb };
