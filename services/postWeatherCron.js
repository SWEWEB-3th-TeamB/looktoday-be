// services/postWeatherCron.js
const cron = require('node-cron');
const { Post, UltraNowcast, Sequelize: { Op} } = require('../models');
const { toBaseDateTime } = require('../utils/dateTime');

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

        const uniqueLookups = new Map();
        postsToUpdate.forEach(p => {
            const { baseDate, baseTime } = toBaseDateTime(p.date, p.hour);
            const key = `${p.si}|${p.gungu}|${baseDate}|${baseTime}`;
            if (!uniqueLookups.has(key)) {
                uniqueLookups.set(key, { si: p.si, gungu: p.gungu, baseDate, baseTime });
            }
        });
        const weatherLookups = Array.from(uniqueLookups.values());

        const weatherRows = await UltraNowcast.findAll({
            where: {
                [Op.or]: weatherLookups
            }
        });

        const weatherMap = new Map();
        weatherRows.forEach(w => {
            const key = `${w.si}|${w.gungu}|${w.baseDate}|${w.baseTime}`;
            weatherMap.set(key, { id: w.id, tmp: w.tmp});
        });

        console.log(`[Cron] ${postsToUpdate.length}개의 게시물 날씨 보정 시도`);

        for (const p of postsToUpdate) {
            try {
                const { baseDate, baseTime } = toBaseDateTime(p.date, p.hour);
                const key = `${p.si}|${p.gungu}|${baseDate}|${baseTime}`;
                const weatherData = weatherMap.get(key);
                if (weatherData) {
                    await p.update({ 
                        weather_id: weatherData.id,
                        temperature: weatherData.tmp
                    });
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