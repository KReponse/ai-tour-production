// backend/src/utils/response.utils.js
// ✅ Authentication v2 - Response Utilities

export class ResponseUtils {
  static success(res, data) {
    return res.status(200).json(data);
  }

  static created(res, data) {
    return res.status(201).json(data);
  }

  static error(res, message, status = 400, extra = {}) {
    return res.status(status).json({
      success: false,
      message,
      ...extra
    });
  }
}

export default ResponseUtils;