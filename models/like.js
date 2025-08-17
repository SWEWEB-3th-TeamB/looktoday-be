const Sequelize = require('sequelize');

class Like extends Sequelize.Model {
    static initiate(sequelize) {
        Like.init({
            id: {
                type: Sequelize.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            // user_id: { // User를 참조하는 외래 키
            //     type: Sequelize.INTEGER,
            //     allowNull: false,
            //     references: {
            //         model: 'users',
            //         key: 'user_id',
            //     }
            // },
            // looktoday_id: { // Post를 참조하는 외래 키
            //     type: Sequelize.INTEGER,
            //     allowNull: false,
            //     references: {
            //         model: 'posts',
            //         key: 'looktoday_id',
            //     }
            // }
        }, {
            sequelize,
            timestamps: true, // 생성/수정 시각 자동 기록
            underscored: true,
            modelName: 'Like',
            tableName: 'likes',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        // Like는 User에 속해있습니다. (user_id 외래 키 생성)
        db.Like.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'user_id' });
        // Like는 Post에 속해있습니다. (looktoday_id 외래 키 생성)
        db.Like.belongsTo(db.Post, { foreignKey: 'looktoday_id', targetKey: 'looktoday_id' });
    }
}

module.exports = Like;