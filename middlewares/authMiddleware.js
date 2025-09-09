const jwt = require('jsonwebtoken');
const { ApiResponse } = require('../response');

const authMiddleware = (req, res, next) => {
  try {
    // 요청 헤더에서 Authorization 추출
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res
      .status(401)
      .json(ApiResponse.fail({ 
        code: "USER401",
        message: 'Authorization 헤더가 없습니다.',
        error: {} }));
    }

    // "Bearer"로 시작하는지 확인
    if (!authHeader.startsWith('Bearer ')) {
      return res
      .status(401)
      .json(ApiResponse.fail({ 
        code: "USER401",
        message: '잘못된 인증 형식입니다.',
        error: {} }));
    }

    // 토큰 부분만 추출
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res
      .status(401)
      .json(ApiResponse.fail({ 
        code: "USER401",
        message: '토큰이 제공되지 않았습니다.',
        error: {} }));
    }

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email
    }

    next(); // 다음 미들웨어로 이동
  } catch (err) {
    console.error('JWT 인증 오류:', err.message);
    return res
    .status(401)
    .json(ApiResponse.fail({ 
      code: "USER401",
      message: '유효하지 않은 토큰입니다.',
      error: {} }));
  }
};

const isLoggedIn = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
      .status(401)
      .json({
        code: "USER401",
        message: '로그인이 필요합니다.',
        error: {} });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
      user_id: decoded.user_id,
      email: decoded.email
    }
    next();
  } catch (err) {
    return res
    .status(401)
    .json(ApiResponse.fail({ 
      code: "USER401",
      message: '유효하지 않은 토큰입니다.',
      error: {} }));
  }
};

const isNotLoggedIn = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res
      .status(403)
      .json(ApiResponse.fail({ 
        code: "USER403",
        message: '이미 로그인 한 상태입니다. ',
        error: {} }));
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = { authMiddleware, isLoggedIn, isNotLoggedIn };
