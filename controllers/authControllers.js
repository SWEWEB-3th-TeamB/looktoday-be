const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); 
const dotenv = require('dotenv'); 
const db = require('../models');
const jwt = require('jsonwebtoken');

const User = db.User;             
const { sendVerificationEmail } = require('../utils/email'); // 이메일 발송 유틸리티 임포트.
const { ApiResponse } = require('../response');

dotenv.config(); // .env 파일 로드

// --- 이메일 중복 확인 컨트롤러 함수 (GET /api/auth/check-email) ---
exports.checkEmail = async (req, res) => {
    const email = req.query.email;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res
        .status(400)
        .json(ApiResponse.fail({ 
            code: "USER400",
            message: '유효하지 않은 이메일 형식입니다.',
            error: {} 
        }));
    }

    try {
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res
            .status(200)
            .json(ApiResponse.success({ 
                code: "AUTH200",
                message: '이미 사용 중인 이메일입니다.',
                result: { isAvailable: false }}));
        } else {
            return res
            .status(200)
            .json(ApiResponse.success({ 
                code: "AUTH200",
                message: '사용 가능한 이메일입니다.',
                result: { isAvailable: true } }));
        }
    } catch (err) {
        console.error('이메일 중복 확인 중 서버 오류 발생:', err);
        return res
        .status(500)
        .json(ApiResponse.fail({ 
            code: "COMMON500",
            message: '이메일 중복 확인 중 서버 오류가 발생했습니다.',
            error: { detail: err.message }}));
    }
};

// --- 닉네임 중복 확인 컨트롤러 함수 (GET /api/auth/check-username) ---
exports.checkNickname = async (req, res) => {
    const nickname = req.query.nickname; 

    if (!nickname || typeof nickname !== 'string') {
        return res
        .status(400)
        .json(ApiResponse.fail({ 
            code: "USER400",
            message: '유효하지 않은 닉네임 형식입니다.',
            error: {}
    }));
    }

    try {
        const existingUser = await User.findOne({ where: { nickname } }); // nickname 필드로 조회

        if (existingUser) {
            return res
            .status(200)
            .json(ApiResponse.success({ 
                code: "USER200",
                message: '이미 사용 중인 닉네임입니다.',
                result: { isAvailable: false }}));
        } else {
            return res
            .status(200)
            .json(ApiResponse.success({ 
                code: "USER200",
                message: '사용 가능한 닉네임입니다.',
                result: { isAvailable: true }}));
        }
    } catch (err) {
        console.error('닉네임 중복 확인 중 서버 오류 발생:', err);
        return res
        .status(500)
        .json(ApiResponse.fail({ 
            code: "COMMON500",
            message: '닉네임 중복 확인 중 서버 오류가 발생했습니다.',
            error: { detail: err.message }
         }));
    }
};

// --- 회원가입 처리 컨트롤러 함수 (POST /api/auth/signup) ---
exports.signup = async (req, res) => {
    const { email, password, confirmPassword, nickname, birth, si, gungu } = req.body;

    try {
        if (!email || !password || !confirmPassword || !nickname || !birth) {
            return res
            .status(400)
            .json(ApiResponse.fail({ 
                code: "USER400",
                message: '모든 필수 정보를 입력해주세요.',
                error: {} 
            }));
        }

        if (password !== confirmPassword) {
            return res
            .status(400)
            .json(ApiResponse.fail({ 
                code: "USER400",
                message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
                error: {} 
            }));
        }

        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if(!passwordRegex.test(password)) {
            return res
            .status(400)
            .json(ApiResponse.fail({ 
                code: "USER400",
                message: '올바른 비밀번호 형식이 아닙니다.',
                error: {} 
            }));
        }

        const existingUserByEmail = await User.findOne({ where: { email } });
        if (existingUserByEmail) {
            return res
            .status(409)
            .json(ApiResponse.fail({
                code: "USER409",
                message: '이미 가입된 이메일 주소입니다.',
                error: {} 
            }));
        }

        const existingUserByNickname = await User.findOne({ where: { nickname } });
        if (existingUserByNickname) {
            return res
            .status(409)
            .json(ApiResponse.fail({ 
                code: "USER409",
                message: '이미 사용 중인 닉네임입니다.',
                error: {}
             }));
        }

        const parsedDateOfBirth = new Date(birth);
        if (isNaN(parsedDateOfBirth.getTime())) {
            return res
            .status(400)
            .json(ApiResponse.fail({ 
                code: "USER400",
                message: '유효하지 않은 생년월일 형식입니다. YYYY/MM/DD 형식으로 입력해주세요.',
                error: {} 
            }));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 레코드 생성 
        const newUser = await User.create({
            email,
            password: hashedPassword,
            nickname,
            birth: parsedDateOfBirth,
            si,
            gungu
        });

        return res
        .status(201)
        .json(ApiResponse.success({
            code:"USER201",
            message: '회원가입이 완료되었습니다.',
            result: { user_id: newUser.user_id },
        }));

    } catch (err) {
        console.error('회원가입 중 서버 오류 발생:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res
            .status(409)
            .json(ApiResponse.fail({ 
                code: "USER409",
                message: '중복된 이메일 또는 닉네임이 존재합니다.',
                error: { detail: err.message }
            }));
        }
        return res
        .status(500)
        .json(ApiResponse.fail({ 
            code: "COMMON500",
            message: '서버 오류가 발생했습니다.',
            error: { detail: err.message } }));
    }
};


// --- 로그인 컨트롤러 함수 (POST /api/auth/login) ---

exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 필수 입력값 확인
    if (!email || !password) {
        return res
        .status(400)
        .json(ApiResponse.fail({ 
            code: "AUTH400",
            message: '이메일과 비밀번호를 모두 입력해주세요.',
            error: {} 
        }));
    }

    try {
        // 이메일로 사용자 조회
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res
            .status(404)
            .json(ApiResponse.fail({ 
                code: "AUTH400",
                message: '존재하지 않는 계정입니다.',
                error: {}
             }));
        }

        // 비밀번호 비교
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
            .status(401)
            .json(ApiResponse.fail({ 
                code: "AUTH401",
                message: '비밀번호가 일치하지 않습니다.',
                error: {} 
            }));
        }

        // JWT 발급
         const token = jwt.sign(
             { user_id: user.user_id, email: user.email },  // 토큰 payload
             process.env.JWT_SECRET,              // 비밀키
              { expiresIn: '1h' }                   // 만료 시간
         );

         console.log('토큰에 담긴 정보:', { user_id: user.user_id, email: user.email });

        return res
        .status(200)
        .json(ApiResponse.success({
            code: "AUTH200",
            message: '로그인에 성공했습니다.',
            result: {
            token, // 토큰 추가
             user: {
              user_id: user.user_id,
              email: user.email,
              nickname: user.nickname,
              birth: user.birth,
             },
      },
    }));

  } catch (error) {
    console.error(error);
    return res
    .status(500)
    .json(ApiResponse.fail({ 
        code: "COMMON500",
        message: '서버 오류입니다.',
        error: {} 
    }));
  }
};

// --- 로그아웃 컨트롤러 함수 (POST /api/auth/logout) ---
exports.logout = async (req, res) => {
    try {
        // 클라이언트에서 토큰 삭제만으로 로그아웃 처리 (서버는 상태 유지하지 않음)
        return res
        .status(200)
        .json(ApiResponse.success({ 
            code: "AUTH200",
            message: '로그아웃 되었습니다.' }));
    } catch (err) {
        console.error('로그아웃 중 서버 오류 발생:', err);
        return res
        .status(500)
        .json(ApiResponse.fail({ 
            code: "COMMON500",
            message: '로그아웃 중 서버 오류가 발생했습니다.',
            error: { detail: err.message } }));
    }
};

// --- 1단계: 사용자 확인 컨트롤러 함수 (POST /api/auth/verify-user) ---
exports.verifyUser = async (req, res) => {
    const { email, birth } = req.body;
    const parsedBirth = new Date(birth);

    const user = await User.findOne({ where: { email, birth: parsedBirth } });
    if (!user) {
        return res
        .status(404)
        .json(ApiResponse.fail({
            code: "USER404",
            message: "이메일 또는 생년월일이 일치하지 않습니다.",
            error: {}
         }));
    }

    // 세션에 사용자 정보 저장
    req.session.resetUser = { email, birth: parsedBirth };

    return res
    .status(200)
    .json(ApiResponse.success({ 
        code: "USER200",
        message: "사용자 확인 완료",
        error: {} }));
};

// --- 2단계: 비밀번호 변경 컨트롤러 함수 (POST /api/auth/reset-password) ---
exports.resetPassword = async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (!req.session.resetUser) {
        return res
        .status(400)
        .json(ApiResponse.fail({ 
            code: "USER400",
            message: "사용자 확인이 필요합니다.",
            error: {} }));
    }

    const { email, birth } = req.session.resetUser;

    const user = await User.findOne({ where: { email, birth } });
    if (!user) {
        return res
        .status(404)
        .json(ApiResponse.fail({ 
            code: "USER404",
            message: "사용자를 찾을 수 없습니다.",
            error: {} }));
    }

    if (newPassword !== confirmPassword) {
        return res
        .status(400)
        .json(ApiResponse.fail({ 
            code: "USER400",
            message: "비밀번호가 일치하지 않습니다.",
            error: {} }));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // 세션 제거
    delete req.session.resetUser;

    return res
    .status(200)
    .json(ApiResponse.success({ 
        code: "USER200",
        message: "비밀번호 변경 완료",
        error: {} }));
};