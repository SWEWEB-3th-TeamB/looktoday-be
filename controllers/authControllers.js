const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); 
const dotenv = require('dotenv'); 
const db = require('../models');
const jwt = require('jsonwebtoken');

const User = db.User;             
const { sendVerificationEmail } = require('../utils/email'); // 이메일 발송 유틸리티 임포트.

dotenv.config(); // .env 파일 로드

// --- 이메일 중복 확인 컨트롤러 함수 (GET /api/auth/check-email) ---
exports.checkEmail = async (req, res) => {
    const email = req.query.email;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }

    try {
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(200).json({ isAvailable: false, message: '이미 사용 중인 이메일입니다.' });
        } else {
            return res.status(200).json({ isAvailable: true, message: '사용 가능한 이메일입니다.' });
        }
    } catch (error) {
        console.error('이메일 중복 확인 중 서버 오류 발생:', error);
        return res.status(500).json({ message: '이메일 중복 확인 중 서버 오류가 발생했습니다.' });
    }
};

// --- 닉네임 중복 확인 컨트롤러 함수 (GET /api/auth/check-username) ---
exports.checkNickname = async (req, res) => {
    const nickname = req.query.nickname; 

    if (!nickname || typeof nickname !== 'string') {
        return res.status(400).json({ message: '유효하지 않은 닉네임 형식입니다.' });
    }

    try {
        const existingUser = await User.findOne({ where: { nickname } }); // nickname 필드로 조회

        if (existingUser) {
            return res.status(200).json({ isAvailable: false, message: '이미 사용 중인 닉네임입니다.' });
        } else {
            return res.status(200).json({ isAvailable: true, message: '사용 가능한 닉네임입니다.' });
        }
    } catch (error) {
        console.error('닉네임 중복 확인 중 서버 오류 발생:', error);
        return res.status(500).json({ message: '닉네임 중복 확인 중 서버 오류가 발생했습니다.' });
    }
};

// --- 회원가입 처리 컨트롤러 함수 (POST /api/auth/signup) ---
exports.signup = async (req, res) => {
    const { email, password, confirmPassword, nickname, birth, si, gungu } = req.body;

    try {
        if (!email || !password || !confirmPassword || !nickname || !birth) {
            return res.status(400).json({ message: '모든 필수 정보를 입력해주세요.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.' });
        }

        const existingUserByEmail = await User.findOne({ where: { email } });
        if (existingUserByEmail) {
            return res.status(409).json({ message: '이미 가입된 이메일 주소입니다.' });
        }

        const existingUserByNickname = await User.findOne({ where: { nickname } });
        if (existingUserByNickname) {
            return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
        }

        const parsedDateOfBirth = new Date(birth);
        if (isNaN(parsedDateOfBirth.getTime())) {
            return res.status(400).json({ message: '유효하지 않은 생년월일 형식입니다. YYYY/MM/DD 형식으로 입력해주세요.' });
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

        return res.status(201).json({
            message: '회원가입이 완료되었습니다.',
            user_id: newUser.user_id
        });

    } catch (error) {
        console.error('회원가입 중 서버 오류 발생:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: '중복된 이메일 또는 닉네임이 존재합니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};


// --- 로그인 컨트롤러 함수 (POST /api/auth/login) ---

exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 필수 입력값 확인
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }

    try {
        // 이메일로 사용자 조회
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: '존재하지 않는 계정입니다.' });
        }

        // 비밀번호 비교
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        // JWT 발급
         const token = jwt.sign(
             { user_id: user.user_id, email: user.email },  // 토큰 payload
             process.env.JWT_SECRET,              // 비밀키
              { expiresIn: '1h' }                   // 만료 시간
         );

         console.log('토큰에 담긴 정보:', { user_id: user.user_id, email: user.email });

        return res.json({
             message: '로그인에 성공했습니다.',
             token, // 토큰 추가
             user: {
              user_id: user.user_id,
              email: user.email,
              nickname: user.nickname,
              birth: user.birth,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '서버 오류입니다.' });
  }
};

// --- 로그아웃 컨트롤러 함수 (POST /api/auth/logout) ---
exports.logout = async (req, res) => {
    try {
        // 클라이언트에서 토큰 삭제만으로 로그아웃 처리 (서버는 상태 유지하지 않음)
        return res.status(200).json({ message: '로그아웃 되었습니다.' });
    } catch (error) {
        console.error('로그아웃 중 서버 오류 발생:', error);
        return res.status(500).json({ message: '로그아웃 중 서버 오류가 발생했습니다.' });
    }
};