const { ApiResponse } = require('../response');

exports.getLooks = (req, res) => {
    try {
        const { sort = 'latest', page = 1, limit = 20 } = req.query;
        let sortedLooks;

        if (sort === 'popular') {
            sortedLooks = [...allLooks].sort((a, b) => b.likeCount - a.likeCount);
        } else if (sort === 'latest') {
            sortedLooks = [...allLooks].sort((a, b) => b.date - a.date);
        } else {
            return res.status(400).json(ApiResponse.fail({ code: "LOOKS400", message: "sort 파라미터는 'popular' 또는 'latest'만 가능합니다." }));
        }

        const totalPosts = sortedLooks.length;
        const totalPages = Math.ceil(totalPosts / limit);
        const startIndex = (page - 1) * limit;
        const paginatedLooks = sortedLooks.slice(startIndex, startIndex + limit);

        const result = {
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPosts: totalPosts,
                totalPages: totalPages
            },
            looks: paginatedLooks
        };
        
        const message = sort === 'popular' ? "인기 룩 목록 조회 성공" : "최신 룩 목록 조회 성공";
        return res.status(200).json(ApiResponse.success({ code: "LOOKS200", message, result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

exports.likePost = (req, res) => {
    try {
        const { looktodayId } = req.params;
        const foundLook = allLooks.find(look => look.looktoday_id === parseInt(looktodayId));

        if (!foundLook) {
            return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
        }

        foundLook.likeCount += 1;
        foundLook.isLiked = true;

        const result = {
            looktodayId: foundLook.looktoday_id,
            likeCount: foundLook.likeCount,
            isLiked: foundLook.isLiked
        };
        
        return res.status(200).json(ApiResponse.success({ code: "LIKE201", message: "좋아요 처리가 완료되었습니다.", result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};

exports.unlikePost = (req, res) => {
    try {
        const { looktodayId } = req.params;
        const foundLook = allLooks.find(look => look.looktoday_id === parseInt(looktodayId));

        if (!foundLook) {
            return res.status(404).json(ApiResponse.fail({ code: "LOOKS404", message: "해당 게시물을 찾을 수 없습니다." }));
        }

        foundLook.likeCount -= 1;
        foundLook.isLiked = false;

        const result = {
            looktodayId: foundLook.looktoday_id,
            likeCount: foundLook.likeCount,
            isLiked: foundLook.isLiked
        };
        
        return res.status(200).json(ApiResponse.success({ code: "LIKE200", message: "좋아요 취소가 완료되었습니다.", result }));

    } catch (error) {
        return res.status(500).json(ApiResponse.fail({ code: "LOOKS500", message: error.message }));
    }
};