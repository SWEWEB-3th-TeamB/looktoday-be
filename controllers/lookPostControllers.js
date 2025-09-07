// controllers/lookPostControllers.js
const lookPostService = require('../services/lookPostService');
const { ApiResponse } = require('../response');

// POST /api/lookPost — 이미지 + 게시글 업로드
exports.createPost = async (req, res) => {
    console.log('--- Request Body ---');   // 확인용 로그 
    console.log(req.body);
    console.log('--- Request File ---');
    console.log(req.file);
    console.log('--- Logged In User Info ---');
    console.log(req.user);

    try {
        const result = await lookPostService.createPost(req.user, req.body, req.file);

        return res.status(201).json(ApiResponse.success({
            message: '포스트가 성공적으로 업로드되었습니다.',
            result
        }));

    } catch (error) {
        console.error(error);
        const statusCode = error.statusCode || 500;
        
        return res.status(statusCode).json(ApiResponse.fail({
            message: error.message || "서버 오류로 인해 업로드에 실패했습니다.",
            error
        }));
    }
};

// PUT /api/lookPost/:looktoday_id — 게시글 수정
exports.updatePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params;

        await lookPostService.updatePost(looktoday_id, req.user, req.body, req.file);

        return res.status(200).json(ApiResponse.success({
            message: `게시물 ${looktoday_id}이 성공적으로 수정되었습니다.`
        }));

    } catch (error) {
        console.error(error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json(ApiResponse.fail({
            message: error.message || "서버 에러가 발생했습니다.",
            error
        }));
    }
};

// DELETE /api/lookPost/:looktoday_id — 게시글 삭제
exports.deletePost = async (req, res) => {
    try {
        const { looktoday_id } = req.params;
        await lookPostService.deletePost(looktoday_id, req.user);

        return res.status(200).json(ApiResponse.success({
            message: `게시물 ${looktoday_id}이 성공적으로 삭제되었습니다.`
        }));

    } catch (error) {
        console.error(error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json(ApiResponse.fail({
            message: error.message || "서버 에러가 발생했습니다.",
            error
        }));
    }
};
