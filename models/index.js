const Sequelize = require('sequelize');
const sequelize = require('../config/config');  // config.js에서 만든 인스턴스

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user');
db.User.initiate(sequelize);

module.exports = db;
