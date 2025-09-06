// utils/dateTime.js

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

module.exports = { toBaseDateTime };