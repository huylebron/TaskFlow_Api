/**
 * Attachment Controller for Taskflow project
 * Handles HTTP requests for attachment operations with consistent response format
 */

import { StatusCodes } from 'http-status-codes'
import { attachmentService } from '~/services/attachmentService'

/**
 * 🚨 CRITICAL: Upload multiple attachments cho một card
 * POST /api/cards/:cardId/attachments
 */
const uploadAttachments = async (req, res, next) => {
  try {
    const { cardId } = req.params
    const files = req.files

    // Validation đã được xử lý ở middleware attachmentValidation.uploadAttachments
    // và multerUploadMiddleware.uploadAttachments

    const result = await attachmentService.uploadAttachments(cardId, files)

    // ⚠️ CẨN THẬN: Response format consistent
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: result.message,
      data: {
        uploadResults: {
          totalFiles: result.totalFiles,
          successCount: result.success.length,
          failedCount: result.failed.length,
          successFiles: result.success,
          failedFiles: result.failed
        }
      },
      statusCode: StatusCodes.CREATED
    })

  } catch (error) {
    // ⚠️ LƯU Ý: Error handling với format consistent
    console.error('Upload attachments controller error:', error)
    next(error)
  }
}

/**
 * Lấy danh sách attachments của một card
 * GET /api/cards/:cardId/attachments
 */
const getAttachments = async (req, res, next) => {
  try {
    const { cardId } = req.params

    const attachments = await attachmentService.getAttachmentsByCardId(cardId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Get attachments successfully.',
      data: {
        attachments: attachments,
        totalCount: attachments.length
      },
      statusCode: StatusCodes.OK
    })

  } catch (error) {
    console.error('Get attachments controller error:', error)
    next(error)
  }
}

/**
 * 🚨 CRITICAL: Xóa một attachment
 * DELETE /api/attachments/:id
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await attachmentService.deleteAttachment(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: {
        deletedAttachment: result.deletedAttachment
      },
      statusCode: StatusCodes.OK
    })

  } catch (error) {
    console.error('Delete attachment controller error:', error)
    next(error)
  }
}

/**
 * 🚨 CRITICAL: Download attachment - multiple response formats
 * GET /api/attachments/:id/download
 */
const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params

    const downloadInfo = await attachmentService.downloadAttachment(id)

    // Option 1: Redirect to Cloudinary URL (for browser direct access)
    if (req.query.redirect === 'true' || req.headers.accept?.includes('text/html')) {
      return res.redirect(downloadInfo.url)
    }

    // Option 2: Return download info for API clients (frontend expects this)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Download info retrieved successfully.',
      data: {
        // 🔥 QUAN TRỌNG: Multiple URL formats cho frontend fallback
        downloadUrl: downloadInfo.url,     // Primary download URL
        redirectUrl: downloadInfo.url,     // Redirect URL  
        url: downloadInfo.url,             // File URL fallback
        fileUrl: downloadInfo.url,         // Alternative URL
        fileName: downloadInfo.name,       // Original file name
        fileType: downloadInfo.type,       // MIME type
        fileSize: downloadInfo.size,       // File size
        attachment: downloadInfo           // Complete attachment info
      },
      statusCode: StatusCodes.OK
    })

  } catch (error) {
    console.error('Download attachment controller error:', error)
    next(error)
  }
}

/**
 * Cập nhật attachment metadata (bonus feature)
 * PATCH /api/attachments/:id
 */
const updateAttachment = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedAttachment = await attachmentService.updateAttachment(id, updateData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Attachment updated successfully.',
      data: {
        attachment: updatedAttachment
      },
      statusCode: StatusCodes.OK
    })

  } catch (error) {
    console.error('Update attachment controller error:', error)
    next(error)
  }
}

/**
 * 🔥 QUAN TRỌNG: Cleanup orphaned attachments (admin only)
 * POST /api/attachments/cleanup
 */
const cleanupOrphanedAttachments = async (req, res, next) => {
  try {
    const result = await attachmentService.cleanupOrphanedAttachments()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cleanup completed successfully.',
      data: {
        cleanupResult: result
      },
      statusCode: StatusCodes.OK
    })

  } catch (error) {
    console.error('Cleanup orphaned attachments controller error:', error)
    next(error)
  }
}

export const attachmentController = {
  uploadAttachments,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
  updateAttachment,
  cleanupOrphanedAttachments
} 