const Sequelize = require('sequelize');
const { all } = require('../routes/lookPost');

class Image extends Sequelize.Model {
    static initiate(sequelize) {
    return Image.init({
            // 이미지 식별번호
            image_id: {
                type: Sequelize.BIGINT,
                allowNull: false, 
                autoIncrement: true,
                primaryKey: true
            },
            // 이미지 url
            imageUrl: {
                type: Sequelize.STRING(1000),
                allowNull: false
            },
            // 룩투데이 식별번호
            looktoday_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: {
                    model: 'Posts',
                    key: 'looktoday_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            }
        }, {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Image',
            tableName: 'Images', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }
    /* static associate(db) {
        db.Image.belongsTo(db.Post, { foreignKey: 'looktoday_id', targetKey: 'looktoday_id' });
        db.Image.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'id' });
    } */
}

module.exports = Image;