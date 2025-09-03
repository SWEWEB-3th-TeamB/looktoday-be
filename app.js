const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

// --- DB ---
const db = require('./models');

// --- Routers ---
const looksRoutes = require('./routes/looks.js');
const lookPostRouter = require('./routes/lookPost.js');
const authRoutes = require('./routes/auth');
const mypageRoutes = require('./routes/mypage');
const weatherRouter = require('./routes/weather');
const weatherNowRoutes = require('./routes/weatherNow');
const sunRouter = require('./routes/sun');
const weatherProxy = require("./routes/weatherProxy"); // 날씨API cors 해결코드

// --- Cron ---
const weatherCron = require('./services/weatherCron');
const postWeatherCron = require('./services/postWeatherCron.js');
// --- ENV ---
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(express.json());
app.use(cors({
  origin: ['https://looktoday.kr', 'https://www.looktoday.kr', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

// app.options('*', cors());

app.use(morgan('dev'));
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Swagger 
if (process.env.SWAGGER !== 'off') {
  try {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'LookToday API',
          version: '1.0.0',
          description: 'LookToday의 API 문서입니다.',
        },
        servers: [
          {
            url: 'http://43.203.195.97:3000',
            description: 'Production server'
          },
          {
            url: 'http://localhost:3000',
            description: 'Local development server'
          }
        ],
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
      apis: ['./routes/*.js'],
    };

    const specs = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log('[swagger] /api-docs 활성화 (looks.js 제외)');
  } catch (e) {
    console.warn('[swagger] 비활성화(초기화 실패):', e.message);
  }
} else {
  console.log('[swagger] 환경변수로 비활성화(SWAGGER=off)');
}

// --- Routes ---

app.use('/api/weather', weatherRouter);
app.use('/api/weather', weatherNowRoutes);
app.use('/api/weather-proxy', weatherProxy); // 날씨API cors 문제 해결 추가 코드
app.use('/api/auth', authRoutes);
app.use('/api/users', mypageRoutes);
app.use('/api/looks', looksRoutes);
app.use('/api/lookPost', lookPostRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/sun', sunRouter);

// --- 부팅 시 스키마/데이터 보정 ---
async function ensureUltraNowcastSchema() {
  const qi = db.sequelize.getQueryInterface();
  const Sequelize = db.Sequelize;

  // 테이블 스키마 읽기 (없으면 패스)
  let table = {};
  try {
    table = await qi.describeTable('ultra_nowcast');
  } catch (err) {
    return;
  }

  // 1) si / gungu 컬럼(없으면 추가)  — NOT NULL 강제는 상황 따라 선택
  if (!table.si) {
    await qi.addColumn('ultra_nowcast', 'si', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'ny',
    });
    console.log('[bootstrap] ultra_nowcast.si 컬럼 추가');
  }
  if (!table.gungu) {
    await qi.addColumn('ultra_nowcast', 'gungu', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'si',
    });
    console.log('[bootstrap] ultra_nowcast.gungu 컬럼 추가');
  }

  // 2) (중요) 더 이상 category / category_name / obsrValue 사용 안 함 → 관련 조작 제거
  //    예전 코드: category_name 추가/백필, category 기반 인덱스 생성 등은 모두 스킵

  // 3) 가로형 업서트에 맞는 유니크 인덱스 보장 (si,gungu,baseDate,baseTime,nx,ny)
  try {
    // MySQL은 IF NOT EXISTS 미지원 → 존재여부 확인 후 생성
    const [rows] = await db.sequelize.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ultra_nowcast'
        AND INDEX_NAME = 'uk_nowcast_key'
      LIMIT 1
    `);
    if (!rows.length) {
      await qi.addIndex('ultra_nowcast', {
        name: 'uk_nowcast_key',
        unique: true,
        fields: ['si', 'gungu', 'baseDate', 'baseTime', 'nx', 'ny'],
      });
      console.log('[bootstrap] ultra_nowcast uk_nowcast_key 인덱스 추가');
    }
  } catch (e) {
    console.warn('[bootstrap] uk_nowcast_key 인덱스 확인/추가 실패:', e.message);
  }

  // 4) (선택) si/gungu NULL 자동 보정 — locationMap 기준 (있을 때만)
  try {
    const locationMap = require('./data/locationMap');
    let total = 0;
    for (const si of Object.keys(locationMap)) {
      for (const d of locationMap[si]) {
        const [res] = await db.sequelize.query(
          `UPDATE ultra_nowcast
             SET si = :si, gungu = :gungu
           WHERE nx = :nx AND ny = :ny
             AND (si IS NULL OR gungu IS NULL)`,
          { replacements: { si, gungu: d.district || '', nx: d.nx, ny: d.ny } }
        );
        total += res?.affectedRows || 0;
      }
    }
    if (total) console.log(`[bootstrap] ultra_nowcast si/gungu NULL 자동 보정 완료 (+${total} rows)`);
  } catch (e) {
    console.warn('[bootstrap] si/gungu 자동 보정 스킵:', e.message);
  }
}

// --- Start ---
db.sequelize.authenticate()
  .then(async () => {
    console.log('DB 연결 성공');

    // ✅ 개발용: 부팅 시 테이블/컬럼 자동 동기화
    try {
      if (process.env.SYNC_ON_BOOT === '1') {
        await db.sequelize.sync({ alter: true });
        console.log('[sequelize] sync({ alter: true }) 완료 - 테이블/컬럼 동기화');
      } else {
        console.log('[sequelize] sync 스킵 (SYNC_ON_BOOT 환경변수 미설정)');
      }
    } catch (e) {
      console.error('[sequelize] sync 실패:', e);
    }

    // 스키마 보정
    await ensureUltraNowcastSchema();

    try { weatherCron.start?.(); } catch(e) { console.error('[cron] weatherCron 시작 실패:', e); }
    try { postWeatherCron.start?.(); } catch(e) { console.error('[cron] postWeatherCron 시작 실패:', e); }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });