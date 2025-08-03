class CustomSuccess {
  constructor(code, message, result = {}) {
    this.code = code;
    this.message = message;
    this.result = result;
  }
}

module.exports = { CustomSuccess };
