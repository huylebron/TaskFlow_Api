/* eslint-disable no-useless-catch */
/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { slugify } from '~/utils/formatters'
import { boardModel } from '~/models/boardModel'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'

import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { cloneDeep } from 'lodash'
import { DEFAULT_PAGE, DEFAULT_ITEMS_PER_PAGE } from '~/utils/constants'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const createNew = async (userId, reqBody) => {
  try {
    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newBoard = {
      ...reqBody,
      slug: slugify(reqBody.title)
    }

    // Gọi tới tầng Model để xử lý lưu bản ghi newBoard vào trong Database
    const createdBoard = await boardModel.createNew(userId, newBoard)

    // Lấy bản ghi board sau khi gọi (tùy mục đích dự án mà có cần bước này hay không)
    const getNewBoard = await boardModel.findOneById(createdBoard.insertedId)

    // Làm thêm các xử lý logic khác với các Collection khác tùy đặc thù dự án...vv
    // Bắn email, notification về cho admin khi có 1 cái board mới được tạo...vv

    // Trả kết quả về, trong Service luôn phải có return
    return getNewBoard
  } catch (error) { throw error }
}

const getDetails = async (userId, boardId) => {
  try {
    const board = await boardModel.getDetails(userId, boardId)
    if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
    }

    // B1: Deep Clone board ra một cái mới để xử lý, không ảnh hưởng tới board ban đầu, tùy mục đích về sau mà có cần clone deep hay không. (video 63 sẽ giải thích)
    // https://www.javascripttutorial.net/javascript-primitive-vs-reference-values/
    const resBoard = cloneDeep(board)

    // B2: Đưa card về đúng column của nó
    resBoard.columns.forEach(column => {
      // Cách dùng .equals này là bởi vì chúng ta hiểu ObjectId trong MongoDB có support method .equals
      column.cards = resBoard.cards.filter(card => card.columnId.equals(column._id))

      // // Cách khác đơn giản là convert ObjectId về string bằng hàm toString() của JavaScript
      // column.cards = resBoard.cards.filter(card => card.columnId.toString() === column._id.toString())
    })

    // B3: Xóa mảng cards khỏi board ban đầu
    delete resBoard.cards

    return resBoard
  } catch (error) { throw error }
}

const update = async (boardId, reqBody) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }
    const updatedBoard = await boardModel.update(boardId, updateData)

    return updatedBoard
  } catch (error) { throw error }
}

const moveCardToDifferentColumn = async (reqBody) => {
  try {
    // B1: Cập nhật mảng cardOrderIds của Column ban đầu chứa nó (Hiểu bản chất là xóa cái _id của Card ra khỏi mảng)
    await columnModel.update(reqBody.prevColumnId, {
      cardOrderIds: reqBody.prevCardOrderIds,
      updatedAt: Date.now()
    })
    // B2: Cập nhật mảng cardOrderIds của Column tiếp theo (Hiểu bản chất là thêm _id của Card vào mảng)
    await columnModel.update(reqBody.nextColumnId, {
      cardOrderIds: reqBody.nextCardOrderIds,
      updatedAt: Date.now()
    })
    // B3: Cập nhật lại trường columnId mới của cái Card đã kéo
    await cardModel.update(reqBody.currentCardId, {
      columnId: reqBody.nextColumnId
    })

    return { updateResult: 'Successfully!' }
  } catch (error) { throw error }
}

const getBoards = async (userId, page, itemsPerPage, queryFilters) => {
  try {
    // Nếu không tồn tại page hoặc itemsPerPage từ phía FE thì BE sẽ cần phải luôn gán giá trị mặc định
    if (!page) page = DEFAULT_PAGE
    if (!itemsPerPage) itemsPerPage = DEFAULT_ITEMS_PER_PAGE

    const results = await boardModel.getBoards(
      userId,
      parseInt(page, 10),
      parseInt(itemsPerPage, 10),
      queryFilters
    )

    return results
  } catch (error) { throw error }
}

const deleteBoard = async (userId, boardId) => {
  try {
    // Call the model function to delete the board
    const deletedBoard = await boardModel.deleteBoard(userId, boardId)
    
    if (!deletedBoard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found or you do not have permission to delete this board!')
    }

    // Handle related data cleanup - mark columns and cards as deleted
    // Mark all columns of this board as deleted
    await columnModel.deleteMany(boardId)
    
    // Mark all cards of this board as deleted
    await cardModel.deleteMany(boardId)

    return { deleteResult: 'Board deleted successfully!' }
  } catch (error) { 
    // If the error is already an ApiError, just throw it
    if (error.statusCode) {
      throw error
    }
    // Otherwise, wrap it in a generic error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to delete board')
  }
}

// Thêm label vào board
const addLabel = async (boardId, label) => {
  const result = await GET_DB().collection(boardModel.BOARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(boardId), _destroy: false },
    { $push: { labels: label }, $set: { updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );
  return result;
};

// Sửa label trong board
const updateLabel = async (boardId, labelId, updateData) => {
  const result = await GET_DB().collection(boardModel.BOARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(boardId), _destroy: false, 'labels.id': labelId },
    { $set: { 'labels.$.name': updateData.name, 'labels.$.color': updateData.color, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );
  return result;
};

// Xoá label khỏi board và xoá label đó khỏi tất cả các card thuộc board
const deleteLabel = async (boardId, labelId) => {
  // Xoá label khỏi board
  await GET_DB().collection(boardModel.BOARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(boardId), _destroy: false },
    { $pull: { labels: { id: labelId } }, $set: { updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );
  // Xoá label khỏi tất cả các card thuộc board
  await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).updateMany(
    { boardId: new ObjectId(boardId) },
    { $pull: { labelIds: labelId } }
  );

  // Dọn dẹp: Xoá tất cả labelId không còn tồn tại trong board khỏi các card
  // Lấy danh sách labelId còn lại trong board
  const board = await boardModel.findOneById(boardId)
  const validLabelIds = (board.labels || []).map(l => l.id)
  // Xoá các labelId không hợp lệ khỏi các card
  await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).updateMany(
    { boardId: new ObjectId(boardId) },
    [
      {
        $set: {
          labelIds: {
            $filter: {
              input: '$labelIds',
              as: 'id',
              cond: { $in: ['$$id', validLabelIds] }
            }
          }
        }
      }
    ]
  )

  return { message: 'Xoá label thành công và đã dọn dẹp các label không còn trong board khỏi các card.' };
};

export const boardService = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
  deleteBoard,
  addLabel,
  updateLabel,
  deleteLabel
}
