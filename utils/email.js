const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config(); 

//gmail SMTP 사용
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
    },
});

//이메일 발송 함수
const sendVerificationEmail = async (to, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, 
        to: to,
        subject: 'LookToday 이메일 인증 코드입니다.',
        text: `LookToday에 가입해 주셔서 감사합니다. 이메일 인증 코드는 ${verificationCode} 입니다.`,
        html: `<p>안녕하세요!</p>
               <p>LookToday에 가입해 주셔서 감사합니다. 아래 인증 코드를 입력하여 회원가입을 완료해주세요:</p>
               <h2><strong>${verificationCode}</strong></h2>
               <p>이 코드는 1시간 동안 유효합니다.</p>
               <p>감사합니다.</p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('이메일 전송 성공:', info.messageId, info.response);
        return true;
    } catch (error) {
        console.error('이메일 전송 실패:', error.message);
        return false;
    }
};

module.exports = { sendVerificationEmail };