import express from 'express'
import { cardValidation } from '~/validations/cardValidation'
import { cardController } from '~/controllers/cardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew)

// Calendar-related endpoints
Router.route('/calendar')
  .get(authMiddleware.isAuthorized, cardController.getCardsWithDueDate)

// Due date specific endpoint for calendar drag-and-drop operations
Router.route('/:id/due-date')
  .put(authMiddleware.isAuthorized, cardController.updateDueDate)

Router.route('/cover-options')
  .get(authMiddleware.isAuthorized, cardController.getCoverOptions)

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('cardCover'),
    cardValidation.update,
    cardController.update
  )
  .delete(
    authMiddleware.isAuthorized,
    rbacMiddleware.canDeleteCards,
    cardValidation.deleteCard,
    cardController.deleteCard
  )

// Label APIs for card
Router.put('/:cardId/labels', cardController.updateCardLabels)

// Checklist APIs
Router.route('/:cardId/checklists')
  .post(authMiddleware.isAuthorized, cardController.createChecklist)

Router.route('/:cardId/checklists/:checklistId')
  .put(authMiddleware.isAuthorized, rbacMiddleware.canManageChecklists, cardController.updateChecklist)
  .delete(authMiddleware.isAuthorized, rbacMiddleware.canDeleteChecklists, cardValidation.deleteChecklist, cardController.deleteChecklist)

Router.route('/:cardId/checklists/:checklistId/items')
  .post(authMiddleware.isAuthorized, rbacMiddleware.canManageChecklists, cardController.addChecklistItem)

Router.route('/:cardId/checklists/:checklistId/items/:itemId')
  .put(authMiddleware.isAuthorized, rbacMiddleware.canManageChecklists, cardController.updateChecklistItem)
  .delete(authMiddleware.isAuthorized, rbacMiddleware.canDeleteChecklists, cardValidation.deleteChecklistItem, cardController.deleteChecklistItem)

Router.route('/:cardId/checklists/:checklistId/items/:itemId/status')
  .put(authMiddleware.isAuthorized, cardController.updateChecklistItemStatus)

// API cập nhật trạng thái hoàn thành của card
Router.route('/:cardId/completed-status')
  .put(authMiddleware.isAuthorized, cardController.updateCardCompletedStatus)

// ⚠️ CẨN THẬN: Route để lấy card với attachments (nếu cần)
// Note: Attachment routes đã handle việc lấy attachments của card
// Route này có thể bổ sung nếu muốn lấy card + attachments trong một API call

export const cardRoute = Router
