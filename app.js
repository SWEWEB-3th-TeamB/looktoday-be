const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const looksRoutes = require('./routes/looks.js');

const db = require('./models');
const weatherCron = require('./services/weatherCron');

const PORT = process.env.PORT || 3000;

const app = express();
app.set('port', PORT);

/* 1) 헬스체크 */
app.get('/ping', (req, res) => res.status(200).send('pong'));

/* 2) 로깅 */
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log('ENTER', req.method, req.originalUrl);
  res.on('finish', () => console.log('FINISH', req.method, req.originalUrl, res.statusCode));
  next();
});

/* 3) 일반 미들웨어 */
app.use(cors());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

/* 4) 기본 라우트 */
app.get('/', (req, res) => res.send('Hello World'));

/* 5) 기능 라우트 */
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/looks', looksRoutes);

// (프로젝트에 존재한다면) lookPost / image 라우터 연결
try {
  const lookPostRouter = require('./routes/lookPost')(db);
  const imageRouter = require('./routes/image')(db);
  app.use('/api', lookPostRouter);
  app.use('/api', imageRouter);
} catch (e) {
  // 선택: 없는 라우터면 조용히 패스
}

/* 6) 404 */
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

/* 7) 에러 핸들러 */
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Internal Server Error' });
});

/* 8) DB 연결 후 서버 시작 */
db.sequelize.sync()
  .then(() => {
    console.log('DB 연결 및 테이블 생성 완료');
    app.listen(PORT, () => {
      console.log(`${PORT}번 포트에서 대기 중`);
      if (weatherCron?.start) weatherCron.start();
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });
