/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    title: Joi.string().required().min(3).max(50),
    dueDate: Joi.date().allow(null).optional()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const update = async (req, res, next) => {
  // Lưu ý không dùng hàm required() trong trường hợp Update
  const correctCondition = Joi.object({
    title: Joi.string().min(3).max(50),
    description: Joi.string().optional(),
    deleteCardCover: Joi.boolean().optional(),
    cloudinaryPublicId: Joi.string().optional(),
    coverType: Joi.string().valid('image', 'color', 'gradient').optional(),
    cover: Joi.string().optional(),
    dueDate: Joi.date().allow(null).optional()
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi validation thì trả về tất cả lỗi (video 52)
    // Đối với trường hợp update, cho phép Unknown để không cần đẩy một số field lên
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validate cardId parameter for deletion
 */
const deleteCard = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, new Error(error).message))
  }
}

/**
 * Validate cardId and checklistId parameters for checklist deletion
 */
const deleteChecklist = async (req, res, next) => {
  const correctCondition = Joi.object({
    cardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    checklistId: Joi.string().required().min(1).max(100)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    
    // Additional validation: Ensure checklistId is not empty
    if (!req.params.checklistId || req.params.checklistId.length === 0) {
      throw new Error('Checklist ID cannot be empty')
    }
    
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, new Error(error).message))
  }
}

/**
 * Validate cardId, checklistId and itemId parameters for checklist item deletion
 */
const deleteChecklistItem = async (req, res, next) => {
  const correctCondition = Joi.object({
    cardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    checklistId: Joi.string().required().min(1).max(100),
    itemId: Joi.string().required().min(1).max(100)
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    
    // Additional validation: Ensure IDs are not empty
    if (!req.params.checklistId || req.params.checklistId.length === 0) {
      throw new Error('Checklist ID cannot be empty')
    }
    
    if (!req.params.itemId || req.params.itemId.length === 0) {
      throw new Error('Item ID cannot be empty')
    }
    
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, new Error(error).message))
  }
}

export const cardValidation = {
  createNew,
  update,
  deleteCard,
  deleteChecklist,
  deleteChecklistItem
}
