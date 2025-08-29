const cron = require('node-cron');
const { Post, UltraNowcast, Sequelize: { Op} } = require('../models');

// 입력받은 년월일시 객체 변환 함수
function toBaseDateTime(dateStr, hourStr) {
  const hourNum = Number(hourStr);
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0);
  dt.setHours(hourNum);
  const Y = dt.getFullYear();
  const M = String(dt.getMonth() + 1).padStart(2, '0');
  const D = String(dt.getDate()).padStart(2, '0');
  const H = String(dt.getHours()).padStart(2, '0');
  return { baseDate: `${Y}${M}${D}`, baseTime: `${H}00` };
}

async function findWeatherBySlot(si, gungu, date, hour) {
  const { baseDate, baseTime } = toBaseDateTime(date, hour);
  return UltraNowcast.findOne({ where: { si, gungu, baseDate, baseTime } });
}

// 매시 20분에 실행
module.exports = cron.schedule('20 * * * *', async () => {
    try {
        console.log('[Cron] 날씨 없는 게시물 보정 시작');

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const postsToUpdate = await Post.findAll({
            where: {
                weather_id: null,
                createdAt: { [Op.gte]: threeDaysAgo } // 최근 3일 내 게시물만
            },
            limit: 100 // 최대 100개만
        });

        if (postsToUpdate.length === 0) {
            console.log('[Cron] 보정할 게시물이 없습니다.');
            return;
        }

        console.log(`[Cron] ${postsToUpdate.length}개의 게시물 날씨 보정 시도`);

        for (const p of postsToUpdate) {
            try {
                const weatherRow = await findWeatherBySlot(p.si, p.gungu, p.date, p.hour);
                if (weatherRow) {
                    await p.update({ weather_id: weatherRow.id });
                    console.log(`[Cron] Post ${p.looktoday_id} → 날씨 보정 완료`);
                }
            } catch (error) {
                console.error(`[Cron] Post ${p.looktoday_id} → 날씨 보정 실패`, error);
            }
        }
    } catch (error) {
        console.error('[Cron] 스케줄링 작업 중 오류 발생:', error);
    }
});