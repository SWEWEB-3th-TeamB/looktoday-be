const Sequelize = require('sequelize');

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

// eunseo 주석처리, 수정 시작

// 아래가 원래 코드

            // 룩투데이 식별번호 (외래키)
            // looktoday_id: {
                //type: Sequelize.INTEGER,
                //allowNull: true, // POST 생성 후 id 업데이트하므로 null값 허용
                //defaultValue: null,
                //references: { // 참조 
                   /// model: 'Posts',
                   // key: 'looktoday_id'
                //},
                //onUpdate: 'CASCADE',
                //onDelete: 'CASCADE'
            //}

// eunseo 추가 코드

            looktoday_id: {
                type: Sequelize.INTEGER,
                allowNull: true, // POST 생성 후 id 업데이트하므로 null값 허용

                defaultValue: null,
                 references: { // 참조 
                    model: 'posts',
                    key: 'looktoday_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE' 

            }


// eunseo 주석처리, 수정 끝

        }, {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Image',
            tableName: 'images', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }
    static associate(db) {
        // Image 모델은 Post 모델에 속해있음
        db.Image.belongsTo(db.Post, { foreignKey: 'looktoday_id', targetKey: 'looktoday_id' });
    }
}

module.exports = Image;
