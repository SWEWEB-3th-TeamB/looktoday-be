const Sequelize = require('sequelize');

class Image extends Sequelize.Model {
    static initiate(sequelize) {
        Image.init({
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            imageUrl: {
                type: Sequelize.STRING(2000),
                allowNull: false,
            },
        }, {
            sequelize,
            timestamps: true,
            underscored: true,
            modelName: 'Image',
            tableName: 'images',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        db.Image.belongsTo(db.Post, { foreignKey: 'looktoday_id', targetKey: 'looktodayId' });
    }
}

module.exports = Image;