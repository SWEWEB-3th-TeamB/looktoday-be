const Sequelize = require('sequelize');

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
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { // 참조
                    model: 'users',
                    key: 'id'
                }
            },
            //사용자가 작성한 룩투데이 게시글 수
            post_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            // 날짜만
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false, 
                defaultValue: Sequelize.literal('CURRENT_DATE') // 현재 날짜 자동 저장
            },
            // api 통해서 받아올 수 있는 날씨 예보 시간
            hour: {
                type: Sequelize.ENUM('2', '5', '8', '11', '14', '17', '20', '23'),
                allowNull: false
            },

            // 지역(시/도)
            sido: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            // 지역(군/구)
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
            /* weather: {
                type: Sequelize.ENUM('sunny', 'cloudy', 'rainy', 'snowy'),
                allowNull: false
            }, */
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
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        // Post 모델은 User 모델에 속해있음
        db.Post.belongsTo(db.User, { foreignKey: 'id', targetKey: 'id' });
        // Post 모델과 Image 모델은 1:1 관계
        db.Post.hasOne(db.Image, { foreignKey: 'looktoday_id', sourceKey: 'looktoday_id' });
    }
}

module.exports = Post;