/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { BOARD_TYPES } from '~/utils/constants'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'
import { userModel } from '~/models/userModel'
import { pagingSkipValue } from '~/utils/algorithms'

// Define Collection (Name & Schema)
const BOARD_COLLECTION_NAME = 'boards'
const BOARD_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().min(3).max(50),
  slug: Joi.string().required().min(3),
  description: Joi.string().required().min(3).max(255),


  backgroundType: Joi.string().valid('color', 'image', 'url', 'upload').default('color'),
  backgroundColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow('').default(''),
  backgroundImage: Joi.string().uri().allow('').default(''),
  backgroundUrl: Joi.string().uri().allow('').default(''),
  backgroundUpload: Joi.string().allow('').default(''),
  /**
   * Tips: Thay vì gọi lần lượt tất cả type của board để cho vào hàm valid() thì có thể viết gọn lại bằng Object.values() kết hợp Spread Operator của JS. Cụ thể: .valid(...Object.values(BOARD_TYPES))
   * Làm như trên thì sau này dù các bạn có thêm hay sửa gì vào cái BOARD_TYPES trong file constants thì ở những chỗ dùng Joi trong Model hay Validation cũng không cần phải đụng vào nữa. Tối ưu gọn gàng luôn.
  */
  // type: Joi.string().valid(BOARD_TYPES.PUBLIC, BOARD_TYPES.PRIVATE).required(),
  type: Joi.string().required().valid(...Object.values(BOARD_TYPES)),

  // Lưu ý các item trong mảng columnOrderIds là ObjectId nên cần thêm pattern cho chuẩn nhé, (lúc quay video số 57 mình quên nhưng sang đầu video số 58 sẽ có nhắc lại về cái này.)
  columnOrderIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  // Những Admin của cái board
  ownerIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  // Những thành viên của cái board
  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  // Thêm trường labels để lưu danh sách label của board
  labels: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      color: Joi.string().required()
    })
  ).default([]),

  // Thêm trường memberNicknames để lưu biệt danh của các thành viên
  memberNicknames: Joi.array().items(
    Joi.object({
      userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
      nickname: Joi.string().min(1).max(50).required(),
      updatedAt: Joi.date().timestamp('javascript').default(Date.now)
    })
  ).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await BOARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (userId, data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newBoardToAdd = {
      ...validData,
      ownerIds: [new ObjectId(userId)]
    }
    const createdBoard = await GET_DB().collection(BOARD_COLLECTION_NAME).insertOne(newBoardToAdd)
    return createdBoard
  } catch (error) { throw new Error(error) }
}

const findOneById = async (boardId) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ 
      _id: new ObjectId(boardId),
      _destroy: false
    })
    return result
  } catch (error) { throw new Error(error) }
}

// Internal function to find board by ID regardless of delete status
// Useful for admin functions, audit logs, or internal operations
const findOneByIdInternal = async (boardId) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ 
      _id: new ObjectId(boardId)
    })
    return result
  } catch (error) { throw new Error(error) }
}

// Query tổng hợp (aggregate) để lấy toàn bộ Columns và Cards thuộc về Board
const getDetails = async (userId, boardId) => {
  try {
    // Hôm nay tạm thời giống hệt hàm findOneById - và sẽ update phần aggregate tiếp ở những video tới
    // const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })

    const queryConditions = [
      { _id: new ObjectId(boardId) },
      { _destroy: false },
      { $or: [
        { ownerIds: { $all: [new ObjectId(userId)] } },
        { memberIds: { $all: [new ObjectId(userId)] } }
      ] }
    ]

    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).aggregate([
      { $match: { $and: queryConditions } },
      { $lookup: {
        from: columnModel.COLUMN_COLLECTION_NAME,
        localField: '_id',
        foreignField: 'boardId',
        as: 'columns',
        // Pipeline to filter out deleted columns
        pipeline: [
          { $match: { _destroy: false } },
          { $sort: { createdAt: 1 } }
        ]
      } },
      { $lookup: {
        from: cardModel.CARD_COLLECTION_NAME,
        localField: '_id',
        foreignField: 'boardId',
        as: 'cards',
        // Pipeline to filter out deleted cards
        pipeline: [
          { $match: { _destroy: false } },
          { $sort: { createdAt: 1 } }
        ]
      } },
      { $lookup: {
        from: userModel.USER_COLLECTION_NAME,
        localField: 'ownerIds',
        foreignField: '_id',
        as: 'owners',
        // pipeline trong lookup là để xử lý một hoặc nhiều luồng cần thiết
        // $project để chỉ định vài field không muốn lấy về bằng cách gán nó giá trị 0
        pipeline: [{ $project: { 'password': 0, 'verifyToken': 0 } }]
      } },
      { $lookup: {
        from: userModel.USER_COLLECTION_NAME,
        localField: 'memberIds',
        foreignField: '_id',
        as: 'members',
        pipeline: [{ $project: { 'password': 0, 'verifyToken': 0 } }]
      } }
    ]).toArray()

    return result[0] || null
  } catch (error) { throw new Error(error) }
}

// Đẩy một phần tử columnId vào cuối mảng columnOrderIds
// Dùng $push trong mongodb ở trường hợp này để đẩy 1 phần tử vào cuối mảng
const pushColumnOrderIds = async (column) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(column.boardId),
        _destroy: false  // Only update non-deleted boards
      },
      { $push: { columnOrderIds: new ObjectId(column._id) } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Lấy một phần tử columnId ra khỏi mảng columnOrderIds
// Dùng $pull trong mongodb ở trường hợp này để lấy một phần tử ra khỏi mảng rồi xóa nó đi
const pullColumnOrderIds = async (column) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(column.boardId),
        _destroy: false  // Only update non-deleted boards
      },
      { $pull: { columnOrderIds: new ObjectId(column._id) } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (boardId, updateData) => {
  try {
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.columnOrderIds) {
      updateData.columnOrderIds = updateData.columnOrderIds.map(_id => (new ObjectId(_id)))
    }

    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(boardId),
        _destroy: false  // Only update non-deleted boards
      },
      { $set: updateData },
      { returnDocument: 'after' } // sẽ trả về kết quả mới sau khi cập nhật
    )
    return result
  } catch (error) { throw new Error(error) }
}

const getBoards = async (userId, page, itemsPerPage, queryFilters) => {
  try {
    const queryConditions = [
      // Điều kiện 01: Board chưa bị xóa
      { _destroy: false },
      // Điều kiện 02: cái thằng userId đang thực hiện request này nó phải thuộc vào một trong 2 cái mảng ownerIds hoặc memberIds, sử dụng toán tử $all của mongodb
      { $or: [
        { ownerIds: { $all: [new ObjectId(userId)] } },
        { memberIds: { $all: [new ObjectId(userId)] } }
      ] }
    ]

    // Xử lý query filter cho từng trường hợp search board, ví dụ search theo title
    if (queryFilters) {
      Object.keys(queryFilters).forEach(key => {
        // queryFilters[key] ví dụ queryFilters[title] nếu phía FE đẩy lên q[title]

        // Có phân biệt chữ hoa chữ thường
        // queryConditions.push({ [key]: { $regex: queryFilters[key] } })

        // Không phân biệt chữ hoa chữ thường
        queryConditions.push({ [key]: { $regex: new RegExp(queryFilters[key], 'i') } })
      })
    }
    // console.log('queryConditions: ', queryConditions)

    const query = await GET_DB().collection(BOARD_COLLECTION_NAME).aggregate(
      [
        { $match: { $and: queryConditions } },
        // sort title của board theo A-Z (mặc định sẽ bị chữ B hoa đứng trước chữ a thường (theo chuẩn bảng mã ASCII)
        { $sort: { title: 1 } },
        // $facet để xử lý nhiều luồng trong một query
        { $facet: {
          // Luồng 01: Query boards
          'queryBoards': [
            { $skip: pagingSkipValue(page, itemsPerPage) }, // Bỏ qua số lượng bản ghi của những page trước đó
            { $limit: itemsPerPage } // Giới hạn tối đa số lượng bản ghi trả về trên một page
          ],

          // Luồng 02: Query đếm tổng tất cả số lượng bản ghi boards trong DB và trả về vào biến: countedAllBoards
          'queryTotalBoards': [{ $count: 'countedAllBoards' }]
        } }
      ],
      // Khai báo thêm thuộc tính collation locale 'en' để fix vụ chữ B hoa và a thường ở trên
      // https://www.mongodb.com/docs/v6.0/reference/collation/#std-label-collation-document-fields
      { collation: { locale: 'en' } }
    ).toArray()

    // console.log('query: ', query)
    const res = query[0]
    // console.log('res.queryTotalBoards[0]: ', res.queryTotalBoards[0])
    return {
      boards: res.queryBoards || [],
      totalBoards: res.queryTotalBoards[0]?.countedAllBoards || 0
    }
  } catch (error) { throw new Error(error) }
}

const pushMemberIds = async (boardId, userId) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(boardId),
        _destroy: false  // Only update non-deleted boards
      },
      { $push: { memberIds: new ObjectId(userId) } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteBoard = async (userId, boardId) => {
  try {
    // First, verify that the user is the owner of the board
    const queryConditions = [
      { _id: new ObjectId(boardId) },
      { _destroy: false },
      { ownerIds: { $all: [new ObjectId(userId)] } }
    ]

    const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ $and: queryConditions })

    if (!board) {
      throw new Error('Board not found or you do not have permission to delete this board')
    }

    // Perform soft delete by setting _destroy to true
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(boardId) },
      {
        $set: {
          _destroy: true,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Check if user is admin of a specific board
const isUserBoardAdmin = async (boardId, userId) => {
  try {
    const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(boardId),
      _destroy: false,
      ownerIds: { $in: [new ObjectId(userId)] }
    })
    return !!board // Returns true if user is admin, false otherwise
  } catch (error) { throw new Error(error) }
}

// Get user's role in a specific board
const getMemberRole = async (boardId, userId) => {
  try {
    const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(boardId),
      _destroy: false,
      $or: [
        { ownerIds: { $in: [new ObjectId(userId)] } },
        { memberIds: { $in: [new ObjectId(userId)] } }
      ]
    })

    if (!board) return null

    // Check if user is admin (in ownerIds)
    const isOwner = board.ownerIds.some(id => id.toString() === userId.toString())
    return isOwner ? 'admin' : 'member'
  } catch (error) { throw new Error(error) }
}

// Remove member from board (admin only)
const removeMemberFromBoard = async (boardId, memberIdToRemove) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(boardId),
        _destroy: false
      },
      { 
        $pull: { 
          memberIds: new ObjectId(memberIdToRemove),
          memberNicknames: { userId: memberIdToRemove } // Also remove nickname when removing member
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Set member nickname (admin only)
const setMemberNickname = async (boardId, userId, nickname) => {
  try {
    // First, remove any existing nickname for this user
    await GET_DB().collection(BOARD_COLLECTION_NAME).updateOne(
      { 
        _id: new ObjectId(boardId),
        _destroy: false
      },
      { 
        $pull: { 
          memberNicknames: { userId: userId } 
        }
      }
    )
    
    // Then add the new nickname
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(boardId),
        _destroy: false,
        $or: [
          { ownerIds: { $in: [new ObjectId(userId)] } },
          { memberIds: { $in: [new ObjectId(userId)] } }
        ]
      },
      { 
        $push: { 
          memberNicknames: { 
            userId: userId,
            nickname: nickname,
            updatedAt: Date.now()
          }
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      throw new Error('User is not a member of this board')
    }
    
    return result
  } catch (error) { throw new Error(error) }
}

// Remove member nickname (admin only)
const removeMemberNickname = async (boardId, userId) => {
  try {
    const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(boardId),
        _destroy: false
      },
      { 
        $pull: { 
          memberNicknames: { userId: userId } 
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    
    return result
  } catch (error) { throw new Error(error) }
}

// Get member nickname
const getMemberNickname = async (boardId, userId) => {
  try {
    const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne(
      { 
        _id: new ObjectId(boardId),
        _destroy: false
      },
      { 
        projection: { memberNicknames: 1 } 
      }
    )
    
    if (!board || !board.memberNicknames) {
      return null
    }
    
    const nicknameEntry = board.memberNicknames.find(entry => entry.userId === userId)
    return nicknameEntry ? nicknameEntry.nickname : null
  } catch (error) { throw new Error(error) }
}

export const boardModel = {
  BOARD_COLLECTION_NAME,
  BOARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByIdInternal,
  getDetails,
  pushColumnOrderIds,
  update,
  pullColumnOrderIds,
  getBoards,
  pushMemberIds,
  deleteBoard,
  isUserBoardAdmin,
  getMemberRole,
  removeMemberFromBoard,
  setMemberNickname,
  removeMemberNickname,
  getMemberNickname
}
