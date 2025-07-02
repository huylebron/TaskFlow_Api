/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { columnModel } from '~/models/columnModel'
import { boardModel } from '~/models/boardModel'
import { cardModel } from '~/models/cardModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { COLUMN_COLORS, CARD_COVER_GRADIENTS } from '~/utils/constants'

const createNew = async (reqBody, userInfo = null) => {
  try {
    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newColumn = {
      ...reqBody,
      createdBy: userInfo ? userInfo._id : null, // Thêm thông tin người tạo
      createdAt: Date.now()
    }
    const createdColumn = await columnModel.createNew(newColumn)
    const getNewColumn = await columnModel.findOneById(createdColumn.insertedId)

    if (getNewColumn) {
      // Xử lý cấu trúc data ở đây trước khi trả dữ liệu về
      getNewColumn.cards = []

      // Cập nhật mảng columnOrderIds trong collection boards
      await boardModel.pushColumnOrderIds(getNewColumn)
      
      // Thêm boardId vào response để sử dụng cho socket emission
      getNewColumn.boardId = getNewColumn.boardId || reqBody.boardId
    }

    return getNewColumn
  } catch (error) { 
    console.error('❌ Column service createNew error:', error);
    throw error;
  }
}

const update = async (columnId, reqBody) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }
    const updatedColumn = await columnModel.update(columnId, updateData)

    return updatedColumn
  } catch (error) { throw error }
}

const deleteItem = async (columnId) => {
  try {
    const targetColumn = await columnModel.findOneById(columnId)

    if (!targetColumn) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Column not found!')
    }

    // Xóa Column
    await columnModel.deleteOneById(columnId)

    // Xóa toàn bộ Cards thuộc cái Column trên
    await cardModel.deleteManyByColumnId(columnId)

    // Xoá columnId trong mảng columnOrderIds của cái Board chứa nó
    await boardModel.pullColumnOrderIds(targetColumn)

    return { deleteResult: 'Column and its Cards deleted successfully!' }
  } catch (error) { throw error }
}

const getColumnColorOptions = async () => {
  try {
    return {
      colors: COLUMN_COLORS,
      gradients: CARD_COVER_GRADIENTS
    }
  } catch (error) { throw error }
}

export const columnService = {
  createNew,
  update,
  deleteItem,
  getColumnColorOptions
}
