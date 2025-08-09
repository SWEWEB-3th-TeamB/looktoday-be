// exports.isLoggedIn = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     next();
//   } else {
//     res.status(403).send('로그인 필요');
//   }
// };

// // passport 안쓰고 사용
// exports.isLoggedIn = (req, res, next) => {
//   if (req.user) {
//     next();
//   } else {
//     res.status(403).json({ success: false, message: "로그인이 필요합니다." });
//   }
// };

// 테스트용으로 로그인했다고 가정 
exports.isLoggedIn = (req, res, next) => {
  req.user = { id: 1, username: 'testuser' }; // 원하는 임시 사용자 정보
  next();
};

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    const message = encodeURIComponent('로그인한 상태입니다.');
    res.redirect(`/?error=${message}`);
  }
};