const Sequelize = require('sequelize');
const sequelize = require('../config/config');  // config.js에서 만든 인스턴스

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Image = require('./image');
db.Image.initiate(sequelize);

db.User = require('./user');
db.User.initiate(sequelize);

db.Post = require('./post');
db.Post.initiate(sequelize);

if (db.Post.associate) db.Post.associate(db);
if (db.Image.associate) db.Image.associate(db);
if (db.User.associate) db.User.associate(db);

module.exports = db;