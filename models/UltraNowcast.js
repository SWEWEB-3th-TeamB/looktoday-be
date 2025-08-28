// models/UltraNowcast.js
module.exports = (sequelize, DataTypes) => {
    const UltraNowcast = sequelize.define('UltraNowcast', {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      baseDate: { type: DataTypes.STRING(8), allowNull: false },   // YYYYMMDD
      baseTime: { type: DataTypes.STRING(4), allowNull: false },   // HHmm (정시: "1300")
      nx: { type: DataTypes.INTEGER, allowNull: false },
      ny: { type: DataTypes.INTEGER, allowNull: false },
      category: { type: DataTypes.STRING(3), allowNull: false },   // RN1,T1H,UUU, ...
      obsrValue: { type: DataTypes.STRING(16), allowNull: false }, // 실수/정수 모두 문자열로 받아 저장
    }, {
      tableName: 'ultra_nowcast',
      indexes: [
        {
          unique: true,
          fields: ['baseDate','baseTime','nx','ny','category']
        },
        { fields: ['baseDate','baseTime'] },
      ]
    });
  
    return UltraNowcast;
  };
  