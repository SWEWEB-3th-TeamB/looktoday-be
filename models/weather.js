const Sequelize = require('sequelize');

class Weather extends Sequelize.Model {
    static initiate(sequelize) {
        Weather.init({
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            // ERD에 'Field'라고만 나와있어 임의로 'description'으로 이름 짓고 문자열로 설정했습니다.
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
        db.Weather.belongsTo(db.Post, { 
            foreignKey: {
                name: 'looktoday_id',
                type: Sequelize.INTEGER 
            }, 
            targetKey: 'looktoday_id' 
        });
    }
}

module.exports = Weather;