const locationMap = require('../data/locationMap');

// 위도/경도와 가장 가까운 격자 좌표를 찾아주는 함수
function getXY(lat, lon) {
    let closestLocation = null;
    let minDistance = Infinity;

    // 모든 지역을 순회하며 가장 가까운 곳을 찾습니다.
    for (const city in locationMap) {
        const locations = locationMap[city];
        for (const location of locations) {
            // 유클리드 거리를 계산하여 가장 가까운 지역을 찾습니다.
            const distance = Math.sqrt(
                Math.pow(lat - location.lat, 2) + Math.pow(lon - location.lon, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestLocation = location;
            }
        }
    }

    if (closestLocation) {
        return { nx: closestLocation.nx, ny: closestLocation.ny };
    }
    
    // 가장 가까운 지역을 찾지 못했을 경우 기본값 반환 (예: 서울)
    return { nx: 60, ny: 127 };
}

module.exports = getXY;