const { Sequelize, DataTypes } = require('sequelize');

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
            //사용자 식별번호 (외래 키)
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            //사용자가 작성한 룩투데이 게시글 수
            post_count: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            // 날짜만
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false, 
                defaultValue: Sequelize.NOW // 현재 날짜 자동 저장
            },
            // api 통해서 받아올 수 있는 날씨 예보 시간
            hour: { // 우선 문자열로 설정, 나중에 숫자로 바꿀 수도
                type: Sequelize.ENUM('0','1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                    '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'),

                allowNull: false
            },
            //좋아요 수
            like_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },

            // 지역(시/도)
            si: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            // 지역(군/구)
            gungu: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            // 온도 
            temperature: {
                 type: DataTypes.FLOAT,
                allowNull: true
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
            // 공개여부
            isPublic: {
                type: Sequelize.BOOLEAN,
                allowNull: false
            },
            // 코디 한 줄 평
            comment: {
               type: Sequelize.STRING(40),
               allowNull: true
            },
            // 날씨 Id
            weather_id: {
                type: Sequelize.BIGINT,
                allowNull: true
            }
        }, {
            sequelize,
            timestamps: true,
            underscored: true,
            modelName: 'Post',
            tableName: 'posts', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        // Post 모델은 User 모델에 속해있음 // eunseo 이미지 여러장 붙일 계획이면 hasMany 고려
        db.Post.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'user_id' });
        db.Post.hasOne(db.Image, { foreignKey: 'looktoday_id', sourceKey: 'looktoday_id' });
        db.Post.belongsTo(db.UltraNowcast, { foreignKey: 'weather_id', targetKey: 'id' });
        db.Post.hasOne(db.Like, { foreignKey: 'looktoday_id', sourceKey: 'looktoday_id' });
        db.Post.hasMany(db.Like, { foreignKey: 'looktoday_id', as: 'userLike' });
    }
}

module.exports = Post;
