// models/weather_condition.js
const Sequelize = require('sequelize');

class Weather extends Sequelize.Model {
  static initiate(sequelize) {
    Weather.init(
      {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },
        si: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        gungu: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        date: {
          // YYYY-MM-DD
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        time: {
          // HH:MM:SS (정시 저장: HH:00:00)
          type: Sequelize.TIME,
          allowNull: false,
        },
        // 기상청 API 원본(items 전체)을 그대로 저장
        weather_info: {
          // MySQL 5.7+/MariaDB 10.2+면 JSON 사용 권장
          type: Sequelize.JSON,
          allowNull: false,
          // ⚠️ 만약 DB가 JSON 미지원이면 위 줄을 TEXT로 바꾸고 ↓ 주석 해제
          // type: Sequelize.TEXT('long'),
          // get() {
          //   const raw = this.getDataValue('weather_info');
          //   try { return JSON.parse(raw); } catch { return raw; }
          // },
          // set(val) {
          //   this.setDataValue('weather_info', JSON.stringify(val));
          // },
        },
        // 화면/로그용 요약 (선택)
        description: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Weather',          // ← models에서 { Weather }로 접근
        tableName: 'weather_condition',// ← 실제 테이블명
        timestamps: false,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci',
        indexes: [
          {
            unique: true,
            fields: ['si', 'gungu', 'date', 'time'], // 시간 슬롯 중복 방지
          },
        ],
      }
    );
  }

  static associate(db) {
    // 필요하면 연결 유지 (없으면 삭제해도 됨)
    if (db.Post) {
      db.Weather.hasMany(db.Post, {
        foreignKey: 'weather_id',
        sourceKey: 'id',
      });
    }
  }
}

module.exports = Weather;
