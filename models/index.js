const Sequelize = require('sequelize');
const sequelize = require('../config/config');

const db = {};

const User = require('./user');
const Post = require('./post.js');
const Like = require('./like.js');
const Weather = require('./weather.js');
const Image = require('./image.js');

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = User;
db.Post = Post;
db.Like = Like;
db.Weather = Weather;
db.Image = Image;

Object.values(db).forEach(model => {
  if (model && typeof model.initiate === 'function') {
    model.initiate(sequelize);
  }
});

// 4. 모든 모델이 초기화된 후, associate 함수를 호출하여 관계를 설정합니다.
Object.values(db).forEach(model => {
  if (model && typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;