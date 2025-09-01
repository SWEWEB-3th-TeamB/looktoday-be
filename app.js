const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();

// --- DB 연결 ---
const db = require('./models'); // models/index.js에서 모든 모델 관리

// --- 라우터 임포트 ---
const looksRoutes = require('./routes/looks.js');
const lookPostRouter = require('./routes/lookPost.js')(db);
const authRoutes = require('./routes/auth');
const mypageRoutes = require('./routes/mypage');
const weatherRouter = require('./routes/weather');
const weatherNowRoutes = require('./routes/weatherNow'); // ✅ 새로 만든 초단기실황 API

// --- 크론 스케줄러 임포트 ---
const weatherCron = require('./services/weatherCron');

// --- 환경 변수 ---
const PORT = process.env.PORT || 3000;

// --- 미들웨어 설정 ---
app.use(express.json());
app.use(cors({
  origin: ['https://looktoday.kr', 'https://www.looktoday.kr'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
}));
app.use(morgan('dev'));
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// --- Swagger 설정 추가 ---
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LookToday API',
      version: '1.0.0',
      description: 'LookToday의 API 문서입니다.',
    },
    // 인증을 위한 Authorize 버튼 추가
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'], // API 주석이 담긴 파일들의 경로
};
const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// app.get('/', (req, res) => {
//     res.send('Hello World');
// });

// app.listen(app.get('port'),()=>{
//     console.log(app.get('port'),'번 포트에서 대기 중');
// });



// app.use(...) 부분에 아래 코드를 추가하여 라우터를 연결합니다.
// 이제 /api/weather 경로로 들어오는 모든 요청은 weatherRouter가 처리합니다.

// --- 라우터 등록 ---
app.use('/api/weather', weatherRouter);

// 새로 만든 초단기실황 기반 API
app.use('/api/weather', weatherNowRoutes);

// 사용자 인증 및 마이페이지
app.use('/api/auth', authRoutes);
app.use('/api/users', mypageRoutes);

// LOOKS 관련 API
app.use('/api/looks', looksRoutes);
app.use('/api', lookPostRouter);

// S3 업로드 대신 로컬 uploads 폴더 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DB 연결 및 서버 시작 ---
db.sequelize.authenticate()
  .then(async () => {
    console.log('DB 연결 성공');
    await db.sequelize.sync({ alter: true });
    console.log('테이블 생성 및 업데이트 완료');

    // 크론 스케줄러 시작 (환경 변수에서 on일 때만)
    weatherCron.start();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });
