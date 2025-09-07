// routes/lookPost.js 
const express = require('express');
const router = express.Router();
const lookPostController = require('../controllers/lookPostControllers');
const { isLoggedIn } = require('../middlewares/authMiddleware'); // 기존 인증 미들웨어
const { upload } = require('../middlewares/uploadMiddleware'); // 파일 업로드 미들웨어

/**
 * @swagger
 * tags:
 *   name: LookPost
 *   description: "룩포스트 관련 API"
 */

// POST /api/lookPost — 이미지 + 게시글 업로드
/**
 * @swagger
 * /api/lookPost:
 *   post:
 *     summary: "룩포스트(이미지 + 게시글) 업로드"
 *     tags: [LookPost]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "업로드할 코디 이미지"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: "게시글 날짜(YYYY-MM-DD)"
 *               hour:
 *                 type: string
 *                 enum: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23']
 *                 description: "시간 (예보 기준)"
 *               si:
 *                 type: string
 *                 description: "지역 (시/도)"
 *               gungu:
 *                 type: string
 *                 description: "지역 (군/구)"
 *               apparent_temp:
 *                 type: string
 *                 enum: ['무더워요','더워요','따뜻해요','시원해요','쌀쌀해요','추워요']
 *                 description: "체감온도"
 *               apparent_humidity:
 *                 type: string
 *                 enum: ['습해요','괜찮아요','건조해요']
 *                 description: "체감습도"
 *               isPublic:
 *                 type: string
 *                 enum: ['true','false']
 *                 description: "공개 여부"
 *               comment:
 *                 type: string
 *                 maxLength: 40
 *                 description: "코디 한 줄 평"
 *     responses:
 *       201:
 *         description: "게시글 업로드 성공"
 *       400:
 *         description: "잘못된 요청 (필수값 누락, 유효성 실패 등)"
 *       500:
 *         description: "서버 오류"
 */
router.post('/', isLoggedIn, upload.single('image'), lookPostController.createPost);

// PUT /api/lookPost/:looktoday_id — 게시글 수정
/**
 * @swagger
 * /api/lookPost/{looktoday_id}:
 *   put:
 *     summary: "게시글 수정"
 *     tags: [LookPost]
 *     parameters:
 *       - in: path
 *         name: looktoday_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "수정할 게시글 ID"
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "새 이미지 (선택)"
 *               comment:
 *                 type: string
 *                 maxLength: 40
 *               apparent_temp:
 *                 type: string
 *                 enum: ['무더워요','더워요','따뜻해요','시원해요','쌀쌀해요','추워요']
 *               apparent_humidity:
 *                 type: string
 *                 enum: ['습해요','괜찮아요','건조해요']
 *               isPublic:
 *                 type: string
 *                 enum: ['true','false']
 *               si:
 *                 type: string
 *               gungu:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               hour:
 *                 type: string
 *                 enum: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23']

 *     responses:
 *       200:
 *         description: "게시글 수정 성공"
 *       403:
 *         description: "권한 없음"
 *       404:
 *         description: "게시글 없음"
 *       500:
 *         description: "서버 오류"
 */
router.put('/:looktoday_id', isLoggedIn, upload.single('image'), lookPostController.updatePost);

// DELETE /api/lookPost/:looktoday_id — 게시글 삭제
/**
 * @swagger
 * /api/lookPost/{looktoday_id}:
 *   delete:
 *     summary: "게시글 삭제"
 *     tags: [LookPost]
 *     parameters:
 *       - in: path
 *         name: looktoday_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "삭제할 게시글 ID"
 *     responses:
 *       200:
 *         description: "게시글 삭제 성공"
 *       403:
 *         description: "권한 없음"
 *       404:
 *         description: "게시글 없음"
 *       500:
 *         description: "서버 오류"
 */
router.delete('/:looktoday_id', isLoggedIn, lookPostController.deletePost);

module.exports = router;