import { StatusCodes } from 'http-status-codes'
import { boardModel } from '~/models/boardModel'
import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import ApiError from '~/utils/ApiError'

// Check if user is a member of the board (either admin or member)
const isMemberOfBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params
    const userId = req.jwtDecoded._id

    const userRole = await boardModel.getMemberRole(boardId, userId)
    
    if (!userRole) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a member of this board')
    }

    // Store the user's role in the request for later use
    req.userRole = userRole
    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can manage the board (admin only)
const canManageBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params
    const userId = req.jwtDecoded._id

    const isAdmin = await boardModel.isUserBoardAdmin(boardId, userId)
    
    if (!isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only board admins can perform this action')
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can delete cards (admin only)
const canDeleteCards = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userId = req.jwtDecoded._id

    // Get the card to extract its boardId
    const card = await cardModel.findOneById(cardId)

    if (!card) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found')
    }

    const boardId = card.boardId.toString()
    const isAdmin = await boardModel.isUserBoardAdmin(boardId, userId)

    if (!isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only board admins can delete cards')
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can delete columns (admin only)
const canDeleteColumns = async (req, res, next) => {
  try {
    const columnId = req.params.id
    const userId = req.jwtDecoded._id

    // Get the column to extract its boardId
    const column = await columnModel.findOneById(columnId)

    if (!column) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Column not found')
    }

    const boardId = column.boardId.toString()
    const isAdmin = await boardModel.isUserBoardAdmin(boardId, userId)

    if (!isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only board admins can delete columns')
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can manage checklists (board member required)
const canManageChecklists = async (req, res, next) => {
  try {
    const { cardId } = req.params
    const userId = req.jwtDecoded._id

    // Get the card to extract its boardId
    const card = await cardModel.findOneById(cardId)

    if (!card) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found')
    }

    const boardId = card.boardId.toString()
    const userRole = await boardModel.getMemberRole(boardId, userId)
    
    if (!userRole) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You must be a board member to manage checklists')
    }

    // Store card and board info for potential use in controllers
    req.card = card
    req.boardId = boardId
    req.userRole = userRole
    
    next()
  } catch (error) {
    next(error)
  }
}

// Check if user can delete checklists (board member required) 
const canDeleteChecklists = async (req, res, next) => {
  try {
    const { cardId } = req.params
    const userId = req.jwtDecoded._id

    // Get the card to extract its boardId
    const card = await cardModel.findOneById(cardId)

    if (!card) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found')
    }

    const boardId = card.boardId.toString()
    const userRole = await boardModel.getMemberRole(boardId, userId)
    
    if (!userRole) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You must be a board member to delete checklists')
    }

    // Store card and board info for potential use in controllers
    req.card = card
    req.boardId = boardId
    req.userRole = userRole
    
    next()
  } catch (error) {
    next(error)
  }
}

export const rbacMiddleware = {
  isMemberOfBoard,
  canManageBoard,
  canDeleteCards,
  canDeleteColumns,
  canManageChecklists,
  canDeleteChecklists
}
