const express = require("express");
const axios = require("axios");
const locationMap = require("../data/locationMap"); // 시군구 → nx, ny 매핑 데이터
const router = express.Router();

const SERVICE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const SERVICE_KEY = process.env.WEATHER_API_KEY; // .env에 있는 서비스 키

router.get("/ultra-now", async (req, res) => {
  try {
    const { si, gungu } = req.query;

    // 1. 시군구 → nx, ny 찾기
    if (!locationMap[si]) {
      return res.status(400).json({ ok: false, message: "시 정보가 잘못되었습니다." });
    }

    const district = locationMap[si].find(d => d.district === gungu);
    if (!district) {
      return res.status(400).json({ ok: false, message: "군구 정보가 잘못되었습니다." });
    }

    const { nx, ny } = district;

    // 2. 기준 날짜 및 시간 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const base_date = `${year}${month}${day}`;

    // 초단기실황: 매시 40분 이후부터 직전 시각 데이터 사용
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
