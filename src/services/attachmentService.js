/**
 * Attachment Service for Taskflow project
 * Handles all attachment business logic with error handling and data consistency
 */

import { attachmentModel } from '~/models/attachmentModel'
import { cardModel } from '~/models/cardModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * 🚨 CRITICAL: Upload multiple attachments cho một card
 * @param {string} cardId - Card ID
 * @param {Array} files - Array of multer files
 * @returns {Promise<Object>} - Upload result with success and failed files
 */
const uploadAttachments = async (cardId, files) => {
  try {
    // Kiểm tra card có tồn tại không
    const existingCard = await cardModel.findOneById(cardId)
    if (!existingCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found.')
    }

    const uploadResults = {
      success: [],
      failed: [],
      totalFiles: files.length
    }

    // 🚨 CRITICAL: Process từng file và handle errors riêng biệt
    for (const file of files) {
      try {
        // 🚨 CRITICAL: Upload file lên Cloudinary với card-specific folder
        const attachmentFolder = CloudinaryProvider.createAttachmentFolder(cardId)
        const cloudinaryResult = await CloudinaryProvider.streamUpload(file.buffer, attachmentFolder)
        
        // Tạo attachment record trong database
        const attachmentData = {
          cardId: cardId,
          name: file.originalname,
          url: cloudinaryResult.secure_url,
          type: file.mimetype,
          size: file.size,
          cloudinaryPublicId: cloudinaryResult.public_id // 🔥 QUAN TRỌNG: Lưu để xóa được sau này
        }

        const createdAttachment = await attachmentModel.createNew(attachmentData)
        const newAttachment = await attachmentModel.findOneById(createdAttachment.insertedId)

        if (newAttachment) {
          // ⚠️ CẨN THẬN: Cập nhật card để thêm attachmentId
          await cardModel.pushAttachmentId(cardId, newAttachment._id.toString())
          
          uploadResults.success.push({
            attachmentId: newAttachment._id,
            name: file.originalname,
            url: cloudinaryResult.secure_url,
            type: file.mimetype,
            size: file.size,
            uploadedAt: newAttachment.createdAt
          })
        }

      } catch (error) {
        console.error(`Failed to upload file ${file.originalname}:`, error)
        
        // 🚨 CRITICAL: Nếu đã upload lên Cloudinary nhưng lưu DB failed, cần xóa file trên Cloudinary
        // (Rollback mechanism)
        
        uploadResults.failed.push({
          name: file.originalname,
          error: error.message || 'Upload failed'
        })
      }
    }

    // Trả về kết quả chi tiết
    const result = {
      ...uploadResults,
      message: `Successfully uploaded ${uploadResults.success.length}/${uploadResults.totalFiles} files.`
    }

    // Nếu không có file nào upload thành công
    if (uploadResults.success.length === 0) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to upload any files.')
    }

    return result

  } catch (error) {
    console.error('Upload attachments error:', error)
    throw error
  }
}

/**
 * Lấy danh sách attachments của một card
 * @param {string} cardId - Card ID
 * @returns {Promise<Array>} - List of attachments
 */
const getAttachmentsByCardId = async (cardId) => {
  try {
    // Kiểm tra card có tồn tại không
    const existingCard = await cardModel.findOneById(cardId)
    if (!existingCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found.')
    }

    const attachments = await attachmentModel.findByCardId(cardId)
    return attachments

  } catch (error) {
    console.error('Get attachments error:', error)
    throw error
  }
}

/**
 * 🚨 CRITICAL: Xóa một attachment (DB + Cloudinary)
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Delete result
 */
const deleteAttachment = async (attachmentId) => {
  try {
    // Lấy thông tin attachment trước khi xóa
    const existingAttachment = await attachmentModel.findOneById(attachmentId)
    if (!existingAttachment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found.')
    }

    const cardId = existingAttachment.cardId.toString()
    const cloudinaryPublicId = existingAttachment.cloudinaryPublicId

    // ⚠️ CẨN THẬN: Transaction-like approach
    // Bước 1: Soft delete attachment trong DB
    const deletedAttachment = await attachmentModel.deleteOne(attachmentId)
    
    if (!deletedAttachment) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete attachment from database.')
    }

    try {
      // Bước 2: Xóa attachment khỏi card
      await cardModel.pullAttachmentId(cardId, attachmentId)

      // Bước 3: Xóa file trên Cloudinary
      if (cloudinaryPublicId) {
        await CloudinaryProvider.deleteResource(cloudinaryPublicId)
      }

      // Bước 4: Hard delete khỏi database (optional - có thể giữ soft delete)
      // await attachmentModel.permanentlyDeleteOne(attachmentId)

    } catch (cleanupError) {
      console.error('Cleanup error after attachment deletion:', cleanupError)
      // Attachment đã được soft delete trong DB nhưng cleanup failed
      // Có thể schedule lại cleanup sau hoặc log để manual cleanup
    }

    return {
      message: 'Attachment deleted successfully.',
      deletedAttachment: {
        id: attachmentId,
        name: existingAttachment.name,
        cardId: cardId
      }
    }

  } catch (error) {
    console.error('Delete attachment error:', error)
    throw error
  }
}

/**
 * Download attachment (redirect to Cloudinary URL)
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Download info
 */
const downloadAttachment = async (attachmentId) => {
  try {
    const attachment = await attachmentModel.findOneById(attachmentId)
    if (!attachment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found.')
    }

    // Trả về URL để redirect hoặc stream
    return {
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      size: attachment.size
    }

  } catch (error) {
    console.error('Download attachment error:', error)
    throw error
  }
}

/**
 * Cập nhật attachment metadata
 * @param {string} attachmentId - Attachment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated attachment
 */
const updateAttachment = async (attachmentId, updateData) => {
  try {
    const existingAttachment = await attachmentModel.findOneById(attachmentId)
    if (!existingAttachment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found.')
    }

    const updatedAttachment = await attachmentModel.update(attachmentId, updateData)
    return updatedAttachment

  } catch (error) {
    console.error('Update attachment error:', error)
    throw error
  }
}

/**
 * 🔥 QUAN TRỌNG: Cleanup orphaned attachments
 * Hàm này để cleanup những attachment bị orphaned hoặc failed uploads
 * @returns {Promise<Object>} - Cleanup result
 */
const cleanupOrphanedAttachments = async () => {
  try {
    // Lấy tất cả attachments đã bị soft delete
    const destroyedAttachments = await attachmentModel.findAllDestroyed()
    
    let cleanedCount = 0
    const errors = []

    for (const attachment of destroyedAttachments) {
      try {
        // Xóa file trên Cloudinary nếu có public_id
        if (attachment.cloudinaryPublicId) {
          await CloudinaryProvider.deleteResource(attachment.cloudinaryPublicId)
        }
        
        // Hard delete khỏi database
        await attachmentModel.permanentlyDeleteOne(attachment._id.toString())
        
        cleanedCount++
      } catch (error) {
        errors.push({
          attachmentId: attachment._id,
          error: error.message
        })
      }
    }

    return {
      cleanedCount,
      totalProcessed: destroyedAttachments.length,
      errors
    }

  } catch (error) {
    console.error('Cleanup orphaned attachments error:', error)
    throw error
  }
}

export const attachmentService = {
  uploadAttachments,
  getAttachmentsByCardId,
  deleteAttachment,
  downloadAttachment,
  updateAttachment,
  cleanupOrphanedAttachments
} 