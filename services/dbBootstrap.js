// services/dbBootstrap.js
module.exports = async function dbBootstrap(sequelize, Sequelize) {
  const qi = sequelize.getQueryInterface();

  // ultra_nowcast에 si/gungu 없으면 자동 추가
  let table = {};
  try {
    table = await qi.describeTable('ultra_nowcast');
  } catch (e) {
    // 테이블 없으면 models sync가 먼저 만들어줄 거라 여기선 무시
  }

  if (table && !table.si) {
    await qi.addColumn('ultra_nowcast', 'si', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'ny',
    });
  }
  if (table && !table.gungu) {
    await qi.addColumn('ultra_nowcast', 'gungu', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'si',
    });
  }

  // pty 컬럼이 짧으면 VARCHAR(16)으로 확장 (라벨 문자열 저장을 위해)
  try {
    if (table && table.pty) {
      const t = String(table.pty.type || '').toLowerCase(); // e.g., 'varchar(2)'
      const m = t.match(/varchar\((\d+)\)/i);
      const len = m ? Number(m[1]) : null;

      if (!len || len < 16) {
        await qi.changeColumn('ultra_nowcast', 'pty', {
          type: Sequelize.STRING(16),
          allowNull: true,
        });
      }
    }
  } catch (_) {}

  // 유니크 인덱스(중복 적재 방지) & 조회용 인덱스
  try {
    await qi.addIndex('ultra_nowcast', {
      name: 'uniq_ultra_slot',
      unique: true,
      // ⬇️ 실제 존재하는 키들로 구성 (category 제거)
      fields: ['si', 'gungu', 'baseDate', 'baseTime', 'nx', 'ny'],
    });
  } catch (_) {} // 이미 있으면 무시

  try {
    await qi.addIndex('ultra_nowcast', {
      name: 'idx_ultra_si_gungu',
      fields: ['si', 'gungu'],
    });
  } catch (_) {}
};
