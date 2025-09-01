const express = require("express");
const axios = require("axios");
const getXY = require("../utils/getXY"); // lat/lon → 격자 좌표 변환
const router = express.Router();

const SERVICE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const SERVICE_KEY = process.env.WEATHER_API_KEY; // .env에 저장된 기상청 서비스키 (디코딩 안 된 원본)

router.get("/ultra-now", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // 1. 위경도 → 격자 좌표 변환
    const { nx, ny } = getXY(lat, lon);

    // 2. 기준 날짜 & 시간 설정
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const base_date = `${year}${month}${day}`;

    // 초단기실황은 매시 40분 이후부터 직전 시각 자료 사용
    const hour = now.getMinutes() >= 40 ? now.getHours() : now.getHours() - 1;
    const base_time = `${String(hour).padStart(2, "0")}00`;

    // 3. 기상청 API 호출
    const { data } = await axios.get(`${SERVICE_URL}/getUltraSrtNcst`, {
      params: {
        serviceKey: SERVICE_KEY,
        dataType: "JSON",
        base_date,
        base_time,
        nx,
        ny,
        numOfRows: 100,
        pageNo: 1,
      },
      timeout: 10000,
    });

    res.json(data);
  } catch (err) {
    console.error("[weather-proxy error]", err.message);
    res.status(502).json({
      ok: false,
      message: "기상청 API 호출 실패",
      detail: err.message,
    });
  }
});

module.exports = router;
