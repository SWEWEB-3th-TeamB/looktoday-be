const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth'); //라우트 연결
const db = require('./models'); //db

const PORT = process.env.PORT || 3000;

dotenv.config();

const app = express();
app.set('port',process.env.PORT || 3000);

app.use(morgan('dev'));
app.use('/',express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false}));
app.use(cookieParser(process.env.COOKIE_SECRET));


app.get('/', (req, res) => {
    res.send('Hello World');
});

<<<<<<< HEAD
app.listen(app.get('port'),()=>{
    console.log(app.get('port'),'번 포트에서 대기 중');
});

// routes 폴더에서 weather.js 파일을 불러옵니다.
const weatherRouter = require('./routes/weather');

// app.use(...) 부분에 아래 코드를 추가하여 라우터를 연결합니다.
// 이제 /api/weather 경로로 들어오는 모든 요청은 weatherRouter가 처리합니다.
app.use('/api/weather', weatherRouter);
=======
//라우트 연결 (/api/auth로 들어오는 요청 처리)
app.use('/api/auth', authRoutes)

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
>>>>>>> 290885e0271b9d1c25e84ca9975491a0077ba429
