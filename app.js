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
const lookPostRouter = require('./routes/lookPost.js')(db);
const authRoutes = require('./routes/auth');
const mypageRoutes = require('./routes/mypage');
const weatherRouter = require('./routes/weather');
const weatherNowRoutes = require('./routes/weatherNow');
const sunRouter = require('./routes/sun');

// --- Cron ---
const weatherCron = require('./services/weatherCron');

// --- ENV ---
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
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

// --- Routes ---
app.use('/api/weather', weatherRouter);
app.use('/api/weather', weatherNowRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', mypageRoutes);
app.use('/api/looks', looksRoutes);
app.use('/api', lookPostRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/sun', sunRouter);

// --- 부팅 시 스키마/데이터 보정 ---
async function ensureUltraNowcastSchema() {
  const qi = db.sequelize.getQueryInterface();
  const Sequelize = db.Sequelize;

  let table = {};
  try {
    table = await qi.describeTable('ultra_nowcast');
  } catch {
    return; // 테이블은 sync 이후에 생김
  }

  // 1) si / gungu 컬럼 추가
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

  // 2) category_name(한글 라벨) 컬럼 추가
  if (!table.category_name) {
    await qi.addColumn('ultra_nowcast', 'category_name', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'category',
    });
    console.log('[bootstrap] ultra_nowcast.category_name 컬럼 추가');
  }

  // 3) 인덱스 (이미 있으면 무시)
  try {
    await qi.addIndex('ultra_nowcast', {
      name: 'idx_ultra_si_gungu',
      fields: ['si', 'gungu'],
    });
    console.log('[bootstrap] ultra_nowcast idx_ultra_si_gungu 인덱스 추가');
  } catch {}
  try {
    await qi.addIndex('ultra_nowcast', {
      name: 'uniq_ultra_slot',
      unique: true,
      fields: ['baseDate', 'baseTime', 'nx', 'ny', 'category'], // category=영문코드 유지
    });
    console.log('[bootstrap] ultra_nowcast uniq_ultra_slot 인덱스 추가');
  } catch {}

  // 4) 기존 데이터: 영문 category -> category_name 한글 백필
  const backfillLabelSql = `
    UPDATE ultra_nowcast
       SET category_name = CASE category
         WHEN 'T1H' THEN '기온'
         WHEN 'REH' THEN '습도'
         WHEN 'PTY' THEN '강수형태'
         WHEN 'RN1' THEN '1시간 강수량'
         WHEN 'WSD' THEN '풍속'
         WHEN 'VEC' THEN '풍향'
         WHEN 'UUU' THEN '동서바람성분'
         WHEN 'VVV' THEN '남북바람성분'
         ELSE category_name
       END
     WHERE category IN ('T1H','REH','PTY','RN1','WSD','VEC','UUU','VVV')
       AND (category_name IS NULL OR category_name = '');
  `;
  await db.sequelize.query(backfillLabelSql);
  console.log('[bootstrap] ultra_nowcast category_name 백필 완료');

  // 5) 기존 데이터: si/gungu NULL 자동 보정 (locationMap 기반)
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
          {
            replacements: { si, gungu: d.district, nx: d.nx, ny: d.ny },
          }
        );
        // mysql2 returns OkPacket with affectedRows
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
    await db.sequelize.sync(); // alter:true 지양
    console.log('테이블 생성 및 업데이트 완료');

    await ensureUltraNowcastSchema();

    weatherCron.start();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });
