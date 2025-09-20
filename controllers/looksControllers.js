const { Post, Like, Image, User, Weather, UltraNowcast } = require('../models');
const { ApiResponse } = require('../response');
const { Op } = require('sequelize');

// 날씨 필터 문자열을 Sequelize 조건 객체로 변환하는 헬퍼 함수
const getWeatherCondition = (weatherFilter, minTemp, maxTemp) => {
  const condition = {};
  const extractNumbers = (str) => str.match(/-?\d+/g)?.map(Number);

  // UltraNowcast 모델의 온도 컬럼 'tmp'를 기준으로 조건을 생성
  if (weatherFilter.includes('이하')) {
    condition.tmp = { [Op.lte]: extractNumbers(weatherFilter)[0] };
  } else if (weatherFilter.includes('이상')) {
    condition.tmp = { [Op.gte]: extractNumbers(weatherFilter)[0] };
  } else if (weatherFilter.includes('~')) {
    const [min, max] = extractNumbers(weatherFilter);
    condition.tmp = { [Op.between]: [min, max] };
  } else if (weatherFilter === 'custom') {
    const min = parseFloat(minTemp);
    const max = parseFloat(maxTemp);
    if (!isNaN(min) && !isNaN(max)) {
      condition.tmp = { [Op.between]: [min, max] };
    } else if (!isNaN(min)) {
      condition.tmp = { [Op.gte]: min };
    } else if (!isNaN(max)) {
      condition.tmp = { [Op.lte]: max };
    }
  }
  return condition;
};

// 룩 목록 조회
exports.getLooks = async (req, res) => {
  try {
    const { sort = 'latest', page = 1, limit = 20, sido, gungu, date, weather, minTemp, maxTemp } = req.query;

    const where = {isPublic: true};
    if (sido) where.sido = sido;
    if (gungu) where.gungu = gungu;
    if (date) where.date = { [Op.eq]: new Date(date) };

    let postIds = null;

    // 날씨 필터가 있을 경우, UltraNowcast에서 조건에 맞는 Post의 ID 목록을 먼저 찾음
    if (weather && weather !== '전체') {
      const weatherCondition = getWeatherCondition(weather, minTemp, maxTemp);
      const ultraNowcasts = await UltraNowcast.findAll({
        where: weatherCondition,
        attributes: ['si', 'gungu', 'baseDate', 'baseTime'],
        raw: true,
      });

      if (ultraNowcasts.length === 0) {
        // 조건에 맞는 날씨가 없으면 빈 결과를 반환
        return res.status(200).json(ApiResponse.success({
          message: "조건에 맞는 게시물이 없습니다.",
          result: { pagination: { totalPosts: 0, totalPages: 0 }, looks: [] }
        }));
      }

      // 날씨 조건에 맞는 Post를 찾기 위한 조건들을 생성
      const timeLocationConditions = ultraNowcasts.map(uc => ({
        sido: uc.si,
        gungu: uc.gungu,
        date: uc.baseDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        hour: String(parseInt(uc.baseTime.slice(0, 2), 10)),
      }));

      where[Op.or] = timeLocationConditions;
    }

    const paginatedResult = await Post.findAndCountAll({
      where,
      order: [sort === 'popular' ? ['like_count', 'DESC'] : ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      include: [
        { model: Image, attributes: ['imageUrl'] },
        { model: Weather, as: 'weatherInfo', attributes: ['description'] },
        { model: User, attributes: ['nickname'] }
      ],
      distinct: true,
    });
    
    const result = {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPosts: paginatedResult.count,
        totalPages: Math.ceil(paginatedResult.count / limit)
      },
      looks: paginatedResult.rows
    };
    
    return res.status(200).json(ApiResponse.success({ message: "룩 목록 조회 성공", result }));

  } catch (error) {
    console.error(error);
    return res.status(500).json(ApiResponse.fail({ message: error.message }));
  }
};
// BEST 10 게시물 조회
exports.getBestLooks = async (req, res) => {
    try {
        const bestLooks = await Post.findAll({
            order: [['like_count', 'DESC']], 
            limit: 10,
            include: [
              { model: Image, attributes: ['imageUrl'] },
              { model: User, attributes: ['nickname'] }
            ]
        });

        return res.status(200).json(ApiResponse.success({ message: "인기 게시물(Best 10) 조회 성공", result: bestLooks }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ message: error.message }));
    }
};

// 내 게시물 조회
exports.getMine = async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.id;
    if (!userId) {
      return res.status(401).json(ApiResponse.fail({ code: "AUTH401", message: "로그인이 필요합니다." }));
    }
    const {
      page = 1,
      limit = 8,
      period,
      startDate,
      endDate
    } = req.query;

    const where = { user_id: userId };

    // 날짜 필터링 로직
    if (period) {
      const today = new Date();
      let calculatedStartDate;

      if (period === '12m') { // 최근 12개월
        calculatedStartDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      } else if (period === 'last_month') { // 저번달
        calculatedStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        where.date = { [Op.between]: [calculatedStartDate, endOfMonth] };
      } else if (period === 'prev_month') { // 저저번달
        calculatedStartDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 0);
        where.date = { [Op.between]: [calculatedStartDate, endOfMonth] };
      }

      if (period === '12m') {
        where.date = { [Op.gte]: calculatedStartDate };
      }

    } else if (startDate && endDate) { // 사용자 지정 기간
      where.date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const paginatedResult = await Post.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      include: [
        { model: Image, attributes: ['imageUrl'] },
      ],
      distinct: true
    });

    const result = {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPosts: paginatedResult.count,
        totalPages: Math.ceil(paginatedResult.count / limit)
      },
      looks: paginatedResult.rows
    };

    return res.status(200).json(ApiResponse.success({ message: "내 룩 목록 조회 성공", result }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(ApiResponse.fail({ message: error.message }));
  }
};

// 게시물 상세 조회
exports.getLookDetail = async (req, res) => {
  try {
    const { looktoday_id } = req.params;
    const userId = req.user?.id;

    const post = await Post.findByPk(looktoday_id, {
      include: [
        { model: User, attributes: ['nickname'] },
        { model: Image, attributes: ['imageUrl'] },
        // Post에 연결된 Weather(요약 정보)를 가져옵니다.
        { model: Weather, as: 'weatherInfo' }
      ]
    });

    if (!post) {
      return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
    }
    
    let isLiked = false;
    if (userId) {
      const existingLike = await Like.findOne({
        where: { user_id: userId, looktoday_id: post.looktoday_id }
      });
      if (existingLike) { isLiked = true; }
    }

    const result = {
      nickname: post.User ? post.User.nickname : null,
      imageUrl: post.Image ? post.Image.imageUrl : null,
      date: post.date,
      location: `${post.sido || ''} ${post.gungu || ''}`.trim(),
      // weatherInfo 객체에서 필요한 정보를 추출합니다.
      temperature: post.weatherInfo?.temperature, // Weather 모델에 temperature 컬럼이 있다고 가정
      feelsLikeTemp: post.apparent_temp,
      weatherDescription: post.weatherInfo ? post.weatherInfo.description : '날씨 정보 없음', 
      comment: post.comment,
      likeCount: post.like_count,
      isLiked: isLiked
    };

    return res.status(200).json(ApiResponse.success({ code: "LOOKS201", message: "게시물 상세 조회에 성공했습니다.", result }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(ApiResponse.fail({ message: error.message }));
  }
};

// 좋아요
exports.likePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params; 
        const user_id = req.user.user_id; 
        const existingLike = await Like.findOne({
            where: { user_id: user_id, looktoday_id: looktoday_id }
        });

        if (existingLike) {
            return res.status(409).json(ApiResponse.fail({ code: "LIKE409", message: "이미 좋아요를 누른 게시물입니다." }));
        }

        await Like.create({ user_id: user_id, looktoday_id: looktoday_id });
        await Post.increment('like_count', { where: { looktoday_id: looktoday_id } });

        const result = {
            looktoday_id: parseInt(looktoday_id),
            user_id: user_id,
            isLiked: true
        };
        
        return res.status(201).json(ApiResponse.success({ code: "LIKE201", message: "좋아요 처리가 완료되었습니다.", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

// 좋아요 취소
exports.unlikePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params; 
        const user_id = req.user.user_id;  

        const existingLike = await Like.findOne({
            where: { user_id: user_id, looktoday_id: looktoday_id }
        });

        if (!existingLike) {
            return res.status(404).json(ApiResponse.fail({ code: "LIKE404", message: "좋아요 기록을 찾을 수 없습니다." }));
        }

        await existingLike.destroy();
        await Post.decrement('like_count', { where: { looktoday_id: looktoday_id } });
        
        const result = {
            looktoday_id: parseInt(looktoday_id),
            user_id: user_id,
            isLiked: false
        };
        
        return res.status(200).json(ApiResponse.success({ code: "LIKE200", message: "좋아요 취소가 완료되었습니다.", result }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};
