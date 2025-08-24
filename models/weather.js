// models/weather.js
const Sequelize = require('sequelize');

class Weather extends Sequelize.Model {
  static initiate(sequelize) {
    Weather.init({
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },

      // 위치/격자
      lat: { type: Sequelize.DECIMAL(10, 6), allowNull: false },
      lon: { type: Sequelize.DECIMAL(10, 6), allowNull: false },
      nx:  { type: Sequelize.INTEGER, allowNull: false },
      ny:  { type: Sequelize.INTEGER, allowNull: false },

      // 스냅샷 기준 시작 시각(UTC/KST 중 택1) — 권장: UTC 정각
      hourStart: { type: Sequelize.DATE, allowNull: false },

      // 날씨 값
      temperature:               { type: Sequelize.DECIMAL(4,1), allowNull: true },
      feels_like:                { type: Sequelize.DECIMAL(4,1), allowNull: true },
      humidity:                  { type: Sequelize.INTEGER,      allowNull: true },
      precipitation_amount:      { type: Sequelize.DECIMAL(5,1), allowNull: true },
      precipitation_probability: { type: Sequelize.INTEGER,      allowNull: true },
      wind_speed:                { type: Sequelize.DECIMAL(4,1), allowNull: true },
      wind_direction:            { type: Sequelize.INTEGER,      allowNull: true },
      weather_condition:         { type: Sequelize.STRING(30),   allowNull: true },

      // 일출/일몰(로컬 HH:MM)
      sunrise:            { type: Sequelize.STRING(5), allowNull: true },
      sunset:             { type: Sequelize.STRING(5), allowNull: true },
      civilTwilightBegin: { type: Sequelize.STRING(5), allowNull: true },
      civilTwilightEnd:   { type: Sequelize.STRING(5), allowNull: true },

      // 원본 수집 시각/출처
      fetchedAt: { type: Sequelize.DATE,        allowNull: false },
      source:    { type: Sequelize.STRING(100), allowNull: true }, // 예: 'KMA+sunrise-sunset.org'

      // 게시글 연결 + 설명 (기존 HEAD 요구 반영)
      looktoday_id: { type: Sequelize.BIGINT, allowNull: true },
      description:  { type: Sequelize.STRING(100), allowNull: true },
    }, {
      sequelize,
      modelName: 'Weather',
      tableName: 'weather_snapshots', // 스냅샷 테이블명 유지
      timestamps: false,
      underscored: true,
      paranoid: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_general_ci',
      indexes: [
        // 같은 격자(nx,ny)의 같은 시간대(hourStart)는 1건만 저장
        { unique: true, fields: ['nx', 'ny', 'hourStart'] },
        { fields: ['hourStart'] },
      ],
    });
  }

  static associate(db) {
    // Weather 스냅샷을 특정 게시글(looktoday_id)과 연결 가능하게
    db.Weather.belongsTo(db.Post, {
      foreignKey: 'looktoday_id',
      targetKey: 'looktodayId',
    });
  }
}

module.exports = Weather;