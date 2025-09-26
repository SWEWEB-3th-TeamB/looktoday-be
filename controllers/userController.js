const db = require('../models');
const User = db.User;
const { ApiResponse } = require('../response');
const weatherController = require('./weatherController');

// ---------- 공통 유틸 ----------
const normalizeCity = s => String(s ?? '')
  .trim().replace(/특별시|광역시/g, '시').replace(/시$/, '').replace(/\s+/g, '');
const normalizeGu = s => String(s ?? '')
  .trim().replace(/구$/, '').replace(/\s+/g, '');

// ---------- 내 정보 ----------
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId ?? req.user?.id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({
        code: 'AUTH401',
        message: '로그인이 필요합니다.'
      }));
    }

    const me = await User.findByPk(userId, {
      attributes: ['id', 'email', 'nickname', 'si', 'gungu', 'createdAt', 'updatedAt']
    });

    if (!me) {
      return res.status(404).json(ApiResponse.fail({
        code: 'USER404',
        message: '사용자를 찾을 수 없습니다.'
      }));
    }

    return res.status(200).json(ApiResponse.success({
      code: 'USER200',
      message: '내 정보 조회 성공',
      me
    }));
  } catch (err) {
    console.error('[GET /api/users/me] error', err);
    return res.status(500).json(ApiResponse.fail({
      code: 'USER500',
      message: '서버 오류',
      error: { detail: err?.message }
    }));
  }
};

// ---------- 내 지역 날씨 (쿼리 허용) ----------
exports.getMyWeather = async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId ?? req.user?.id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({
        code: 'AUTH401',
        message: '로그인이 필요합니다.'
      }));
    }

    // (1) 쿼리 우선
    const qSi    = req.query.si ?? req.query.city ?? req.query.sido;
    const qGungu = req.query.gungu ?? req.query.gu ?? req.query.district;

    let si = normalizeCity(qSi);
    let gungu = normalizeGu(qGungu);

    // (2) 없으면 DB fallback
    if (!si || !gungu) {
      const me = await User.findByPk(userId, { attributes: ['si', 'gungu'] });
      if (me) {
        si = si || normalizeCity(me.si);
        gungu = gungu || normalizeGu(me.gungu);
      }
    }

    if (!si || !gungu) {
      return res.status(400).json(ApiResponse.fail({
        code: 'WEATHER400',
        message: '시, 군구 정보가 필요합니다.',
        error: { __error__: 'NO_REGION', hint: 'query에 si,gungu를 주거나 /api/users/me/region 로 저장하세요.' }
      }));
    }

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
      error: { detail: err?.message }
    }));
  }
};

// ---------- 내 지역 저장/수정 ----------
exports.updateMyRegion = async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId ?? req.user?.id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({
        code: 'AUTH401',
        message: '로그인이 필요합니다.'
      }));
    }

    const rawSi = req.body.si ?? req.body.city ?? req.body.sido;
    const rawGu = req.body.gungu ?? req.body.gu ?? req.body.district;

    const si = normalizeCity(rawSi);
    const gungu = normalizeGu(rawGu);

    if (!si || !gungu) {
      return res.status(400).json(ApiResponse.fail({
        code: 'USER400',
        message: 'si와 gungu가 필요합니다.'
      }));
    }

    await User.update({ si, gungu }, { where: { id: userId } });

    return res.status(200).json(ApiResponse.success({
      code: 'USER200_REGION_UPDATED',
      message: '지역 정보가 업데이트되었습니다.',
      region: { si, gungu }
    }));
  } catch (err) {
    console.error('[PATCH /api/users/me/region] error', err);
    return res.status(500).json(ApiResponse.fail({
      code: 'USER500',
      message: '서버 오류',
      error: { detail: err?.message }
    }));
  }
};
