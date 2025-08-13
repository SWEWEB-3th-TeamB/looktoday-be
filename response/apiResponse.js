const { CustomSuccess } = require("./customSuccess.js");
const { CustomError } = require("./customError.js");

class ApiResponse {
  static success({
    code = "COMMON200",
    message = "요청에 성공했습니다.",
    result = {},
  }) {
    return new CustomSuccess(code, message, result);
  }

  static fail({
    code = "COMMON400",
    message = "요청에 실패했습니다.",
    error = {},
  }) {
    return new CustomError(code, message, error);
  }
}

module.exports = { ApiResponse };
