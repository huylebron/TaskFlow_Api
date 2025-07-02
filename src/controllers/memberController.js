import { StatusCodes } from 'http-status-codes'
import { boardModel } from '~/models/boardModel'
import ApiError from '~/utils/ApiError'

const removeMember = async (req, res, next) => {
  try {
    const { boardId, memberId } = req.params
    
    // Remove member from board
    const updatedBoard = await boardModel.removeMemberFromBoard(boardId, memberId)
    
    if (!updatedBoard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found')
    }

    res.status(StatusCodes.OK).json({
      message: 'Member removed successfully',
      board: updatedBoard
    })
  } catch (error) {
    next(error)
  }
}

const getBoardMembers = async (req, res, next) => {
  try {
    const { boardId } = req.params
    const userId = req.jwtDecoded._id
    
    // Get board with members populated
    const board = await boardModel.getDetails(userId, boardId)
    
    if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found')
    }

    res.status(StatusCodes.OK).json({
      owners: board.owners,
      members: board.members,
      memberNicknames: board.memberNicknames || []
    })
  } catch (error) {
    next(error)
  }
}

// Set member nickname (admin only)
const setMemberNickname = async (req, res, next) => {
  try {
    const { boardId, memberId } = req.params
    const { nickname } = req.body
    
    if (!nickname || nickname.trim().length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Nickname is required')
    }
    
    if (nickname.length > 50) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Nickname cannot exceed 50 characters')
    }
    
    // Set member nickname
    const updatedBoard = await boardModel.setMemberNickname(boardId, memberId, nickname.trim())
    
    if (!updatedBoard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found or user is not a member')
    }

    res.status(StatusCodes.OK).json({
      message: 'Member nickname set successfully',
      memberNicknames: updatedBoard.memberNicknames || []
    })
  } catch (error) {
    next(error)
  }
}

// Remove member nickname (admin only)
const removeMemberNickname = async (req, res, next) => {
  try {
    const { boardId, memberId } = req.params
    
    // Remove member nickname
    const updatedBoard = await boardModel.removeMemberNickname(boardId, memberId)
    
    if (!updatedBoard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found')
    }

    res.status(StatusCodes.OK).json({
      message: 'Member nickname removed successfully',
      memberNicknames: updatedBoard.memberNicknames || []
    })
  } catch (error) {
    next(error)
  }
}

// Get member nickname
const getMemberNickname = async (req, res, next) => {
  try {
    const { boardId, memberId } = req.params
    
    // Get member nickname
    const nickname = await boardModel.getMemberNickname(boardId, memberId)

    res.status(StatusCodes.OK).json({
      nickname: nickname
    })
  } catch (error) {
    next(error)
  }
}

export const memberController = {
  removeMember,
  getBoardMembers,
  setMemberNickname,
  removeMemberNickname,
  getMemberNickname
}
