/**
 * Updated by trungquandev.com's author on Oct 8 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { CARD_MEMBER_ACTIONS } from '~/utils/constants'

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  title: Joi.string().required().min(3).max(50),
  description: Joi.string().optional(),

  cover: Joi.string().default(null),
  coverType: Joi.string().valid('image', 'color', 'gradient').default(null),
  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  // Dữ liệu comments của Card chúng ta sẽ học cách nhúng - embedded vào bản ghi Card luôn như dưới đây:
  comments: Joi.array().items({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userEmail: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    content: Joi.string(),
    // Chỗ này lưu ý vì dùng hàm $push để thêm comment nên không set default Date.now luôn giống hàm insertOne khi create được.
    commentedAt: Joi.date().timestamp()
  }).default([]),

  // Thêm trường attachmentIds để lưu danh sách ID của các attachment liên kết với card
  // Chúng ta sẽ sử dụng populate thay vì nhúng toàn bộ dữ liệu attachment vào card
  attachmentIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  
  // Thêm trường attachmentCount để lưu số lượng attachment của card
  // Giúp hiển thị nhanh số lượng attachment mà không cần query
  attachmentCount: Joi.number().default(0),

  // Add dueDate field to schema - supports both null (no due date) and Date values
  dueDate: Joi.date().timestamp('javascript').allow(null).default(null),

  // Thêm trường labelIds để lưu danh sách id label gán cho card
  labelIds: Joi.array().items(
    Joi.string()
  ).default([]),

  // Thêm trường checklist để lưu danh sách các checklist với validation cải thiện
  checklists: Joi.array().items(
    Joi.object({
      _id: Joi.string().required(), // Checklist ID (string, không cần ObjectId pattern)
      title: Joi.string().required().min(1).max(100),
      items: Joi.array().items(
        Joi.object({
                      _id: Joi.string().required(), // Item ID (string, không cần ObjectId pattern)
            title: Joi.string().required().min(1).max(500), // Tăng max length cho item title
          isCompleted: Joi.boolean().default(false),
          completedAt: Joi.date().timestamp('javascript').allow(null).default(null),
          createdAt: Joi.date().timestamp('javascript').default(Date.now) // Thêm createdAt cho items
        })
      ).default([]),
      createdAt: Joi.date().timestamp('javascript').default(Date.now), // Thêm createdAt cho checklists
      updatedAt: Joi.date().timestamp('javascript').default(null) // Thêm updatedAt cho checklists
    })
  ).default([]),

  //Thêm trường isCardCompleted để lưu trạng thái hoàn thành của card
  isCardCompleted: Joi.boolean().default(false),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await CARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Biến đổi một số dữ liệu liên quan tới ObjectId chuẩn chỉnh
    const newCardToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId),
      columnId: new ObjectId(validData.columnId)
    }

    const createdCard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(newCardToAdd)
    return createdCard
  } catch (error) { throw new Error(error) }
}

const findOneById = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ 
      _id: new ObjectId(cardId),
      _destroy: false
    })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (cardId, updateData) => {
  try {
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId)

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false  // Only update non-deleted cards
      },
      { $set: updateData },
      { returnDocument: 'after' } // sẽ trả về kết quả mới sau khi cập nhật
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteManyByColumnId = async (columnId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteMany({ columnId: new ObjectId(columnId) })
    return result
  } catch (error) { throw new Error(error) }
}

/**
  * Đẩy một phần tử comment vào đầu mảng comments!
  * - Trong JS, ngược lại với push (thêm phần tử vào cuối mảng) sẽ là unshift (thêm phần tử vào đầu mảng)
  * - Nhưng trong mongodb hiện tại chỉ có $push - mặc định đẩy phần tử vào cuối mảng.
  * Dĩ nhiên cứ lưu comment mới vào cuối mảng cũng được, nhưng nay sẽ học cách để thêm phần tử vào đẩu mảng trong mongodb.
  * Vẫn dùng $push, nhưng bọc data vào Array để trong $each và chỉ định $position: 0
  * https://stackoverflow.com/a/25732817/8324172
  * https://www.mongodb.com/docs/manual/reference/operator/update/position/
*/
const unshiftNewComment = async (cardId, commentData) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false  // Only update non-deleted cards
      },
      { $push: { comments: { $each: [commentData], $position: 0 } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
* Hàm này sẽ có nhiệm vụ xử lý cập nhật thêm hoặc xóa member khỏi card dựa theo Action
* sẽ dùng $push để thêm hoặc $pull để loại bỏ ($pull trong mongodb để lấy một phần tử ra khỏi mảng rồi xóa nó đi)
*/
const updateMembers = async (cardId, incomingMemberInfo) => {
  try {
    // Tạo ra một biến updateCondition ban đầu là rỗng
    let updateCondition = {}
    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD) {
      // console.log('Trường hợp Add, dùng $push: ', incomingMemberInfo)
      updateCondition = { $push: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.REMOVE) {
      // console.log('Trường hợp Remove, dùng $pull: ', incomingMemberInfo)
      updateCondition = { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false  // Only update non-deleted cards
      },
      updateCondition, // truyền cái updateCondition ở đây
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Ví dụ cập nhật nhiều bản ghi Comments, code này dùng để cho các bạn tham khảo thêm trong trường hợp muốn cập nhật thông tin user thì gọi để cập nhật lại thông tin user đó trong card comments, ví dụ avatar và displayName.
 * Updating Arrays https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
 * Example: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/#std-label-updateMany-arrayFilters
 */
const updateManyComments = async (userInfo) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateMany(
      { 'comments.userId': new ObjectId(userInfo._id) },
      { $set: {
        'comments.$[element].userAvatar': userInfo.avatar,
        'comments.$[element].userDisplayName': userInfo.displayName
      } },
      { arrayFilters: [{ 'element.userId': new ObjectId(userInfo._id) }] }
    )

    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Thêm một attachment vào card
 * @param {string} cardId - Card ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Updated card
 */
const pushAttachmentId = async (cardId, attachmentId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { 
        $push: { attachmentIds: new ObjectId(attachmentId) },
        $inc: { attachmentCount: 1 },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Xóa một attachment khỏi card
 * @param {string} cardId - Card ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Updated card
 */
const pullAttachmentId = async (cardId, attachmentId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { 
        $pull: { attachmentIds: new ObjectId(attachmentId) },
        $inc: { attachmentCount: -1 },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Cập nhật số lượng attachment của card
 * Hữu ích khi cần đồng bộ lại số lượng attachment
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Updated card
 */
const updateAttachmentCount = async (cardId) => {
  try {
    // Đếm số lượng attachmentIds trong card
    const card = await findOneById(cardId)
    const attachmentCount = card?.attachmentIds?.length || 0
    
    // Cập nhật attachmentCount
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { 
        $set: { 
          attachmentCount: attachmentCount,
          updatedAt: Date.now() 
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Create database indexes for better query performance
 * This function should be called when the application starts
 */
const createIndexes = async () => {
  try {
    // Index for cards with due dates
    await GET_DB().collection(CARD_COLLECTION_NAME).createIndex({ dueDate: 1 })
    
    // Compound index for board-specific calendar queries
    await GET_DB().collection(CARD_COLLECTION_NAME).createIndex({ boardId: 1, dueDate: 1 })
    
    console.log('Card indexes created successfully')
  } catch (error) { 
    console.error('Error creating card indexes:', error)
  }
}

const deleteMany = async (boardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateMany(
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

/**

 * Cập nhật trạng thái hoàn thành của card
 * @param {string} cardId - Card ID
 * @param {boolean} isCardCompleted - Trạng thái hoàn thành
 * @returns {Promise<Object>} - Updated card
 */
const updateCardCompletedStatus = async (cardId, isCardCompleted) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false },
      { $set: { isCardCompleted, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Soft delete a single card by setting _destroy flag to true
 * @param {string} cardId - Card ID to delete
 * @returns {Promise<Object>} - Updated card with _destroy: true
 */
const deleteOne = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false  // Only delete non-deleted cards
      },
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

/**
 * Validate if checklist exists in card
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID to validate
 * @returns {Promise<Object|null>} - Checklist object if found, null otherwise
 */
const validateChecklistExists = async (cardId, checklistId) => {
  try {
    const card = await GET_DB().collection(CARD_COLLECTION_NAME).findOne(
      { 
        _id: new ObjectId(cardId),
        _destroy: false,
        'checklists._id': checklistId
      },
      { projection: { 'checklists.$': 1 } }
    )
    
    return card?.checklists?.[0] || null
  } catch (error) { throw new Error(error) }
}

/**
 * Validate if checklist item exists in card
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} itemId - Item ID to validate
 * @returns {Promise<Object|null>} - Item object if found, null otherwise
 */
const validateChecklistItemExists = async (cardId, checklistId, itemId) => {
  try {
    const card = await GET_DB().collection(CARD_COLLECTION_NAME).findOne(
      { 
        _id: new ObjectId(cardId),
        _destroy: false,
        'checklists._id': checklistId,
        'checklists.items._id': itemId
      },
      { projection: { 'checklists.$': 1 } }
    )
    
    if (!card?.checklists?.[0]) return null
    
    const checklist = card.checklists[0]
    const item = checklist.items.find(item => item._id === itemId)
    
    return item || null
  } catch (error) { throw new Error(error) }
}

/**
 * Get checklist statistics for a card
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Statistics object
 */
const getChecklistStats = async (cardId) => {
  try {
    const card = await findOneById(cardId)
    
    if (!card?.checklists) {
      return {
        totalChecklists: 0,
        totalItems: 0,
        completedItems: 0,
        completionPercentage: 0
      }
    }
    
    let totalItems = 0
    let completedItems = 0
    
    card.checklists.forEach(checklist => {
      if (checklist.items) {
        totalItems += checklist.items.length
        completedItems += checklist.items.filter(item => item.isCompleted).length
      }
    })
    
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    
    return {
      totalChecklists: card.checklists.length,
      totalItems,
      completedItems,
      completionPercentage
    }
  } catch (error) { throw new Error(error) }
}

export const cardModel = {
  CARD_COLLECTION_NAME,
  CARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  deleteManyByColumnId,
  deleteMany,
  deleteOne,
  unshiftNewComment,
  updateMembers,
  updateManyComments,
  
  // Thêm các hàm mới để quản lý mối quan hệ với attachments
  pushAttachmentId,
  pullAttachmentId,
  updateAttachmentCount,
  createIndexes,
  // Thêm hàm cập nhật trạng thái hoàn thành của card
  updateCardCompletedStatus,
  
  // Thêm các hàm validation và integrity checks cho checklists
  validateChecklistExists,
  validateChecklistItemExists,
  getChecklistStats
}
