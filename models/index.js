const Sequelize = require('sequelize');
const sequelize = require('../config/config'); // 기존 인스턴스

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

/** 1) 모델 등록 */
db.User = require('./user');
db.Weather = require('./weather_condition');
db.Post = require('./post');
db.Like = require('./like');
db.Image = require('./image');

// 초단기실황 저장 테이블 (UltraNowcast 모델 파일 필요)
db.UltraNowcast = require('./ultraNowcast')(sequelize, Sequelize.DataTypes);

/** 2) initiate 호출 (클래스 내 정적 메서드 패턴 유지 시) */
if (db.User?.initiate) db.User.initiate(sequelize);
if (db.Weather?.initiate) db.Weather.initiate(sequelize);
if (db.Post?.initiate) db.Post.initiate(sequelize);
if (db.Like?.initiate) db.Like.initiate(sequelize);
if (db.Image?.initiate) db.Image.initiate(sequelize);

/** 3) associate 호출 (관계 연결) */
Object.keys(db).forEach((modelName) => {
  if (db[modelName]?.associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;