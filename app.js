const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

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

app.listen(app.get('port'),()=>{
    console.log(app.get('port'),'번 포트에서 대기 중');
});

// routes 폴더에서 weather.js 파일을 불러옵니다.
const weatherRouter = require('./routes/weather');

// app.use(...) 부분에 아래 코드를 추가하여 라우터를 연결합니다.
// 이제 /api/weather 경로로 들어오는 모든 요청은 weatherRouter가 처리합니다.
app.use('/api/weather', weatherRouter);