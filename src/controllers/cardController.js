/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { cardService } from '~/services/cardService'
import { CARD_COVER_COLORS, CARD_COVER_GRADIENTS } from '~/utils/constants'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { pickUser } from '~/utils/formatters'

// Helper function để lấy thông tin user đầy đủ cho socket events
const getUserFullInfo = async (userId) => {
  try {
    const user = await userModel.findOneById(userId)
    return user ? pickUser(user) : null
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}

const createNew = async (req, res, next) => {
  try {
    const createdCard = await cardService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createdCard)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const cardCoverFile = req.file
    const userInfo = req.jwtDecoded

    console.log('🔄 Card update request:', {
      cardId,
      hasFile: !!cardCoverFile,
      fileInfo: cardCoverFile ? {
        fieldname: cardCoverFile.fieldname,
        originalname: cardCoverFile.originalname,
        mimetype: cardCoverFile.mimetype,
        size: cardCoverFile.size
      } : null,
      bodyKeys: Object.keys(req.body)
    })

    const updatedCard = await cardService.update(cardId, req.body, cardCoverFile, userInfo)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) {
    console.error('❌ Card update error:', error)
    next(error)
  }
}

/**
 * Get cards with due dates for calendar view
 * Supports filtering by boardId, startDate, endDate
 */
const getCardsWithDueDate = async (req, res, next) => {
  try {
    const { boardId, startDate, endDate } = req.query
    const cardsWithDueDate = await cardService.getCardsWithDueDate(boardId, startDate, endDate)
    
    res.status(StatusCodes.OK).json(cardsWithDueDate)
  } catch (error) { next(error) }
}

/**
 * Quick update card due date (for calendar drag-and-drop)
 */
const updateDueDate = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const { dueDate } = req.body
    
    if (!cardId || dueDate === undefined) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Card ID and due date are required' 
      })
    }
    
    const updatedCard = await cardService.update(cardId, { dueDate })
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const getCoverOptions = async (req, res, next) => {
  try {
    const coverOptions = {
      colors: CARD_COVER_COLORS,
      gradients: CARD_COVER_GRADIENTS
    }
    
    res.status(StatusCodes.OK).json(coverOptions)
  } catch (error) { next(error) }
}

// Cập nhật labelIds cho card
export const updateCardLabels = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { labelIds } = req.body;
    const result = await cardService.updateCardLabels(cardId, labelIds);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

/**
 * Tạo checklist mới cho card
 */
const createChecklist = async (req, res, next) => {
  try {
    const { cardId } = req.params
    const { title } = req.body
    const userTokenInfo = req.jwtDecoded
    
    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Checklist title is required'
      })
    }
    
    const result = await cardService.createChecklist(cardId, title)
    
    // Emit real-time event for checklist creation
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId: result.newChecklist._id,
        checklistName: result.newChecklist.title,
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Checklist mới đã được tạo',
        data: {
          checklist: result.newChecklist
        }
      }
      
      console.log('🔄 Socket: Emitting checklist creation event:', {
        checklistName: enhancedData.checklistName,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_CREATED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist creation to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Create checklist error:', error)
    next(error) 
  }
}

/**
 * Thêm item vào checklist
 */
const addChecklistItem = async (req, res, next) => {
  try {
    const { cardId, checklistId } = req.params
    const { title } = req.body
    const userTokenInfo = req.jwtDecoded
    
    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Item title is required'
      })
    }
    
    const result = await cardService.addChecklistItem(cardId, checklistId, title)
    
    // Emit real-time event for checklist item creation
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        itemId: result.newItem._id,
        checklistName: result.checklistName || 'Unknown Checklist',
        itemName: result.newItem.title,
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Item checklist mới đã được tạo',
        data: {
          item: result.newItem
        }
      }
      
      console.log('🔄 Socket: Emitting checklist item creation event:', {
        checklistName: enhancedData.checklistName,
        itemName: enhancedData.itemName,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_ITEM_CREATED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist item creation to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Add checklist item error:', error)
    next(error) 
  }
}

/**
 * Cập nhật trạng thái hoàn thành của checklist item
 */
const updateChecklistItemStatus = async (req, res, next) => {
  try {
    const { cardId, checklistId, itemId } = req.params
    const { isCompleted } = req.body
    const userTokenInfo = req.jwtDecoded
    
    if (typeof isCompleted !== 'boolean') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'isCompleted must be a boolean value'
      })
    }
    
    const result = await cardService.updateChecklistItemStatus(cardId, checklistId, itemId, isCompleted)
    
    // Emit real-time event for checklist item status update
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        itemId,
        isCompleted,
        checklistName: result.checklistName || 'Unknown Checklist',
        itemName: result.itemName || 'Unknown Item',
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: `Item checklist đã được ${isCompleted ? 'hoàn thành' : 'bỏ hoàn thành'}`,
        data: {
          itemStatus: {
            isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : null
          }
        }
      }
      
      console.log('🔄 Socket: Emitting checklist item status update event:', {
        checklistName: enhancedData.checklistName,
        itemName: enhancedData.itemName,
        isCompleted,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_ITEM_STATUS_UPDATED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist item status update to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Update checklist item status error:', error)
    next(error) 
  }
}

/**
 * Xóa checklist khỏi card
 */
const deleteChecklist = async (req, res, next) => {
  try {
    const { cardId, checklistId } = req.params
    const userTokenInfo = req.jwtDecoded
    
    const result = await cardService.deleteChecklist(cardId, checklistId)
    
    // Emit real-time event for checklist deletion with enhanced data structure
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        checklistName: result.checklistName || 'Unknown Checklist',
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Checklist đã được xóa'
      }
      
      console.log('🔄 Socket: Emitting enhanced checklist deletion event:', {
        checklistName: enhancedData.checklistName,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_DELETED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist deletion to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Delete checklist error:', error)
    next(error) 
  }
}

/**
 * Xóa item khỏi checklist
 */
const deleteChecklistItem = async (req, res, next) => {
  try {
    const { cardId, checklistId, itemId } = req.params
    const userTokenInfo = req.jwtDecoded
    
    const result = await cardService.deleteChecklistItem(cardId, checklistId, itemId)
    
    // Emit real-time event for checklist item deletion with enhanced data structure
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        itemId,
        checklistName: result.checklistName || 'Unknown Checklist',
        itemName: result.itemName || 'Unknown Item',
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Item checklist đã được xóa'
      }
      
      console.log('🔄 Socket: Emitting enhanced checklist item deletion event:', {
        checklistName: enhancedData.checklistName,
        itemName: enhancedData.itemName,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_ITEM_DELETED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist item deletion to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Delete checklist item error:', error)
    next(error) 
  }
}

/**

 * Cập nhật trạng thái hoàn thành của card
 */
const updateCardCompletedStatus = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { isCardCompleted } = req.body;
    if (typeof isCardCompleted !== 'boolean') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'isCardCompleted must be a boolean value'
      });
    }
    const result = await cardService.updateCardCompletedStatus(cardId, isCardCompleted);
    // Lấy lại card mới nhất để lấy boardId và columnId
    let boardId = result.value?.boardId;
    let columnId = result.value?.columnId;
    if (!boardId || !columnId) {
      const { cardModel } = require('../models/cardModel');
      const card = await cardModel.findOneById(cardId);
      boardId = card?.boardId?.toString?.() || card?.boardId;
      columnId = card?.columnId?.toString?.() || card?.columnId;
    }
    if (global._io) {
      global._io.emit('CARD_COMPLETED_STATUS_CHANGED', {
        cardId,
        isCardCompleted,
        boardId,
        columnId
      });
    }
    res.status(StatusCodes.OK).json(result);
  } catch (error) { next(error); }
};

/**
 * Delete a card and all associated data
 */
const deleteCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userInfo = req.jwtDecoded
    const result = await cardService.deleteCard(cardId, userInfo)
    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('❌ Card deletion error:', error)
    if (error.message && error.message.includes('not found')) {
      return next(new ApiError(StatusCodes.NOT_FOUND, error.message))
    }
    return next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message))
  }
}

/**
 * Cập nhật title của checklist
 */
const updateChecklist = async (req, res, next) => {
  try {
    const { cardId, checklistId } = req.params
    const { title } = req.body
    const userTokenInfo = req.jwtDecoded
    
    if (!title || title.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Checklist title is required'
      })
    }
    
    const result = await cardService.updateChecklist(cardId, checklistId, title.trim())
    
    // Emit real-time event for checklist update
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        newTitle: title.trim(),
        oldTitle: result.oldTitle || 'Unknown Title',
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Checklist đã được cập nhật',
        data: {
          checklist: {
            _id: checklistId,
            title: title.trim()
          }
        }
      }
      
      console.log('🔄 Socket: Emitting checklist update event:', {
        checklistId,
        newTitle: enhancedData.newTitle,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_UPDATED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist update to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Update checklist error:', error)
    next(error) 
  }
}

/**
 * Cập nhật title của checklist item
 */
const updateChecklistItem = async (req, res, next) => {
  try {
    const { cardId, checklistId, itemId } = req.params
    const { title } = req.body
    const userTokenInfo = req.jwtDecoded
    
    if (!title || title.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Item title is required'
      })
    }
    
    const result = await cardService.updateChecklistItem(cardId, checklistId, itemId, title.trim())
    
    // Emit real-time event for checklist item update
    if (global._io && result.boardId && userTokenInfo) {
      // Lấy thông tin user đầy đủ từ database
      const fullUserInfo = await getUserFullInfo(userTokenInfo._id)
      
      const enhancedData = {
        boardId: result.boardId.toString(),
        cardId,
        checklistId,
        itemId,
        newTitle: title.trim(),
        oldTitle: result.oldTitle || 'Unknown Title',
        checklistName: result.checklistName || 'Unknown Checklist',
        cardTitle: result.cardTitle || 'Unknown Card',
        userInfo: {
          _id: fullUserInfo?._id || userTokenInfo._id,
          displayName: fullUserInfo?.displayName || fullUserInfo?.username || 'Unknown User',
          username: fullUserInfo?.username || 'unknown',
          avatar: fullUserInfo?.avatar || null
        },
        timestamp: new Date().toISOString(),
        message: 'Item checklist đã được cập nhật',
        data: {
          item: {
            _id: itemId,
            title: title.trim()
          }
        }
      }
      
      console.log('🔄 Socket: Emitting checklist item update event:', {
        checklistName: enhancedData.checklistName,
        itemId,
        newTitle: enhancedData.newTitle,
        cardTitle: enhancedData.cardTitle,
        userDisplayName: enhancedData.userInfo.displayName
      })
      
      global._io.to(result.boardId.toString()).emit('BE_CHECKLIST_ITEM_UPDATED', enhancedData)
      console.log('🔄 Socket: Broadcasted checklist item update to all board members')
    }
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { 
    console.error('❌ Update checklist item error:', error)
    next(error) 
  }
}

export const cardController = {
  createNew,
  update,
  getCoverOptions,
  getCardsWithDueDate,
  updateDueDate,
  updateCardLabels,
  // Thêm các API mới để xử lý checklists
  createChecklist,
  addChecklistItem,
  updateChecklistItemStatus,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklist,
  updateChecklistItem,

  // Thêm API cập nhật trạng thái hoàn thành của card
  updateCardCompletedStatus,

  deleteCard

}
