/**
 * Attachment Model for Taskflow project
 * Handles attachment schema and CRUD operations
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const ATTACHMENT_COLLECTION_NAME = 'attachments'
const ATTACHMENT_COLLECTION_SCHEMA = Joi.object({
  cardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  
  name: Joi.string().required(),
  url: Joi.string().required().uri(),
  type: Joi.string().required(), // mimetype
  size: Joi.number().required().min(0), // file size in bytes
  
  // MANDATORY: lưu cloudinaryPublicId để có thể xóa file trên Cloudinary sau này
  cloudinaryPublicId: Joi.string().required(),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định những fields không được phép cập nhật
const INVALID_UPDATE_FIELDS = ['_id', 'cardId', 'cloudinaryPublicId', 'createdAt']

/**
 * Validate attachment data before create
 */
const validateBeforeCreate = async (data) => {
  return await ATTACHMENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Create a new attachment
 * @param {Object} data - Attachment data
 * @returns {Promise<Object>} - Created attachment
 */
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    
    // Convert string ID to ObjectId
    const newAttachmentToAdd = {
      ...validData,
      cardId: new ObjectId(validData.cardId)
    }

    const createdAttachment = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).insertOne(newAttachmentToAdd)
    return createdAttachment
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Find one attachment by ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Found attachment
 */
const findOneById = async (attachmentId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).findOne({ 
      _id: new ObjectId(attachmentId),
      _destroy: false
    })
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Find all attachments by card ID
 * @param {string} cardId - Card ID
 * @returns {Promise<Array>} - List of attachments
 */
const findByCardId = async (cardId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME)
      .find({ 
        cardId: new ObjectId(cardId),
        _destroy: false
      })
      .sort({ createdAt: -1 }) // Newest first
      .toArray()
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Update an attachment
 * @param {string} attachmentId - Attachment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated attachment
 */
const update = async (attachmentId, updateData) => {
  try {
    // Lọc những field không cho phép cập nhật
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Luôn cập nhật updatedAt khi update
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = Date.now()
    }

    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(attachmentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Delete one attachment (soft delete)
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Deleted attachment
 */
const deleteOne = async (attachmentId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(attachmentId) },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Hard delete one attachment (completely remove from DB)
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Delete result
 */
const permanentlyDeleteOne = async (attachmentId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).deleteOne({ 
      _id: new ObjectId(attachmentId)
    })
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Delete many attachments by card ID (soft delete)
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Delete result
 */
const deleteManyByCardId = async (cardId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).updateMany(
      { cardId: new ObjectId(cardId) },
      { $set: { _destroy: true, updatedAt: Date.now() } }
    )
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Hard delete many attachments by card ID (completely remove from DB)
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Delete result
 */
const permanentlyDeleteManyByCardId = async (cardId) => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME).deleteMany({ 
      cardId: new ObjectId(cardId)
    })
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

/**
 * Get all attachments that need to be deleted from Cloudinary
 * This is useful for batch cleanup operations
 * @returns {Promise<Array>} - List of attachments marked for deletion
 */
const findAllDestroyed = async () => {
  try {
    const result = await GET_DB().collection(ATTACHMENT_COLLECTION_NAME)
      .find({ _destroy: true })
      .toArray()
    
    return result
  } catch (error) { 
    throw new Error(error) 
  }
}

export const attachmentModel = {
  ATTACHMENT_COLLECTION_NAME,
  ATTACHMENT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByCardId,
  update,
  deleteOne,
  permanentlyDeleteOne,
  deleteManyByCardId,
  permanentlyDeleteManyByCardId,
  findAllDestroyed
} 