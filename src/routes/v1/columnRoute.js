/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import express from 'express'
import { columnValidation } from '~/validations/columnValidation'
import { columnController } from '~/controllers/columnController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, columnValidation.createNew, columnController.createNew)

Router.route('/color-options')
  .get(authMiddleware.isAuthorized, columnController.getColumnColorOptions)

Router.route('/:id')
  .put(authMiddleware.isAuthorized, columnValidation.update, columnController.update)
  .delete(authMiddleware.isAuthorized, rbacMiddleware.canDeleteColumns, columnValidation.deleteItem, columnController.deleteItem)

export const columnRoute = Router
