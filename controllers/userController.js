const db = require('../models');
const User = db.User;
const { ApiResponse } = require('../response');
const weatherController = require('./weatherController');

// GET /api/users/me  → 내 정보 조회(원하면 프론트가 이걸로 si/gungu만 받아서 써도 됨)
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({
        code: 'AUTH401', message: '로그인이 필요합니다.'
      }));
    }

    const me = await User.findByPk(userId, {
      attributes: ['user_id', 'email', 'nickname', 'birth', 'si', 'gungu'],
    });
    if (!me) {
      return res.status(404).json(ApiResponse.fail({
        code: 'USER404', message: '사용자를 찾을 수 없습니다.'
      }));
    }

    return res.status(200).json(ApiResponse.success({
      code: 'USER200', message: '내 정보 조회 성공', result: me
    }));
  } catch (err) {
    console.error('[GET /api/users/me] error', err);
    return res.status(500).json(ApiResponse.fail({
      code: 'COMMON500', message: '서버 오류', error: { detail: err.message }
    }));
  }
};

// GET /api/users/me/weather  → 로그인 유저의 시/군구로 날씨까지 바로 내려주기
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

    // 기존 날씨 컨트롤러 재사용
    req.query.si = me.si;
    req.query.gungu = me.gungu;
    return weatherController.getWeather(req, res);
  } catch (err) {
    console.error('[GET /api/users/me/weather] error', err);
    return res.status(500).json(ApiResponse.fail({
      code: 'WEATHER500', message: '서버 오류', error: { detail: err.message }
    }));
  }
};
