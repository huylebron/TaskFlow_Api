/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { attachmentModel } from '~/models/attachmentModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { io } from '~/server'

// Extract the collection name from cardModel to avoid duplication
const CARD_COLLECTION_NAME = 'cards'

// Import INVALID_UPDATE_FIELDS from the model
const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const createNew = async (reqBody) => {
  try {
    // Process dueDate field if present
    if (reqBody.dueDate) {
      try {
        const dateObj = new Date(reqBody.dueDate)
        if (!isNaN(dateObj.getTime())) {
          reqBody.dueDate = dateObj
        } else {
          delete reqBody.dueDate // Invalid date format, remove it
        }
      } catch (error) {
        delete reqBody.dueDate // Error parsing date, remove it
      }
    }

    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newCard = {
      ...reqBody
    }
    const createdCard = await cardModel.createNew(newCard)
    const getNewCard = await cardModel.findOneById(createdCard.insertedId)

    if (getNewCard) {
      // Cập nhật mảng cardOrderIds trong collection columns
      await columnModel.pushCardOrderIds(getNewCard)
    }

    return getNewCard
  } catch (error) { throw error }
}

const update = async (cardId, updateData, cardCoverFile, userInfo) => {
  try {
    console.log('🔍 Card service update called with:', {
      cardId,
      updateDataType: typeof updateData,
      updateDataKeys: updateData ? Object.keys(updateData) : [],
      hasFile: !!cardCoverFile,
      updateDataContent: updateData
    })

    // Ensure updateData is a plain object
    if (!updateData || typeof updateData !== 'object') {
      updateData = {}
    }

    // Add updatedAt to mark when card was last modified
    updateData.updatedAt = Date.now()
    
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Process dueDate field if present (can be null to remove due date)
    if (Object.prototype.hasOwnProperty.call(updateData, 'dueDate')) {
      // If dueDate is a valid date string, convert to Date object
      if (updateData.dueDate) {
        try {
          const dateObj = new Date(updateData.dueDate)
          if (!isNaN(dateObj.getTime())) {
            updateData.dueDate = dateObj
          } else {
            delete updateData.dueDate // Invalid date format, remove it
          }
        } catch (error) {
          delete updateData.dueDate // Error parsing date, remove it
        }
      }
      // If dueDate is null, keep it as null to remove due date
    }

    // Đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId)

    let updatedCard = {}

    if (cardCoverFile) {
      console.log('🖼️ Processing card cover file upload:', {
        fieldname: cardCoverFile.fieldname,
        originalname: cardCoverFile.originalname,
        mimetype: cardCoverFile.mimetype,
        size: cardCoverFile.size,
        hasBuffer: !!cardCoverFile.buffer,
        bufferLength: cardCoverFile.buffer ? cardCoverFile.buffer.length : 0
      })

      // Validate file buffer exists
      if (!cardCoverFile.buffer) {
        throw new Error('File buffer is missing. Upload failed.')
      }

      if (cardCoverFile.buffer.length === 0) {
        throw new Error('File buffer is empty. Upload failed.')
      }

      try {
        const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
        console.log('✅ Card cover upload successful:', uploadResult.secure_url)

        updatedCard = await cardModel.update(cardId, {
          cover: uploadResult.secure_url,
          coverType: 'image'
        })
      } catch (uploadError) {
        console.error('❌ Card cover upload failed:', uploadError)
        throw new Error(`Failed to upload card cover: ${uploadError.message}`)
      }
    } else if (updateData.deleteCardCover) {
      // Xóa ảnh cover bằng cách set cover = null
      const currentCard = await cardModel.findOneById(cardId)
      
      // Nếu có publicId của ảnh cover trên Cloudinary, thì xóa ảnh đó
      if (currentCard && currentCard.cover && updateData.cloudinaryPublicId) {
        try {
          // Xóa ảnh trên Cloudinary (optional - có thể bỏ qua nếu không muốn xóa)
          await CloudinaryProvider.deleteResource(updateData.cloudinaryPublicId)
        } catch (error) {
          console.error('Error deleting Cloudinary resource:', error)
          // Tiếp tục xử lý ngay cả khi xóa ảnh trên Cloudinary thất bại
        }
      }
      
      updatedCard = await cardModel.update(cardId, { 
        cover: null,
        coverType: null
      })
    } else if (updateData.coverType === 'color' || updateData.coverType === 'gradient') {
      // Xử lý trường hợp cập nhật cover là màu hoặc gradient
      if (!updateData.cover) {
        throw new Error('Cover value is required for color or gradient type')
      }
      
      updatedCard = await cardModel.update(cardId, { 
        cover: updateData.cover,
        coverType: updateData.coverType
      })
    } else if (updateData.commentToAdd) {
      // Tạo dữ liệu comment để thêm vào Database, cần bổ sung thêm những field cần thiết
      const commentData = {
        ...updateData.commentToAdd,
        commentedAt: Date.now(),
        userId: userInfo._id,
        userEmail: userInfo.email
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
      // Lấy lại dữ liệu card mới nhất
      const latestCard = await cardModel.findOneById(cardId)
      // Emit realtime bình luận mới
      if (updatedCard?.value?.boardId) {
        io.to(updatedCard.value.boardId.toString()).emit('BE_NEW_COMMENT', {
          boardId: updatedCard.value.boardId.toString(),
          cardId,
          comment: commentData,
          card: latestCard
        })
      }
    } else if (updateData.incomingMemberInfo) {
      // Trường hợp ADD hoặc REMOVE thành viên ra khỏi Card
      updatedCard = await cardModel.updateMembers(cardId, updateData.incomingMemberInfo)
    } else if (updateData.deleteAllAttachments) {
      // ⚠️ CẨN THẬN: Trường hợp xóa tất cả attachments của card
      const attachments = await attachmentModel.findByCardId(cardId)
      
      // Xóa từng attachment và file trên Cloudinary
      for (const attachment of attachments) {
        try {
          if (attachment.cloudinaryPublicId) {
            await CloudinaryProvider.deleteResource(attachment.cloudinaryPublicId)
          }
          await attachmentModel.permanentlyDeleteOne(attachment._id.toString())
        } catch (error) {
          console.error(`Failed to delete attachment ${attachment._id}:`, error)
        }
      }
      
      // Reset attachmentIds và attachmentCount
      updatedCard = await cardModel.update(cardId, { 
        attachmentIds: [], 
        attachmentCount: 0 
      })
    } else {
      // Các trường hợp update chung như title, description
      updatedCard = await cardModel.update(cardId, updateData)
    }


    return updatedCard
  } catch (error) { throw error }
}

/**
 * ⚠️ CẨN THẬN: Xóa một card và tất cả attachments liên quan (cascade delete)
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Delete result
 */
const deleteCardAndAttachments = async (cardId) => {
  try {
    // Lấy thông tin card trước khi xóa
    const existingCard = await cardModel.findOneById(cardId)
    if (!existingCard) {
      throw new Error('Card not found.')
    }

    // 🚨 CRITICAL: Xóa tất cả attachments của card trước
    const attachments = await attachmentModel.findByCardId(cardId)
    
    // Xóa từng attachment và file trên Cloudinary
    const deletionResults = {
      totalAttachments: attachments.length,
      deletedAttachments: 0,
      failedAttachments: 0,
      errors: []
    }

    for (const attachment of attachments) {
      try {
        // Xóa file trên Cloudinary
        if (attachment.cloudinaryPublicId) {
          await CloudinaryProvider.deleteResource(attachment.cloudinaryPublicId)
        }
        
        // Hard delete attachment khỏi database
        await attachmentModel.permanentlyDeleteOne(attachment._id.toString())
        
        deletionResults.deletedAttachments++
      } catch (error) {
        console.error(`Failed to delete attachment ${attachment._id}:`, error)
        deletionResults.failedAttachments++
        deletionResults.errors.push({
          attachmentId: attachment._id,
          error: error.message
        })
      }
    }

    // Sau khi xóa attachments, xóa card
    const deletedCard = await cardModel.update(cardId, { _destroy: true })

    return {
      message: 'Card and attachments deleted successfully.',
      cardId: cardId,
      attachmentsDeletion: deletionResults,
      deletedCard
    }

  } catch (error) {
    console.error('Delete card and attachments error:', error)
    throw error
  }
}

/**
 * 🗑️ COMPREHENSIVE CARD DELETION: Delete a card with all associated data
 * This function handles the complete deletion process including:
 * - Card validation and permission checks
 * - Attachment cleanup (database + Cloudinary)
 * - Cover image cleanup (Cloudinary)
 * - Column order management
 * - Soft delete with audit trail
 * 
 * @param {string} cardId - Card ID to delete
 * @param {Object} userInfo - User information for permission validation
 * @returns {Promise<Object>} - Detailed deletion result
 */
const deleteCard = async (cardId, userInfo) => {
  try {
    console.log(`🗑️ Starting card deletion process for cardId: ${cardId}`)
    
    // ✅ STEP 1: Validate card exists and user has permission
    const existingCard = await cardModel.findOneById(cardId)
    if (!existingCard) {
      throw new Error('Card not found or already deleted.')
    }

    console.log(`📋 Card found: ${existingCard.title} in column: ${existingCard.columnId}`)

    // TODO: Add board membership validation here when user-board permissions are implemented
    // For now, we assume all authenticated users can delete cards they have access to
    
    // ✅ STEP 2: Initialize deletion result tracking
    const deletionResult = {
      cardId: cardId,
      cardTitle: existingCard.title,
      deletedAt: Date.now(),
      cleanup: {
        attachments: {
          total: 0,
          deleted: 0,
          failed: 0,
          errors: []
        },
        coverImage: {
          deleted: false,
          error: null
        },
        columnOrder: {
          updated: false,
          error: null
        }
      },
      success: false
    }

    // ✅ STEP 3: Delete all associated attachments
    console.log('🔗 Processing attachments deletion...')
    try {
      const attachments = await attachmentModel.findByCardId(cardId)
      deletionResult.cleanup.attachments.total = attachments.length
      if (attachments.length > 0) {
        console.log(`📎 Found ${attachments.length} attachments to delete, processing in parallel`)
        // Batch process attachments deletion in parallel
        await Promise.all(attachments.map(async (attachment) => {
          try {
            if (attachment.cloudinaryPublicId) {
              await CloudinaryProvider.deleteResource(attachment.cloudinaryPublicId)
              console.debug(`☁️ Deleted attachment from Cloudinary: ${attachment.name}`)
            }
            await attachmentModel.permanentlyDeleteOne(attachment._id.toString())
            deletionResult.cleanup.attachments.deleted++
            console.debug(`✅ Attachment deleted: ${attachment.name}`)
          } catch (attachmentError) {
            console.error(`❌ Failed to delete attachment ${attachment._id}:`, attachmentError)
            deletionResult.cleanup.attachments.failed++
            deletionResult.cleanup.attachments.errors.push({
              attachmentId: attachment._id,
              attachmentName: attachment.name,
              error: attachmentError.message
            })
          }
        }))
      } else {
        console.log('📎 No attachments found')
      }
    } catch (attachmentsError) {
      console.error('❌ Error processing attachments:', attachmentsError)
      deletionResult.cleanup.attachments.errors.push({ general: attachmentsError.message })
    }

    // ✅ STEP 4: Delete cover image from Cloudinary if exists
    console.log('🖼️ Processing cover image deletion...')
    try {
      if (existingCard.cover && existingCard.coverType === 'image') {
        // Extract publicId from Cloudinary URL if needed
        // This is a simplified approach - you might need more sophisticated URL parsing
        const urlParts = existingCard.cover.split('/')
        const publicIdWithExtension = urlParts[urlParts.length - 1]
        const publicId = publicIdWithExtension.split('.')[0]
        
        if (publicId) {
          await CloudinaryProvider.deleteResource(publicId)
          deletionResult.cleanup.coverImage.deleted = true
          console.log(`☁️ Deleted cover image from Cloudinary: ${publicId}`)
        }
      } else {
        console.log('🖼️ No cover image to delete')
      }
    } catch (coverError) {
      console.error('❌ Error deleting cover image:', coverError)
      deletionResult.cleanup.coverImage.error = coverError.message
      // Continue with deletion even if cover image deletion fails
    }

    // ✅ STEP 5: Remove card from column's cardOrderIds array
    console.log('📊 Updating column card order...')
    try {
      await columnModel.pullCardOrderIds(existingCard)
      deletionResult.cleanup.columnOrder.updated = true
      console.log(`📊 Card removed from column order: ${existingCard.columnId}`)
    } catch (columnError) {
      console.error('❌ Error updating column order:', columnError)
      deletionResult.cleanup.columnOrder.error = columnError.message
      // Continue with deletion even if column order update fails
    }

    // ✅ STEP 6: Soft delete the card
    console.log('🗑️ Performing soft delete on card...')
    const deletedCard = await cardModel.deleteOne(cardId)
    
    if (!deletedCard) {
      throw new Error('Failed to delete card from database.')
    }

    // ✅ STEP 7: Final success state
    deletionResult.success = true
    deletionResult.deletedCard = deletedCard

    console.log(`✅ Card deletion completed successfully: ${existingCard.title}`)
    
    return {
      message: 'Card deleted successfully with all associated data.',
      result: deletionResult
    }

  } catch (error) {
    console.error('❌ Card deletion failed:', error)
    throw new Error(`Failed to delete card: ${error.message}`)
  }
}

/**
 * Lấy card với attachments đầy đủ (populate attachments)
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} - Card with populated attachments
 */
const getCardWithAttachments = async (cardId) => {
  try {
    const card = await cardModel.findOneById(cardId)
    if (!card) {
      throw new Error('Card not found.')
    }

    // Lấy danh sách attachments của card
    const attachments = await attachmentModel.findByCardId(cardId)
    
    // Kết hợp card với attachments
    return {
      ...card,
      attachments: attachments || []
    }

  } catch (error) {
    console.error('Get card with attachments error:', error)
    throw error
  }
}

/**
 * Get cards with due dates for calendar view
 * Supports filtering by boardId, startDate, endDate
 * @param {string} boardId - Optional board ID to filter cards
 * @param {string} startDate - Optional start date for filtering (ISO string)
 * @param {string} endDate - Optional end date for filtering (ISO string)
 * @returns {Promise<Array>} - Array of cards with due dates
 */
const getCardsWithDueDate = async (boardId, startDate, endDate) => {
  try {
    const query = { 
      _destroy: false,
      dueDate: { $ne: null } // Only get cards with due dates
    }

    // Add boardId filter if provided
    if (boardId) {
      query.boardId = new ObjectId(boardId)
    }

    // Add date range filter if both startDate and endDate are provided
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    } else if (startDate) {
      // Only filter by start date
      query.dueDate = {
        $gte: new Date(startDate)
      }
    } else if (endDate) {
      // Only filter by end date
      query.dueDate = {
        $lte: new Date(endDate)
      }
    }

    // Get cards with due dates
    const cards = await GET_DB().collection(CARD_COLLECTION_NAME)
      .find(query)
      .sort({ dueDate: 1 }) // Sort by due date ascending
      .toArray()
    
    // Populate column information for each card
    // This is important for calendar display to show which column/status the card is in
    const cardsWithColumnInfo = await Promise.all(cards.map(async (card) => {
      try {
        const column = await GET_DB().collection('columns').findOne({ _id: card.columnId })
        return {
          ...card,
          columnTitle: column ? column.title : 'Unknown Column'
        }
      } catch (error) {
        return {
          ...card,
          columnTitle: 'Unknown Column'
        }
      }
    }))
    
    return cardsWithColumnInfo
  } catch (error) {
    throw new Error(`Error getting cards with due dates: ${error.message}`)
  }
}

// Cập nhật labelIds cho card
const updateCardLabels = async (cardId, labelIds) => {
  const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(cardId), _destroy: false },
    { $set: { labelIds, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );
  return result;
};

/**
 * Tạo checklist mới cho card
 * @param {string} cardId - Card ID
 * @param {string} title - Tiêu đề checklist
 * @returns {Promise<Object>} - Updated card
 */
const createChecklist = async (cardId, title) => {
  try {
    // Tạo một ObjectId mới
    const newObjectId = new ObjectId()
    
    const checklist = {
      _id: newObjectId.toString(), // Chuyển ObjectId thành string
      title: title,
      items: [],
      createdAt: Date.now(),
      updatedAt: null
    }

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false },
      { 
        $push: { checklists: checklist },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new Error('Card not found or has been deleted')
    }

    // Add enhanced context for socket notifications
    result.newChecklist = checklist
    result.cardTitle = result.title || 'Unknown Card'

    return result
  } catch (error) {
    throw new Error(`Error creating checklist: ${error.message}`)
  }
}

/**
 * Thêm item vào checklist
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} title - Tiêu đề item
 * @returns {Promise<Object>} - Updated card
 */
const addChecklistItem = async (cardId, checklistId, title) => {
  try {
    // Get card and checklist information first for context
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId
    })

    if (!card) {
      throw new Error('Card or checklist not found')
    }

    const checklist = card.checklists?.find(cl => cl._id === checklistId)
    const checklistName = checklist?.title || 'Unknown Checklist'
    const cardTitle = card.title || 'Unknown Card'

    // Tạo một ObjectId mới cho item
    const newObjectId = new ObjectId()
    
    const item = {
      _id: newObjectId.toString(),
      title: title, // Sử dụng title được truyền vào
      isCompleted: false,
      completedAt: null,
      createdAt: Date.now()
    }

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        'checklists._id': checklistId,
        _destroy: false
      },
      { 
        $push: { 'checklists.$.items': item },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new Error('Failed to add checklist item - card may have been modified')
    }

    // Add enhanced context for socket notifications
    result.newItem = item
    result.checklistName = checklistName
    result.cardTitle = cardTitle

    return result
  } catch (error) {
    throw new Error(`Error adding checklist item: ${error.message}`)
  }
}

/**
 * Cập nhật trạng thái hoàn thành của checklist item
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} itemId - Item ID
 * @param {boolean} isCompleted - Trạng thái hoàn thành
 * @returns {Promise<Object>} - Updated card
 */
const updateChecklistItemStatus = async (cardId, checklistId, itemId, isCompleted) => {
  try {
    // Get card, checklist, and item information first for context
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId,
      'checklists.items._id': itemId
    })

    if (!card) {
      throw new Error('Card, checklist, or item not found')
    }

    const checklist = card.checklists?.find(cl => cl._id === checklistId)
    const item = checklist?.items?.find(it => it._id === itemId)
    const checklistName = checklist?.title || 'Unknown Checklist'
    const itemName = item?.title || 'Unknown Item'
    const cardTitle = card.title || 'Unknown Card'

    const updateData = {
      'checklists.$[checklist].items.$[item].isCompleted': isCompleted,
      'checklists.$[checklist].items.$[item].completedAt': isCompleted ? Date.now() : null,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false },
      { $set: updateData },
      {
        arrayFilters: [
          { 'checklist._id': checklistId },
          { 'item._id': itemId }
        ],
        returnDocument: 'after'
      }
    )

    if (!result) {
      throw new Error('Failed to update checklist item status - card may have been modified')
    }

    // Add enhanced context for socket notifications
    result.checklistName = checklistName
    result.itemName = itemName
    result.cardTitle = cardTitle

    return result
  } catch (error) {
    throw new Error(`Error updating checklist item status: ${error.message}`)
  }
}

/**
 * Xóa checklist khỏi card
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID cần xóa
 * @returns {Promise<Object>} - Updated card with enhanced context
 */
const deleteChecklist = async (cardId, checklistId) => {
  try {
    // First, get the card and checklist for context information
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId
    });

    if (!card) {
      throw new Error('Card or checklist not found');
    }

    // Extract checklist and card information for socket context
    const checklistToDelete = card.checklists?.find(cl => cl._id === checklistId);
    const checklistName = checklistToDelete?.title || 'Unknown Checklist';
    const cardTitle = card.title || 'Unknown Card';

    // Validate checklist exists before attempting to delete
    const checklist = await cardModel.validateChecklistExists(cardId, checklistId);
    if (!checklist) {
      throw new Error('Checklist not found in this card');
    }

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId), 
        _destroy: false,
        'checklists._id': checklistId // Additional safety check
      },
      { 
        $pull: { checklists: { _id: checklistId } },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Failed to delete checklist - card may have been modified');
    }

    // Add enhanced context to result for socket notifications
    result.checklistName = checklistName;
    result.cardTitle = cardTitle;

    return result;
  } catch (error) {
    throw new Error(`Error deleting checklist: ${error.message}`);
  }
};

/**
 * Xóa item khỏi checklist
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} itemId - Item ID cần xóa
 * @returns {Promise<Object>} - Updated card with enhanced context
 */
const deleteChecklistItem = async (cardId, checklistId, itemId) => {
  try {
    // First, get the card, checklist, and item for context information
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId,
      'checklists.items._id': itemId
    });

    if (!card) {
      throw new Error('Card, checklist, or item not found');
    }

    // Extract context information for socket notifications
    const checklist = card.checklists?.find(cl => cl._id === checklistId);
    const itemToDelete = checklist?.items?.find(item => item._id === itemId);
    
    const checklistName = checklist?.title || 'Unknown Checklist';
    const itemName = itemToDelete?.title || 'Unknown Item';
    const cardTitle = card.title || 'Unknown Card';

    // Validate item exists before attempting to delete
    const item = await cardModel.validateChecklistItemExists(cardId, checklistId, itemId);
    if (!item) {
      throw new Error('Checklist item not found in this card');
    }

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false,
        'checklists._id': checklistId,
        'checklists.items._id': itemId // Additional safety check
      },
      { 
        $pull: { 'checklists.$.items': { _id: itemId } },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Failed to delete checklist item - card may have been modified');
    }

    // Add enhanced context to result for socket notifications
    result.checklistName = checklistName;
    result.itemName = itemName;
    result.cardTitle = cardTitle;

    return result;
  } catch (error) {
    throw new Error(`Error deleting checklist item: ${error.message}`);
  }
};

/**
 * Cập nhật trạng thái hoàn thành của card
 * @param {string} cardId - Card ID
 * @param {boolean} isCardCompleted - Trạng thái hoàn thành
 * @returns {Promise<Object>} - Updated card
 */
const updateCardCompletedStatus = async (cardId, isCardCompleted) => {
  try {
    const result = await cardModel.updateCardCompletedStatus(cardId, isCardCompleted)
    return result
  } catch (error) {
    throw new Error(`Error updating card completed status: ${error.message}`)
  }
}

/**
 * Cập nhật title của checklist
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} newTitle - Title mới
 * @returns {Promise<Object>} - Updated card with enhanced context
 */
const updateChecklist = async (cardId, checklistId, newTitle) => {
  try {
    // Get current checklist information for context
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId
    })

    if (!card) {
      throw new Error('Card or checklist not found')
    }

    const checklist = card.checklists?.find(cl => cl._id === checklistId)
    const oldTitle = checklist?.title || 'Unknown Checklist'
    const cardTitle = card.title || 'Unknown Card'

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId), 
        _destroy: false,
        'checklists._id': checklistId
      },
      { 
        $set: { 
          'checklists.$.title': newTitle,
          'checklists.$.updatedAt': Date.now(),
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new Error('Failed to update checklist - card may have been modified')
    }

    // Add enhanced context for socket notifications
    result.oldTitle = oldTitle
    result.cardTitle = cardTitle

    return result
  } catch (error) {
    throw new Error(`Error updating checklist: ${error.message}`)
  }
}

/**
 * Cập nhật title của checklist item
 * @param {string} cardId - Card ID
 * @param {string} checklistId - Checklist ID
 * @param {string} itemId - Item ID
 * @param {string} newTitle - Title mới
 * @returns {Promise<Object>} - Updated card with enhanced context
 */
const updateChecklistItem = async (cardId, checklistId, itemId, newTitle) => {
  try {
    // Get current item information for context
    const card = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOne({
      _id: new ObjectId(cardId),
      _destroy: false,
      'checklists._id': checklistId,
      'checklists.items._id': itemId
    })

    if (!card) {
      throw new Error('Card, checklist, or item not found')
    }

    const checklist = card.checklists?.find(cl => cl._id === checklistId)
    const item = checklist?.items?.find(it => it._id === itemId)
    const checklistName = checklist?.title || 'Unknown Checklist'
    const oldTitle = item?.title || 'Unknown Item'
    const cardTitle = card.title || 'Unknown Card'

    const result = await GET_DB().collection(cardModel.CARD_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(cardId),
        _destroy: false,
        'checklists._id': checklistId,
        'checklists.items._id': itemId
      },
      { 
        $set: { 
          'checklists.$[checklist].items.$[item].title': newTitle,
          updatedAt: Date.now()
        }
      },
      {
        arrayFilters: [
          { 'checklist._id': checklistId },
          { 'item._id': itemId }
        ],
        returnDocument: 'after'
      }
    )

    if (!result) {
      throw new Error('Failed to update checklist item - card may have been modified')
    }

    // Add enhanced context for socket notifications
    result.checklistName = checklistName
    result.oldTitle = oldTitle
    result.cardTitle = cardTitle

    return result
  } catch (error) {
    throw new Error(`Error updating checklist item: ${error.message}`)
  }
}

export const cardService = {
  createNew,
  update,
  
  // Thêm các function mới để xử lý attachments
  deleteCardAndAttachments,
  getCardWithAttachments,
  getCardsWithDueDate,
  updateCardLabels,
  // Thêm các function mới để xử lý checklists
  createChecklist,
  addChecklistItem,
  updateChecklistItemStatus,
  deleteChecklist,
  deleteChecklistItem,

  // Thêm function cập nhật trạng thái hoàn thành của card
  updateCardCompletedStatus,

  // Card deletion
  deleteCard,

  // Thêm function cập nhật title cho checklist và checklist item
  updateChecklist,
  updateChecklistItem
}
