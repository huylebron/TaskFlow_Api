/**
 * Updated by trungquandev.com's author on Oct 18 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { WHITELIST_DOMAINS } from '~/utils/constants'
import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// Cấu hình CORS Option trong dự án thực tế (Video số 62 trong chuỗi MERN Stack Pro)
export const corsOptions = {
  origin: function (origin, callback) {
    // Nếu môi trường là local dev thì cho qua luôn
    if (env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    // Ngược lại thì hiện tại code chúng ta đang làm còn 1 trường hợp là:
    // env.BUILD_MODE === 'production'
    if (!origin) {
      return callback(null, true)
    }

    // Kiểm tra xem origin có phải là domain được chấp nhận hay không
    if (WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true)
    }
    
    // Log để debug
    //console.log('🚨 CORS blocked origin:', origin)
    //console.log('🔍 Allowed domains:', WHITELIST_DOMAINS)


    // Cuối cùng nếu domain không được chấp nhận thì trả về lỗi
    return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`))
  },

  // Some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,

  // CORS sẽ cho phép nhận cookies từ request, (Nhá hàng :D | Ở khóa MERN Stack Advance nâng cao học trực tiếp mình sẽ hướng dẫn các bạn đính kèm jwt access token và refresh token vào httpOnly Cookies)
  credentials: true
}
