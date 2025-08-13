const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // 요청 헤더에서 Authorization 추출
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization 헤더가 없습니다.' });
    }

    // "Bearer "로 시작하는지 확인
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '잘못된 인증 형식입니다.' });
    }

    // 토큰 부분만 추출
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '토큰이 제공되지 않았습니다.' });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // req.user.id, req.user.email로 접근 가능

    next(); // 다음 미들웨어로 이동
  } catch (err) {
    console.error('JWT 인증 오류:', err.message);
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
