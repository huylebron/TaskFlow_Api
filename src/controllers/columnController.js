/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { columnService } from '~/services/columnService'

const createNew = async (req, res, next) => {
  try {
    const userInfo = req.jwtDecoded
    const createdColumn = await columnService.createNew(req.body, userInfo)
    
    // Disabled backend socket emission to avoid duplicate with frontend emission
    // Frontend handles socket emission in ListColumns.jsx with complete user info
    /*
    if (global._io && createdColumn.boardId) {
      global._io.to(createdColumn.boardId.toString()).emit('BE_COLUMN_CREATED', {
        boardId: createdColumn.boardId.toString(),
        columnId: createdColumn._id.toString(),
        columnTitle: createdColumn.title,
        userInfo: {
          _id: userInfo._id,
          displayName: userInfo.displayName,
          avatar: userInfo.avatar
        },
        timestamp: new Date().toISOString()
      });
      console.log('🔄 Socket: Emitted column creation event for board', createdColumn.boardId);
    }
    */
    
    res.status(StatusCodes.CREATED).json(createdColumn)
  } catch (error) { 
    console.error('❌ Create column error:', error);
    next(error);
  }
}

const update = async (req, res, next) => {
  try {
    const columnId = req.params.id
    const updatedColumn = await columnService.update(columnId, req.body)

    res.status(StatusCodes.OK).json(updatedColumn)
  } catch (error) { next(error) }
}

const deleteItem = async (req, res, next) => {
  try {
    const columnId = req.params.id
    const result = await columnService.deleteItem(columnId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const getColumnColorOptions = async (req, res, next) => {
  try {
    const colorOptions = await columnService.getColumnColorOptions()
    res.status(StatusCodes.OK).json(colorOptions)
  } catch (error) { next(error) }
}

export const columnController = {
  createNew,
  update,
  deleteItem,
  getColumnColorOptions
}
