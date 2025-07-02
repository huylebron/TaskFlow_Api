/**
 * Updated by trungquandev.com's author on Oct 8 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const COLUMN_COLLECTION_NAME = 'columns'
const COLUMN_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().required().min(3).max(50),
  color: Joi.string().default(null),
  
  // Thêm trường createdBy để lưu thông tin người tạo cột
  createdBy: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).default(null),

  // Lưu ý các item trong mảng cardOrderIds là ObjectId nên cần thêm pattern cho chuẩn nhé, (lúc quay video số 57 mình quên nhưng sang đầu video số 58 sẽ có nhắc lại về cái này.)
  cardOrderIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdBy', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await COLUMN_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Biến đổi một số dữ liệu liên quan tới ObjectId chuẩn chỉnh
    const newColumnToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId),
      // Chuyển đổi createdBy thành ObjectId nếu có
      createdBy: validData.createdBy ? new ObjectId(validData.createdBy) : null
    }

    const createdColumn = await GET_DB().collection(COLUMN_COLLECTION_NAME).insertOne(newColumnToAdd)
    return createdColumn
  } catch (error) { throw new Error(error) }
}

const findOneById = async (columnId) => {
  try {
    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOne({ 
      _id: new ObjectId(columnId),
      _destroy: false
    })
    return result
  } catch (error) { throw new Error(error) }
}

// Nhiệm vụ của func này là push một cái giá trị cardId vào cuối mảng cardOrderIds
const pushCardOrderIds = async (card) => {
  try {
    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(card.columnId) },
      { $push: { cardOrderIds: new ObjectId(card._id) } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Nhiệm vụ của func này là pull một cái giá trị cardId ra khỏi mảng cardOrderIds
 * @param {Object} card - Card object containing _id and columnId
 * @returns {Promise<Object>} - Updated column
 */
const pullCardOrderIds = async (card) => {
  try {
    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(card.columnId),
        _destroy: false  // Only update non-deleted columns
      },
      { $pull: { cardOrderIds: new ObjectId(card._id) } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (columnId, updateData) => {
  try {
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.cardOrderIds) {
      updateData.cardOrderIds = updateData.cardOrderIds.map(_id => (new ObjectId(_id)))
    }

    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(columnId) },
      { $set: updateData },
      { returnDocument: 'after' } // sẽ trả về kết quả mới sau khi cập nhật
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteOneById = async (columnId) => {
  try {
    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).deleteOne({ _id: new ObjectId(columnId) })
    return result
  } catch (error) { throw new Error(error) }
}

const deleteMany = async (boardId) => {
  try {
    const result = await GET_DB().collection(COLUMN_COLLECTION_NAME).updateMany(
      { 
        boardId: new ObjectId(boardId),
        _destroy: false
      },
      { 
        $set: { 
          _destroy: true,
          updatedAt: Date.now()
        } 
      }
    )
    return result
  } catch (error) { throw new Error(error) }
}

export const columnModel = {
  COLUMN_COLLECTION_NAME,
  COLUMN_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  pushCardOrderIds,
  pullCardOrderIds,
  update,
  deleteOneById,
  deleteMany
}