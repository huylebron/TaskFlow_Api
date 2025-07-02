/**
 * Attachment Validation for Taskflow project
 * Handles validation for attachment upload and operations
 */

import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, validateMultipleAttachmentFiles } from '~/utils/validators'

/**
 * Validation cho việc upload attachments
 */
const uploadAttachments = async (req, res, next) => {
  // Validate cardId trong params
  const correctCondition = Joi.object({
    cardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    // Validate params
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    
    // Validate files - kiểm tra có files hay không
    if (!req.files || req.files.length === 0) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Please select at least one file to upload.')
    }

    // Validate từng file bằng helper function
    const filesValidationError = validateMultipleAttachmentFiles(req.files)
    if (filesValidationError) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, filesValidationError)
    }

    // Nếu validation thành công, tiếp tục
    next()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Handle Joi validation errors
    const errorMessage = error?.details?.map(detail => detail.message)?.join(', ') || error.message
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
  }
}

/**
 * Validation cho việc lấy danh sách attachments của card
 */
const getAttachments = async (req, res, next) => {
  const correctCondition = Joi.object({
    cardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error?.details?.map(detail => detail.message)?.join(', ') || error.message
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
  }
}

/**
 * Validation cho việc xóa một attachment
 */
const deleteAttachment = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error?.details?.map(detail => detail.message)?.join(', ') || error.message
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
  }
}

/**
 * Validation cho việc download attachment
 */
const downloadAttachment = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error?.details?.map(detail => detail.message)?.join(', ') || error.message
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
  }
}

/**
 * Validation cho việc cập nhật attachment metadata (nếu cần)
 */
const updateAttachment = async (req, res, next) => {
  // Validate params
  const paramsCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  // Validate body - chỉ cho phép cập nhật một số field nhất định
  const bodyCondition = Joi.object({
    name: Joi.string().optional().min(1).max(255),
    // Không cho phép cập nhật url, type, size, cardId, cloudinaryPublicId vì đây là metadata quan trọng
  })

  try {
    await paramsCondition.validateAsync(req.params, { abortEarly: false })
    
    // Nếu có body thì validate
    if (req.body && Object.keys(req.body).length > 0) {
      await bodyCondition.validateAsync(req.body, { abortEarly: false })
    }
    
    next()
  } catch (error) {
    const errorMessage = error?.details?.map(detail => detail.message)?.join(', ') || error.message
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
  }
}

export const attachmentValidation = {
  uploadAttachments,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
  updateAttachment
} 