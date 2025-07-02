/**
 * Updated by trungquandev.com's author on Oct 8 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/
export const OBJECT_ID_RULE_MESSAGE = 'Your string fails to match the Object Id pattern!'

// Một vài biểu thức chính quy - Regular Expression và custom message.
// Về Regular Expression khá hại não: https://viblo.asia/p/hoc-regular-expression-va-cuoc-doi-ban-se-bot-kho-updated-v22-Az45bnoO5xY
export const FIELD_REQUIRED_MESSAGE = 'This field is required.'
export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const EMAIL_RULE_MESSAGE = 'Email is invalid. (example@trungquandev.com)'
export const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PASSWORD_RULE_MESSAGE = 'Password must include at least 1 letter, a number, and at least 8 characters.'

export const LIMIT_COMMON_FILE_SIZE = 10485760 // byte = 10 MB
export const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png']

// 🚨 CRITICAL: ATTACHMENT FILE TYPES - PHẢI SYNC VỚI FRONTEND
// Copy chính xác từ web/src/utils/validators.js để đảm bảo consistency
export const ALLOW_ATTACHMENT_FILE_TYPES = [
  // Images
  'image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
  // Documents
  'application/pdf', 
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PowerPoint
  'text/plain' // Text
]

// Validation cho attachment file data
export const validateAttachmentFile = (file) => {
  if (!file || !file.originalname || !file.size || !file.mimetype) {
    return 'File data is incomplete.'
  }
  
  if (file.size > LIMIT_COMMON_FILE_SIZE) {
    return `File "${file.originalname}" exceeds maximum size of 10MB.`
  }
  
  if (!ALLOW_ATTACHMENT_FILE_TYPES.includes(file.mimetype)) {
    return `File "${file.originalname}" type is not supported. Allowed types: images, PDF, Office documents, text.`
  }
  
  return null
}

// Validation cho multiple attachment files
export const validateMultipleAttachmentFiles = (files) => {
  if (!files || files.length === 0) {
    return 'Please select at least one file.'
  }
  
  for (let i = 0; i < files.length; i++) {
    const error = validateAttachmentFile(files[i])
    if (error) {
      return error
    }
  }
  
  return null
}
