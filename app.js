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

//라우트 연결 (/api/auth로 들어오는 요청 처리)
app.use('/api/auth', authRoutes)

db.sequelize.sync()
  .then(() => {
    console.log('DB 연결 성공');
    app.listen(PORT, () => {
      console.log(`${PORT}번 포트에서 대기 중`);
    });
  })
  .catch((err) => {
    console.error('DB 연결 실패:', err);
  });