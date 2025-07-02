/**
 * Attachment Routes for Taskflow project
 * Defines API endpoints for attachment operations with proper middleware
 */

import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { attachmentValidation } from '~/validations/attachmentValidation'
import { attachmentController } from '~/controllers/attachmentController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

/**
 * 🚨 CRITICAL: Upload attachments to a card
 * POST /api/cards/:cardId/attachments
 * ⚠️ LƯU Ý: Authorization middleware cho tất cả routes
 */
Router.route('/cards/:cardId/attachments')
  .post(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    multerUploadMiddleware.uploadAttachments.array('attachments', 10), // Multiple files, max 10
    attachmentValidation.uploadAttachments, // Validation
    attachmentController.uploadAttachments // Controller
  )
  .get(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    attachmentValidation.getAttachments, // Validation
    attachmentController.getAttachments // Controller
  )

/**
 * Get attachments of a card
 * GET /api/cards/:cardId/attachments
 * (Already defined above in combined route)
 */

/**
 * 🚨 CRITICAL: Delete an attachment
 * DELETE /api/attachments/:id
 */
Router.route('/attachments/:id')
  .delete(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    attachmentValidation.deleteAttachment, // Validation
    attachmentController.deleteAttachment // Controller
  )
  .patch(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    attachmentValidation.updateAttachment, // Validation
    attachmentController.updateAttachment // Controller (bonus feature)
  )

/**
 * Download an attachment
 * GET /api/attachments/:id/download
 */
Router.route('/attachments/:id/download')
  .get(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    attachmentValidation.downloadAttachment, // Validation
    attachmentController.downloadAttachment // Controller
  )

/**
 * 🔥 QUAN TRỌNG: Cleanup orphaned attachments (admin only)
 * POST /api/attachments/cleanup
 * Note: This should be restricted to admin users only in production
 */
Router.route('/attachments/cleanup')
  .post(
    authMiddleware.isAuthorized, // 🔒 Authorization required
    // TODO: Add admin-only middleware here in production
    // adminMiddleware.isAdmin,
    attachmentController.cleanupOrphanedAttachments // Controller
  )

/**
 * Health check endpoint for attachment service (optional)
 * GET /api/attachments/health
 */
Router.route('/attachments/health')
  .get((req, res) => {
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Attachment service is healthy.',
      timestamp: new Date().toISOString(),
      statusCode: StatusCodes.OK
    })
  })

export const attachmentRoute = Router 