const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const app = express();

const db = require('./models'); //db
const lookPostRouter = require('./routes/lookPost')(db); // lookPost.js 라우터 가져오기
const imageRouter = require('./routes/image')(db); // image.js 라우터 가져오기
const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth'); //라우트 연결
dotenv.config();

app.use(express.json());
app.use(morgan('dev'));
app.use('/',express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false}));
app.use(cookieParser(process.env.COOKIE_SECRET));

//라우트 연결 (/api/auth로 들어오는 요청 처리)
app.use('/api/auth', authRoutes)
app.use('/api', lookPostRouter); // 게시글 업로드 라우터 연결
app.use('/api', imageRouter); // 이미지 업로드 라우터 연결

db.sequelize.sync()
  .then(() => {
    console.log('DB 연결 및 테이블 생성 완료');
    // 서버 시작 코드 위치
    app.listen(PORT, () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });

app.get('/', (req, res) => {
    res.send('Hello World');
});