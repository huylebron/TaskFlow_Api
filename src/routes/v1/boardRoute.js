/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import express from 'express'
import { boardValidation } from '~/validations/boardValidation'
import { boardController } from '~/controllers/boardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import multer from 'multer'

const Router = express.Router()

const upload = multer({ dest: 'uploads/' })

Router.route('/')
  .get(authMiddleware.isAuthorized, boardController.getBoards)
  .post(authMiddleware.isAuthorized, boardValidation.createNew, boardController.createNew)

Router.route('/:id')
  .get(authMiddleware.isAuthorized, boardController.getDetails)
  .put(authMiddleware.isAuthorized, boardValidation.update, boardController.update)
  .delete(authMiddleware.isAuthorized, rbacMiddleware.canManageBoard, boardValidation.deleteBoard, boardController.deleteBoard)

Router.route('/:id/background')
  .patch(authMiddleware.isAuthorized, upload.single('backgroundUpload'), boardController.updateBackground)

// API hỗ trợ việc di chuyển card giữa các column khác nhau trong một board
Router.route('/supports/moving_card')
  .put(authMiddleware.isAuthorized, boardValidation.moveCardToDifferentColumn, boardController.moveCardToDifferentColumn)

// Label APIs
Router.post('/:boardId/labels', boardController.addLabel)
Router.put('/:boardId/labels/:labelId', boardController.updateLabel)
Router.delete('/:boardId/labels/:labelId', boardController.deleteLabel)

export const boardRoute = Router
