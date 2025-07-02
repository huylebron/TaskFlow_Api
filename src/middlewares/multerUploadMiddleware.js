import multer from 'multer'
import { LIMIT_COMMON_FILE_SIZE, ALLOW_COMMON_FILE_TYPES, ALLOW_ATTACHMENT_FILE_TYPES } from '~/utils/validators'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'



// Function Kiểm tra loại file nào được chấp nhận cho card cover (existing)
const customFileFilter = (req, file, callback) => {
  console.log('Card Cover Multer File: ', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  })

  // Đối với thằng multer, kiểm tra kiểu file thì sử dụng mimetype
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
    console.error('❌ Card cover file type validation failed:', file.mimetype)
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }

  // Kiểm tra kích thước file
  if (file.size && file.size > LIMIT_COMMON_FILE_SIZE) {
    const errMessage = `File "${file.originalname}" exceeds maximum size of 10MB.`
    console.error('❌ Card cover file size validation failed:', file.size)
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }

  // Nếu như kiểu file hợp lệ:
  console.log('✅ Card cover file validation passed')
  return callback(null, true)
}

// 🚨 CRITICAL: Function kiểm tra loại file cho attachments
const attachmentFileFilter = (req, file, callback) => {
  // console.log('Attachment Multer File: ', file)

  // Kiểm tra kiểu file attachment
  if (!ALLOW_ATTACHMENT_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = `File "${file.originalname}" type is not supported. Allowed types: images, PDF, Office documents, text.`
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }
  
  // Kiểm tra kích thước file
  // Note: multer sẽ tự động check limits.fileSize, nhưng chúng ta kiểm tra thêm để có error message rõ ràng hơn
  if (file.size && file.size > LIMIT_COMMON_FILE_SIZE) {
    const errMessage = `File "${file.originalname}" exceeds maximum size of 10MB.`
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }

  // Nếu như kiểu file hợp lệ:
  return callback(null, true)
}

// Khởi tạo function upload được bọc bởi thằng multer cho card cover (existing)
const upload = multer({
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter,
  storage: multer.memoryStorage() // 🚨 CRITICAL: Lưu trong memory để upload lên Cloudinary
})

// 🚨 CRITICAL: Khởi tạo function upload cho attachments (multiple files)
const uploadAttachments = multer({
  limits: { 
    fileSize: LIMIT_COMMON_FILE_SIZE,
    files: 10 // Giới hạn tối đa 10 file cùng lúc để tránh DoS
  },
  fileFilter: attachmentFileFilter,
  storage: multer.memoryStorage() // Lưu trong memory để upload lên Cloudinary
})

export const multerUploadMiddleware = { 
  upload, // Existing upload for card covers
  uploadAttachments // New upload for attachments
}
