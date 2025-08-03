const Sequelize = require('sequelize');

class Post extends Sequelize.Model {
    static initiate(sequelize) {
        Post.init({
            looktodayId: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            si: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            gungu: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            apparentTemp: {
                type: Sequelize.ENUM('VERY_COLD', 'COLD', 'MILD', 'HOT', 'VERY_HOT'),
                allowNull: false,
            },
            apparentHumidity: {
                type: Sequelize.ENUM('HIGH', 'MEDIUM', 'LOW'),
                allowNull: false,
            },
            weather: {
                type: Sequelize.ENUM('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'),
                allowNull: false,
            },
            isPublic: {
                type:Sequelize.BOOLEAN,
                allowNull:false,
                defaultValue: true,
            },
            comment: {
                type: Sequelize.STRING(40),
                allowNull:true,
            },
            }, {
                sequelize,
                timestamps: false,
                underscored: true,
                paranoid: false,
                modelName: 'Post',
                tableName: 'posts',
                charset: 'utf8mb4',
                collate: 'utf8mb4_general_ci',
        });
    }
    static associate(db) {
    db.Post.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'user_id' });

    db.Post.hasMany(db.Like, { foreignKey: 'looktoday_id', sourceKey: 'looktodayId' });
    db.Post.hasMany(db.Image, { foreignKey: 'looktoday_id', sourceKey: 'looktodayId' });
    db.Post.hasOne(db.Weather, { foreignKey: 'looktoday_id', sourceKey: 'looktodayId' });
    }  
}

module.exports = Post;