module.exports = (sequelize, DataTypes) => {
  const UltraNowcast = sequelize.define('ultra_nowcast', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    baseDate: { type: DataTypes.STRING(8), allowNull: false },
    baseTime: { type: DataTypes.STRING(4), allowNull: false },
    nx: { type: DataTypes.INTEGER, allowNull: false },
    ny: { type: DataTypes.INTEGER, allowNull: false },
    si: { type: DataTypes.STRING(50), allowNull: false },
    gungu: { type: DataTypes.STRING(50), allowNull: false },

    tmp: { type: DataTypes.FLOAT },
    reh: { type: DataTypes.FLOAT },
    wsd: { type: DataTypes.FLOAT },
    vec: { type: DataTypes.FLOAT },
    uuu: { type: DataTypes.FLOAT },
    vvv: { type: DataTypes.FLOAT },
    pty: { type: DataTypes.STRING(16) },
    pcp: { type: DataTypes.STRING(16) },
    lgt: { type: DataTypes.FLOAT },
  }, {
    tableName: 'ultra_nowcast',
    timestamps: false,
    indexes: [{
      unique: true,
      name: 'uk_nowcast_key',
      fields: ['si', 'gungu', 'baseDate', 'baseTime', 'nx', 'ny'],
    }],
  });
  return UltraNowcast;
};
