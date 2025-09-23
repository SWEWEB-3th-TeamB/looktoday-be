// GET /api/users/me/weather
exports.getMyWeather = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({
        code: 'AUTH401', message: '로그인이 필요합니다.'
      }));
    }

    const me = await User.findByPk(userId, { attributes: ['si', 'gungu'] });
    if (!me) {
      return res.status(404).json(ApiResponse.fail({
        code: 'USER404', message: '사용자를 찾을 수 없습니다.'
      }));
    }

    // 👉 정규화
    const normalize = (s) => s?.trim()
      .replace(/특별시|광역시/g, '시')
      .replace(/시$/, '')
      .replace(/\s+/g, '');
    const si = normalize(me.si);
    const gungu = normalize(me.gungu);

    if (!si || !gungu) {
      return res.status(400).json(ApiResponse.fail({
        code: 'WEATHER400', message: '시, 군구 정보가 필요합니다.'
      }));
    }

    // 👉 core 함수 호출
    const result = await weatherController.getWeatherCore(si, gungu);

    if (!result) {
      return res.status(404).json(ApiResponse.fail({
        code: 'WEATHER404_NO_DATA',
        message: '해당 지역의 최신 관측값이 없습니다.'
      }));
    }

    return res.status(200).json(ApiResponse.success({
      code: 'WEATHER200',
      message: '날씨 조회 성공',
      result
    }));

  } catch (err) {
    console.error('[GET /api/users/me/weather] error', err);
    return res.status(500).json(ApiResponse.fail({
      code: 'WEATHER500',
      message: '서버 오류',
      error: { detail: err.message }
    }));
  }
};
