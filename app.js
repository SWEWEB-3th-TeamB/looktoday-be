const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth'); //라우트 연결
const looksRoutes = require('./routes/looks.js');
const db = require('./models'); //db

const PORT = process.env.PORT || 3000;

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

//라우트 연결 (/api/auth로 들어오는 요청 처리)
app.use('/api/auth', authRoutes)
app.use('/api/looks', looksRoutes);

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