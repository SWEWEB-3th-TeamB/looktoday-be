const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');
const { getAttributes } = require('../models/image');
const User = db.User;
const Post = db.Post;
const Like = db.Like;
const Image = db.Image;

//페이징 파서
function getPaging(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '8', 10), 1), 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

//기간 필터 파서
function buildDateFilter(query) {
  const { period, dateFrom, dateTo } = query;
  const now = new Date();
  let start, end;

  // 최근 12개월
  if (period === '12m') {
    start = new Date();
    start.setMonth(start.getMonth() - 12);
    end = now;
  }
  // 지난 달
  else if (period === 'last-month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }
  // 이번 달
  else if (period === 'this-month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  }
  // 달력 선택
  else if (dateFrom || dateTo) {
    start = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date();
    end = dateTo ? new Date(dateTo + 'T23:59:59') : now;
  }
  // 기본값: 최근 12개월
  else {
    start = new Date();
    start.setMonth(start.getMonth() - 12);
    end = now;
  }

  // 최근 5년으로 제한
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (start < fiveYearsAgo) start = fiveYearsAgo;

  return { createdAt: { [Op.gte]: start, [Op.lt]: end } };
}


exports.updateProfile = async (req, res) => {
    try {
        const { email,currentPassword, newPassword, confirmPassword, nickname, birth, si, gungu} = req.body;

        const me = await User.findByPk(req.user.id);
        if (!me) return res.status(404).json({ 
            httpStatus: 'NOT_FOUND', 
            isSuccess: false,
            message: '사용자를 찾을 수 없습니다.'});

            if (email && email !== me.email) {
              const existingUserByEmail = await User.findOne ({ where: {email}});
              if(existingUserByEmail) {
                return res.status(409).json({
                  isSuccess: false,
                  message: '이미 가입된 이메일 주소입니다. '
                });
              }
              me.email = email;
            }

            if (nickname && nickname !== me.nickname) {
              const existingUserByNickname = await User.findOne({ where: {nickname}});
              if(existingUserByNickname) {
                return res.status(409).json({
                  isSuccess: false,
                  message: '이미 사용 중인 닉네임입니다.'
                });
              }
              me.nickname = nickname;
            }

            if (birth) {
              const parsedDateOfBirth = new Date(birth);
              if (isNaN(parsedDateOfBirth.getTime())) {
                return res.status(400).json({
                  isSuccess: false,
                  message: '유효하지 않은 생년월일 형식입니다. YYYY/MM/DD 형식으로 입력해주세요.'
                });
              }
              me.birth = parsedDateOfBirth;
            }

            if(si) {
             me.si = si;
            }
        
            if(gungu) {
             me.gungu = gungu;
            }

            //비밀번호 변경
            if (currentPassword || newPassword || confirmPassword) {
              const bcrypt = require('bcrypt');

              //현재 비밀번호 입력
              if(!currentPassword) {
                return res.status(400).json({
                  httpStatus: 'BAD_REQUEST',
                  isSuccess: false,
                  message: '비밀번호가 일치하지 않습니다.'
                });
              }
              
              //현재 비밀번호 일치 확인
              const isMatch = await bcrypt.compare(currentPassword, me.password);
              if(!isMatch) {
                return res.status(400).json({
                  httpStatus: 'BAD_REQUEST',
                  isSuccess: false,
                  message: '현재 비밀번호가 일치하지 않습니다.'
                })
              }

              //새 비밀번호 형식 확인
              const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
              if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                  httpStatus: 'BAD_REQUEST',
                  isSuccess: false,
                  message: '올바른 비밀번호 형식이 아닙니다.'
                });
              }

              //새 비밀번호와 확인 일치 여부
              if (newPassword !== confirmPassword) {
                return res.status(400).json({
                  httpStatus: 'BAD_REQUEST',
                  isSuccess:false,
                  message: '비밀번호가 일치하지 않습니다. '
                })
              }

              //비밀번호 해싱
              me.password = await bcrypt.hash(newPassword, 10);

            }

            console.log(me);
            await me.save();

            return res.json({
                httpStatus: 'OK',
                isSuccess: true,
                message: '프로필이 성공적으로 수정되었습니다.',
                result: {
                    user_id: me.user_id,
                    email: me.email,
                    nickname: me.nickname,
                    birth: me.birth,
                    si: me.si,
                    gungu: me.gungu
                 }
             });
          } catch (e) {
             console.error(e);
              return res.status(500).json({ 
                httpStatus: 'INTERNAL_SERVER_ERROR', 
                isSuccess: false, 
                message: '서버 오류입니다.' });
  }
};


exports.getMyFeeds = async (req, res) => {
  try {
    const { page, limit, offset } = getPaging(req);
    const dataFilter = buildDateFilter(req.query);

    const whereClause = { user_id: req.user.id, ...dataFilter };

    const { rows, count } = await Post.findAndCountAll({
      where: whereClause,
      attributes: [
        'looktoday_id',
        'sido',          // 시/도
        'gungu',         // 군/구
        'apparent_temp', // 체감온도
        'apparent_humidity', // 체감습도
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, attributes: [['nickname', 'userNickname']] },
        { model: db.Image, attributes: ['imageUrl'] }
      ],
      distinct: true
    });

    // likeCount & isLiked 계산
    const myLooks = await Promise.all(
      rows.map(async (l) => {
        const likeCount = await Like.count({ where: { looktoday_id: l.looktoday_id } });
        const isLiked = await Like.findOne({
          where: { looktoday_id: l.looktoday_id, user_id: req.user.id }
        }).then((x) => !!x);

        return {
          looktoday_id: l.looktoday_id,
          imageUrl: l.Image ? l.Image.imageUrl : null,
          sido: l.sido,
          gungu: l.gungu,
          apparent_temp: l.apparent_temp,
          apparent_humidity: l.apparent_humidity,
          likeCount,
          isLiked,
          createdAt: l.createdAt,
          userNickname: l.User ? l.User.userNickname : null
        };
      })
    );

    // 어떤 필터를 사용했는지
    let filter = { type: 'period', value: '12m' };
    if (req.query.month) filter = { type: 'month', value: req.query.month };
    else if (req.query.dateFrom || req.query.dateTo) {
      filter = {
        type: 'range',
        value: `${req.query.dateFrom || '2020-01-01'}~${req.query.dateTo || '오늘'}`
      };
    } else if (req.query.period) {
      filter = { type: 'period', value: req.query.period };
    }

    return res.json({
      httpStatus: 'OK',
      isSuccess: true,
      message: '내 피드 조회에 성공했습니다.',
      result: {
        filter,
        pagination: {
          page,
          limit,
          totalPosts: count,
          totalPages: Math.ceil(count / limit)
        },
        myLooks
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      httpStatus: 'INTERNAL_SERVER_ERROR',
      isSuccess: false,
      message: '서버 오류입니다.'
    });
  }
};

exports.getMyLikes = async (req, res) => {
  try {
    const { page, limit, offset } =getPaging(req);
    const dataFilter = buildDateFilter(req.query);

    const whereClause = { user_id: req.user.id, ...dataFilter };

    const {rows, count} = await Like.findAndCountAll({
      include: [
        {
          model: Post,
          attributes: ['looktoday_id', 'sido', 'gungu', 'apparent_temp', 'createdAt'],
          include: [
            { model: Image, attributes: ['imageUrl'] },
            { model: User, attributes: ['nickname'] },
          ],
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    const myLikes = await Promise.all(
      rows.map(async (like) => {
        const post = like.Post;
        const likeCount = await Like.count({ 
          where: {looktoday_id: post.looktoday_id}});
        const isLiked = true; // 내가 좋아요한 것만
        return {
          looktoday_id: post.looktoday_id,
          imageUrl: post.Image?.imageUrl || null,
          sido: post.sido,
          gungu: post.gungu,
          weather: post.apparent_temp,
          likeCount,
          isLiked,
        };
      })
    );

        // 어떤 필터를 사용했는지
    let filter = { type: 'period', value: '12m' };
    if (req.query.month) filter = { type: 'month', value: req.query.month };
    else if (req.query.dateFrom || req.query.dateTo) {
      filter = {
        type: 'range',
        value: `${req.query.dateFrom || '2020-01-01'}~${req.query.dateTo || '오늘'}`
      };
    } else if (req.query.period) {
      filter = { type: 'period', value: req.query.period };
    }

    return res.json({
      httpStatus: 'OK',
      isSuccess: true,
      message: '내가 좋아요 한 게시물 목록 조회에 성공했습니다. ',
      result: {
        filter,
        pagination: {
          page,
          limit,
          totalPosts: count,
          totalPages: Math.ceil(count / limit),
      },
      myLikes,
    },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      httpStatus: 'INTERNAL_SERVER_ERROR',
      isSuccess: false,
      message: '서버 오류입니다.',
    });
  }
};

// 내 룩 삭제하기
exports.deleteMyLook = async (req, res) => {
  try {

    const { looktoday_id } = req.params;

    // 내가 쓴 글인지 확인
    const post = await Post.findOne({
      where: { looktoday_id: looktoday_id, user_id: req.user.id },
      include: [{ model: db.Image }], // 모델 import 맞게 확인
    });

    if (!post) {
      return res.status(404).json({
        httpStatus: 'NOT_FOUND',
        isSuccess: false,
        message: '해당 게시물을 찾을 수 없습니다.',
      });
    }

    // post에 연결된 이미지도 삭제
    if (post.Images && post.Images.length > 0) { 
      for (const img of post.Images) {
        await img.destroy(); // DB에서 완전 삭제
      }
    }

    // post 삭제 (DB에서 완전 삭제)
    await post.destroy({ force: true }); // 물리삭제

    return res.json({
      httpStatus: 'OK',
      isSuccess: true,
      message: '게시물이 삭제되었습니다.',
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      httpStatus: 'INTERNAL_SERVER_ERROR',
      isSuccess: false,
      message: '서버 오류입니다.',
    });
  }
};





