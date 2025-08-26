const Sequelize = require('sequelize');

class Weather extends Sequelize.Model {
    static initiate(sequelize) {
        Weather.init({
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            // 날씨 정보 저장
            description: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
        }, {
            sequelize,
            timestamps: false, // 생성/수정 시각 없음
            underscored: true,
            modelName: 'Weather',
            tableName: 'weather',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        db.Weather.hasMany(db.Post, { foreignKey: 'weather_id', sourceKey: 'id' });
    }
}

module.exports = Weather;