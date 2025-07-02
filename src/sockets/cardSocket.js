export const cardSocket = (io, socket) => {
  // Client join vào room board
  socket.on('joinBoard', (boardId) => {
    socket.join(boardId)
  })

  // Khi có bình luận mới, emit tới room
  socket.on('FE_NEW_COMMENT', (data) => {
    // data cần chứa boardId, cardId, comment
    io.to(data.boardId).emit('BE_NEW_COMMENT', data)
  })

  // Xoá card realtime
  socket.on('FE_CARD_DELETED', (data) => {
    socket.to(data.boardId).emit('BE_CARD_DELETED', data)
  })

  // Xóa checklist realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_DELETED', (data) => {
    const enhancedData = { 
      ...data, 
      timestamp: new Date().toISOString() 
    }
    console.log('🔄 Socket FE_CHECKLIST_DELETED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_DELETED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist deletion to all board members')
  })

  // Xóa checklist item realtime - Universal Notifications Pattern ✅  
  socket.on('FE_CHECKLIST_ITEM_DELETED', (data) => {
    const enhancedData = { 
      ...data, 
      timestamp: new Date().toISOString() 
    }
    console.log('🔄 Socket FE_CHECKLIST_ITEM_DELETED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_ITEM_DELETED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist item deletion to all board members')
  })

  // Tạo checklist mới realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_CREATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CHECKLIST_CREATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_CREATED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist creation to all board members')
  })

  // Tạo checklist item mới realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_ITEM_CREATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CHECKLIST_ITEM_CREATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_ITEM_CREATED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist item creation to all board members')
  })

  // Cập nhật trạng thái checklist item realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_ITEM_STATUS_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CHECKLIST_ITEM_STATUS_UPDATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_ITEM_STATUS_UPDATED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist item status update to all board members')
  })

  // Cập nhật checklist title realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CHECKLIST_UPDATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_UPDATED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist update to all board members')
  })

  // Cập nhật checklist item title realtime - Universal Notifications Pattern ✅
  socket.on('FE_CHECKLIST_ITEM_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CHECKLIST_ITEM_UPDATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CHECKLIST_ITEM_UPDATED', enhancedData) // ALL members
    console.log('🔄 Socket: Broadcasted checklist item update to all board members')
  })

  // Cập nhật due date realtime - Universal Notifications Pattern ✅
  socket.on('FE_CARD_DUE_DATE_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🗓️ Socket FE_CARD_DUE_DATE_UPDATED received:', enhancedData)
    io.to(data.boardId).emit('BE_CARD_DUE_DATE_UPDATED', enhancedData) // ALL members
    console.log('🗓️ Socket: Broadcasted due date update to all board members')
  })

  // Xóa due date realtime - Universal Notifications Pattern ✅
  socket.on('FE_CARD_DUE_DATE_REMOVED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🗑️ Socket FE_CARD_DUE_DATE_REMOVED received:', enhancedData)
    io.to(data.boardId).emit('BE_CARD_DUE_DATE_REMOVED', enhancedData) // ALL members
    console.log('🗑️ Socket: Broadcasted due date removal to all board members')
  })
} 