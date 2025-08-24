const Sequelize = require('sequelize');
const { all } = require('../routes/lookPost');

class Post extends Sequelize.Model {
    static initiate(sequelize) {
    return  Post.init({
            //룩투데이 식별번호
            looktoday_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            //사용자가 작성한 룩투데이 게시글 수
            post_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            //좋아요 수
            like_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            // Field
            sido: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            // Field2
            gungu: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            // 체감온도
            apparent_temp: {
                type: Sequelize.ENUM('무더워요', '더워요', '따뜻해요', '시원해요', '쌀쌀해요', '추워요'),
                allowNull: false
            },
            // 체감습도
            apparent_humidity: {
                type: Sequelize.ENUM('습해요', '괜찮아요', '건조해요'),
                allowNull: false
            },
            // 날씨 아이콘
            weather: {
                type: Sequelize.ENUM('sunny', 'cloudy', 'rainy', 'snowy'),
                allowNull: false
            },
            // 공개여부
            isPublic: {
                type: Sequelize.BOOLEAN,
                allowNull: false
            },
            // 코디 한 줄 평
            comment: {
               type: Sequelize.STRING(40),
               allowNull: true
            }

        }, {
            sequelize,
            timestamps: true,
            underscored: true,
            modelName: 'Post',
            tableName: 'posts', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
        db.Post.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'user_id' });
        db.Post.hasOne(db.Image, { foreignKey: 'looktoday_id', sourceKey: 'looktoday_id' });
    }
}

module.exports = Post;