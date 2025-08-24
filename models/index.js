// models/index.js
const Sequelize = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = require('../config/config');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Image = require('./image');
db.Image.initiate(sequelize);

db.User = require('./user');
db.User.initiate(sequelize);

db.Post = require('./post');
db.Post.initiate(sequelize);

// db.Post.associate(db);
// db.Image.associate(db); 
// db.User.associate(db);
// ★ 반드시 등록
db.Weather = require('./weather')(sequelize, Sequelize.DataTypes);

module.exports = db;
