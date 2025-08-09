const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); 
const dotenv = require('dotenv'); 
const db = require('../models');  
const User = db.User;             
const { sendVerificationEmail } = require('../utils/email'); // 이메일 발송 유틸리티 임포트

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
    const { email, password, confirmPassword, nickname, dateOfBirth, latitude, longitude } = req.body;

    try {
        if (!email || !password || !confirmPassword || !nickname || !dateOfBirth) {
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

        const parsedDateOfBirth = new Date(dateOfBirth);
        if (isNaN(parsedDateOfBirth.getTime())) {
            return res.status(400).json({ message: '유효하지 않은 생년월일 형식입니다. YYYY/MM/DD 형식으로 입력해주세요.' });
        }
        
        //비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        //이메일 인증 코드 생성 및 만료 시간 설정
        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const verificationExpiresAt = new Date(Date.now() + 3600000); // 1시간 후 만료
        
        //사용자 레코드 생성
        const newUser = await User.create({
            email,
            password: hashedPassword,
            nickname,
            dateOfBirth: parsedDateOfBirth,
            latitude,
            longitude,
            verificationCode,
            isVerified: false,
            verificationExpiresAt
        });

        // 이메일 발송 함수 호출 추가
        const emailSent = await sendVerificationEmail(newUser.email, newUser.verificationCode);

        if (!emailSent) {
            // 이메일 발송 실패 시 처리 
            console.error('인증 이메일 발송에 실패했습니다.');
            return res.status(500).json({
                message: '인증 이메일 발송에 실패했습니다. ',
                userId: newUser.id
            });
        }

        return res.status(201).json({
            message: '회원가입 요청이 성공적으로 처리되었습니다. 이메일로 발송된 인증 코드를 확인해주세요.',
            userId: newUser.id
        });

    } catch (error) {
        console.error('회원가입 중 서버 오류 발생:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: '중복된 이메일 또는 닉네임이 존재합니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// --- 이메일 인증 컨트롤러 함수 (POST /api/auth/verify-email) ---
exports.verifyEmail = async (req, res) => {
    const { email, code } = req.body; // 요청 본문에서 email과 code 추출

    try {
        //사용자 찾기
        const user = await User.findOne({ where: { email } }); // Sequelize는 where 절 필요

        //사용자 존재 여부 확인
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        //이미 인증된 계정인지
        if (user.isVerified) {
            return res.status(400).json({ message: '이미 인증된 계정입니다.' });
        }

        //인증 코드 일치 여부
        if (user.verificationCode !== code) { 
            return res.status(400).json({ message: '잘못된 인증 코드입니다.' });
        }

        //인증 코드 만료 여부
        if (user.verificationExpiresAt < new Date()) {
            return res.status(400).json({ message: '인증 코드가 만료되었습니다. 재인증이 필요합니다.' }); // 메시지 수정
        }

        // 모든 검증 통과 시 사용자 정보 업데이트
        user.isVerified = true;
        user.verificationCode = null;   
        user.verificationExpiresAt = null; 
        await user.save(); // 변경 사항 저장

        // 7. 성공 응답
        res.status(200).json({ message: '이메일 인증이 완료되었습니다. 이제 서비스 이용이 가능합니다.' });

    } catch (error) {
        console.error('이메일 인증 중 서버 오류 발생:', error);
        res.status(500).json({ message: '이메일 인증 중 서버 오류가 발생했습니다.' });
    }
};

// --- 로그인 컨트롤러 함수 (POST /api/auth/login) ---

exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 1. 필수 입력값 확인
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }

    try {
        // 2. 이메일로 사용자 조회
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: '존재하지 않는 계정입니다.' });
        }

        // 3. 이메일 인증 여부 확인
        if (!user.isVerified) {
            return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.' });
        }

        // 4. 비밀번호 비교
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        // 5. 로그인 성공 응답
        return res.status(200).json({
            message: '로그인에 성공했습니다.',
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                location: user.location,
                dateOfBirth: user.dateOfBirth,
            }
        });

    } catch (error) {
        console.error('로그인 중 서버 오류 발생:', error);
        return res.status(500).json({ message: '로그인 중 서버 오류가 발생했습니다.' });
    }
};