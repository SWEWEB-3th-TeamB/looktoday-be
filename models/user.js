const Sequelize = require('sequelize');
const { DataTypes } = require('sequelize');

class User extends Sequelize.Model {
    static initiate(sequelize) {
        User.init({
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
            //위치 (위도)
            latitude: {
                type: DataTypes.FLOAT,
                allowNull: false
            },

            //위치 (경도)
            longitude: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            //시/도
            city: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            //군/구
            district: {
                type: Sequelize.STRING(20),
                allowNull: false
            },

            //이메일 인증 코드
            verificationCode: {
                type: DataTypes.STRING,
                allowNull: false
            },
            //이메일 인증 여부
            isVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            //인증 코드 만료 시간
            verificationExpiresAt: { 
            type: DataTypes.DATE,
            allowNull: true 
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
}

module.exports = User;