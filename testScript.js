// test-script.js

// 1. 필요한 모듈과 서비스를 불러옵니다.
const db = require('./models');
const lookPostService = require('./services/lookPostService');

// 2. 테스트 함수를 만듭니다.
async function testCreatePost() {
  try {
    console.log('테스트 시작...');
    await db.sequelize.authenticate(); // DB 연결 확인
    console.log('DB 연결 성공.');

    // 3. Postman으로 보낼 것처럼 가짜 데이터를 만듭니다.
    const fakeUser = { user_id: 11 }; // 로그인한 사용자 정보
     const fakeBody = {
      date: '2025-08-29', // 👈 9월 20일 -> 8월 29일로 수정
      hour: '21',         // 👈 22시 -> 21시로 수정
      si: '경기도',         // (이 값은 스크린샷과 일치하는 지역으로 가정)
      gungu: '오산시',      // (이 값은 스크린샷과 일치하는 지역으로 가정)
      apparent_temp: '시원해요',
      apparent_humidity: '괜찮아요',
      isPublic: 'true',
      comment: 'DB에 있는 시간으로 테스트',
    };
    // file 객체는 S3 로직을 테스트하는게 아니므로, DB 저장에 필요한 location만 흉내냅니다.
    const fakeFile = { location: 'fake-s3-url/test.jpg' };

    // 4. 서비스 함수를 직접 호출합니다.
    const result = await lookPostService.createPost(fakeUser, fakeBody, fakeFile);

    console.log('--- 테스트 성공! ---');
    console.log('생성된 게시물 정보:', result);

    // 5. DB에서 방금 만든 데이터를 직접 확인합니다.
    const createdPost = await db.Post.findByPk(result.looktoday_id);
    console.log('DB에 저장된 temperature 값:', createdPost.temperature);

  } catch (error) {
    console.error('--- 테스트 실패 ---');
    console.error(error);
  } finally {
    await db.sequelize.close(); // DB 연결 종료
  }
}

// 6. 테스트 함수를 실행합니다.
testCreatePost();