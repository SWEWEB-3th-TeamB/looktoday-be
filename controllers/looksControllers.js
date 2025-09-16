const { Post, Like, Image, User, Weather } = require('../models');
const { ApiResponse } = require('../response');
const { Op } = require('sequelize');
const locationMap = require('../data/locationMap');

// --- weatherNow.js에서 가져온 헬퍼 함수들 ---
const PTY_LABEL = { '0': '강수 없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기', '5': '빗방울', '6': '빗방울/눈날림', '7': '눈날림' };
const LABELS = { T1H: { key: '기온', unit: '℃' }, REH: { key: '습도', unit: '%' }, PTY: { key: '강수형태', unit: '' }, RN1: { key: '1시간강수량', unit: 'mm' }, WSD: { key: '풍속', unit: 'm/s' } };
const getNxNy = (si, gungu) => (locationMap[si] || []).find(d => d.district === gungu) || null;
const buildWeatherPayload = (items) => {
  const byCat = {};
  for (const it of items) byCat[it.category] = String(it.obsrValue);
  const summary = {};
  for (const [cat, conf] of Object.entries(LABELS)) {
    if (byCat[cat] == null) continue;
    summary[conf.key] = cat === 'PTY' ? (PTY_LABEL[byCat.PTY] || `코드 ${byCat.PTY}`) : `${byCat[cat]}${conf.unit}`;
  }
  return summary;
};

// --- 날씨 필터 문자열을 Sequelize 조건 객체로 변환하는 헬퍼 함수 ---
const getWeatherCondition = (weatherFilter, minTemp, maxTemp) => {
  const condition = {};
  const extractNumbers = (str) => str.match(/-?\d+/g)?.map(Number);

  if (weatherFilter.includes('이하')) {
    condition.temperature = { [Op.lte]: extractNumbers(weatherFilter)[0] };
  } else if (weatherFilter.includes('이상')) {
    condition.temperature = { [Op.gte]: extractNumbers(weatherFilter)[0] };
  } else if (weatherFilter.includes('~')) {
    const [min, max] = extractNumbers(weatherFilter);
    condition.temperature = { [Op.between]: [min, max] };
  } else if (weatherFilter === 'custom') {
    const min = parseFloat(minTemp);
    const max = parseFloat(maxTemp);
    if (!isNaN(min) && !isNaN(max)) {
      condition.temperature = { [Op.between]: [min, max] };
    } else if (!isNaN(min)) {
      condition.temperature = { [Op.gte]: min };
    } else if (!isNaN(max)) {
      condition.temperature = { [Op.lte]: max };
    }
  }
  return condition;
};

// 필터링/정렬된 일반 목록 조회
exports.getLooks = async (req, res) => {
  try {
    const { sort = 'latest', page = 1, limit = 20, sido, gungu, date, weather, minTemp, maxTemp } = req.query;

    const where = {isPublic: true};
    if (sido) where.sido = sido;
    if (gungu) where.gungu = gungu;
    if (date) where.date = { [Op.eq]: new Date(date) };
    // 날씨 필터가 있을 경우, Post의 temperature 컬럼을 기준으로 where 조건 추가
    if (weather && weather !== '전체') {
      Object.assign(where, getWeatherCondition(weather, minTemp, maxTemp));
    }

    const paginatedResult = await Post.findAndCountAll({
      where,
      order: [sort === 'popular' ? ['like_count', 'DESC'] : ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      include: [
        { model: Image, attributes: ['imageUrl'] },
        { model: User, attributes: ['nickname'] }
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

// 게시물 상세 조회
exports.getLookDetail = async (req, res) => {
  try {
    const { looktoday_id } = req.params;
    const userId = req.user?.id;

    const post = await Post.findByPk(looktoday_id, {
      include: [
        { model: User, attributes: ['nickname'] },
        { model: Image, attributes: ['imageUrl'] },
      ]
    });

    if (!post) {
      return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
    }

    // 좋아요 여부 확인 로직 
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
      temperature: post.temperature, 
      feelsLikeTemp: post.apparent_temp, 
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
