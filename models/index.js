const Sequelize = require('sequelize');
const sequelize = require('../config/config');

const db = {};

const User = require('./user');
const Post = require('./post');
const Like = require('./like');
const Weather = require('./weather');
const Image = require('./image');

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = User;
db.Post = Post;
db.Like = Like;
db.Weather = Weather;
db.Image = Image;

User.initiate(sequelize);
Post.initiate(sequelize);
Like.initiate(sequelize);
Weather.initiate(sequelize);
Image.initiate(sequelize);

User.associate(db);
Post.associate(db);
Like.associate(db);
Weather.associate(db);
Image.associate(db);

module.exports = db;
