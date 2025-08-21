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

db.Like = require('./like');
db.Like.initiate(sequelize);

db.Weather = require('./weather');
db.Weather.initiate(sequelize);

db.Post.associate(db);
db.Image.associate(db); 
db.User.associate(db);
db.Like.associate(db);
db.Weather.associate(db);

module.exports = db;
