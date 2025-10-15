const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const session = require('express-session');
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
const userRoutes = require('./routes/user');

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
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 10 }
}));

app.use(morgan('dev'));
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Swagger 
if (process.env.SWAGGER !== 'off') {
  try {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const swaggerFiles = [
      path.join(__dirname, 'routes', '*.js'),
      path.join(__dirname, 'routes', '**', '*.js'),
    ];

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'LookToday API',
          version: '1.0.0',
          description: 'LookToday의 API 문서입니다.',
        },
        servers: [
          { url: 'http://43.203.195.97:3000', description: 'Production server' },
          { url: 'http://localhost:3000', description: 'Local development server' },
        ],
        components: {
          securitySchemes: {
            BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      apis: swaggerFiles,
    };

    const specs = swaggerJsdoc(options);
    console.log('[swagger] loaded files:', swaggerFiles);
    console.log('[swagger] path count:', Object.keys(specs.paths || {}).length);

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
    console.log('[swagger] /api-docs 활성화');
  } catch (e) {
    console.warn('[swagger] 비활성화(초기화 실패):', e.message);
  }
} else {
  console.log('[swagger] 환경변수로 비활성화(SWAGGER=off)');
}

// --- Routes ---
app.use('/api/weather', weatherRouter);
app.use('/api/weather', weatherNowRoutes);
app.use('/api/weather-proxy', weatherProxy);
app.use('/api/users', userRoutes);
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

  let table = {};
  try {
    table = await qi.describeTable('ultra_nowcast');
  } catch (err) {
    return;
  }

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

  try {
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
    await db.sequelize.sync({ alter: true });
    console.log('DB 연결 성공');
    await ensureUltraNowcastSchema();
    

    // ✅ 서버를 먼저 띄움
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });

    // ✅ 부팅 후 비동기로 날씨 수집 실행
    (async () => {
      try {
        await weatherCron.runOnce?.();
      } catch (e) {
        console.error('[cron] 부팅 1회 수집 실패:', e?.message);
      }

      try {
        weatherCron.start?.();
      } catch (e) {
        console.error('[cron] weatherCron 시작 실패:', e);
      }

      try {
        postWeatherCron.start?.();
      } catch (e) {
        console.error('[cron] postWeatherCron 시작 실패:', e);
      }
    })();
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });
