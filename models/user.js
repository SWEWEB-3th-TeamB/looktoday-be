const Sequelize = require('sequelize');
const { DataTypes } = require('sequelize');

class User extends Sequelize.Model {
    static initiate(sequelize) {
        User.init({
            //사용자 식별 번호
            user_id: {
                            type: Sequelize.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        },
            //이메일
            email: {
                type: Sequelize.STRING(40),
                allowNull: true,
                unique: true, //고유해야 함
                validate: {
                    isEmail: true //이메일 형식 검사
                }
            },
            //비밀번호
            password: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            //닉네임
            nickname: {
                type: Sequelize.STRING(15),
                allowNull:false,
                unique:true //고유해야 함
            },
            //생년월일
            dateOfBirth: {
                type: DataTypes.DATE,
                allowNull:false
            },
            //시/도
            si: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            //군/구
            gungu: {
                type: Sequelize.STRING(20),
                allowNull: false
            },                              
        }, {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'User',
            tableName: 'users', //DB 테이블 이름
            paranoid: true,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
        
    }
    static associate(db) {
        db.User.hasMany(db.Post, { foreignKey: 'user_id', sourceKey: 'user_id' });
        db.User.hasMany(db.Like, { foreignKey: 'user_id', sourceKey: 'user_id' });
    }
}

module.exports = User;
