const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const app = express();


const looksRoutes = require('./routes/looks.js');

const db = require('./models'); //db
const lookPostRouter = require('./routes/lookPost')(db); // lookPost.js 라우터 가져오기
const PORT = process.env.PORT || 3000;


const authRoutes = require('./routes/auth'); //라우트 연결

app.use(express.json());
app.use(morgan('dev'));
app.use('/',express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false}));
app.use(cookieParser(process.env.COOKIE_SECRET));


app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(app.get('port'),()=>{
    console.log(app.get('port'),'번 포트에서 대기 중');
});

// routes 폴더에서 weather.js 파일을 불러옵니다.
const weatherRouter = require('./routes/weather');

// app.use(...) 부분에 아래 코드를 추가하여 라우터를 연결합니다.
// 이제 /api/weather 경로로 들어오는 모든 요청은 weatherRouter가 처리합니다.
app.use('/api/weather', weatherRouter);
//라우트 연결 (/api/auth로 들어오는 요청 처리)

app.use('/api/auth', authRoutes)
app.use('/api/looks', looksRoutes);
app.use('/api', lookPostRouter); // 게시글 업로드 라우터 연결

// S3 사용 전 임시적으로 로컬 uploads 폴더를 정적 파일로 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

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
