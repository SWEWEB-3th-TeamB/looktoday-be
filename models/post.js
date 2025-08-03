const Sequelize = require('sequelize');
const { all } = require('../routes/lookPost');

class Post extends Sequelize.Model {
    static initiate(sequelize) {
        Post.init({
            //룩투데이 식별번호
            looktoday_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            //사용자 식별번호
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            // 날짜
            date: {
                type: Sequelize.DATE,
                allowNull: false, 
                defaultValue: Sequelize.NOW // 현재 시간 자동 저장
            },
            // Field
            si : {
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
                type: Sequelize.ENUM('low', 'medium', 'high'),
                allowNull: false
            },
            // 체감습도
            apparent_humidity: {
                type: Sequelize.ENUM('low', 'medium', 'high'),
                allowNull: false
            },
            // 날씨 아이콘
            weather: {
                type: Sequelize.ENUM('sunny', 'cloudy', 'rainy', 'snowy', 'windy'),
                allowNull: false
            },
            // 공개여부
            isPublic: {
                type: Sequelize.BOOLEAN,
                allowNull: false
            },
            // 코디 한 줄 평가
            comment: {
               type: Sequelize.STRING(40),
               allowNull: true
            }


        }, {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Post',
            tableName: 'Posts', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }
}                             

module.exports = Post;