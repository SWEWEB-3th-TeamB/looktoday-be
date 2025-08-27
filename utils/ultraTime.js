// utils/ultraTime.js
function getBaseDateTimeForUltra(now = new Date()) {
    // now는 10분 이후에 실행되는 현재 시각(크론에서 넘어옴)
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const H = String(now.getHours()).padStart(2, '0');
    // 초단기실황은 "해당 정시"를 base_time으로 사용
    const baseDate = `${y}${m}${d}`;
    const baseTime = `${H}00`; // 정시
    return { baseDate, baseTime };
  }
  
  module.exports = { getBaseDateTimeForUltra };
  