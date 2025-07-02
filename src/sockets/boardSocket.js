export const boardSocket = (io, socket) => {
  // Client join vào room board
  socket.on('joinBoard', (boardId) => {
    socket.join(boardId)
  })

  // Khi có thao tác move card, emit tới room với Universal Notifications Pattern
  socket.on('FE_CARD_MOVED', (data) => {
    // Enhanced data structure với user info và context đầy đủ
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_CARD_MOVED received:', enhancedData);
    console.log('🔄 Broadcasting card movement to all members in board:', data.boardId);
    
    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    // This ensures all members receive the same notification data consistently
    io.to(data.boardId).emit('BE_CARD_MOVED', enhancedData)
    
    console.log('🔄 Socket: Broadcasted card movement to all board members');
  })

  // Khi có thao tác move column, emit tới room
  socket.on('FE_COLUMN_MOVED', (data) => {
    // data cần chứa boardId, columnOrderIds
    io.to(data.boardId).emit('BE_COLUMN_MOVED', data)
  })

  // Cập nhật tên cột realtime
  socket.on('FE_COLUMN_UPDATED', (data) => {
    // Enhanced data structure với user info và column details
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('📝 Socket FE_COLUMN_UPDATED received:', enhancedData);
    console.log('📝 Broadcasting to all members in board:', data.boardId);
    
    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    // This ensures all members receive the same notification data consistently
    io.to(data.boardId).emit('BE_COLUMN_UPDATED', enhancedData)
    
    console.log('📝 Socket: Broadcasted column update to all board members');
  })

  // Cập nhật tên card
  socket.on('FE_CARD_UPDATED', (data) => {
    socket.to(data.boardId).emit('BE_CARD_UPDATED', data)
  })

  // Cập nhật label (Universal Notifications)
  socket.on('FE_LABEL_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🏷️ Socket FE_LABEL_UPDATED received:', enhancedData)
    console.log('🏷️ Broadcasting label update to all members in board:', data.boardId)
    
    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    io.to(data.boardId).emit('BE_LABEL_UPDATED', enhancedData)
    
    console.log('🏷️ Socket: Broadcasted label update to all board members')
  })

  // Thêm cột realtime
  socket.on('FE_COLUMN_CREATED', (data) => {
    // Enhanced data structure với user info và column details
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🔄 Socket FE_COLUMN_CREATED received:', enhancedData);
    console.log('🔄 Broadcasting to all members in board:', data.boardId);
    
    // Use io.to() to broadcast to ALL members (including sender) for sync
    // This ensures all members receive the same notification data
    io.to(data.boardId).emit('BE_COLUMN_CREATED', enhancedData)
    
    console.log('🔄 Socket: Broadcasted column creation to all board members');
  })

  // Xoá cột realtime
  socket.on('FE_COLUMN_DELETED', (data) => {
    // Enhanced data structure với user info và column details
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🗑️ Socket FE_COLUMN_DELETED received:', enhancedData);
    console.log('🗑️ Broadcasting to all members in board:', data.boardId);
    
    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    // This ensures all members receive the same notification data consistently
    io.to(data.boardId).emit('BE_COLUMN_DELETED', enhancedData)
    
    console.log('🗑️ Socket: Broadcasted column deletion to all board members');
  })

  // Di chuyển card trong cùng cột realtime
  socket.on('FE_CARD_SORTED_IN_COLUMN', (data) => {
    socket.to(data.boardId).emit('BE_CARD_SORTED_IN_COLUMN', data)
  })

  // Hoàn thành hoặc bỏ hoàn thành Card (Universal Notifications)
  socket.on('FE_CARD_COMPLETED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('✅ Socket FE_CARD_COMPLETED received:', enhancedData)
    console.log('✅ Broadcasting card completed status to all members in board:', data.boardId)

    io.to(data.boardId).emit('BE_CARD_COMPLETED', enhancedData)

    console.log('✅ Socket: Broadcasted card completed status to all board members')
  })

  // Cập nhật thành viên card (Universal Notifications)
  socket.on('FE_CARD_MEMBER_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('👥 Socket FE_CARD_MEMBER_UPDATED received:', enhancedData)
    console.log('👥 Broadcasting card member update to all members in board:', data.boardId)

    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    io.to(data.boardId).emit('BE_CARD_MEMBER_UPDATED', enhancedData)

    console.log('👥 Socket: Broadcasted card member update to all board members')
  })

  // Cập nhật ảnh cover card (Universal Notifications)
  socket.on('FE_CARD_COVER_UPDATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🖼️ Socket FE_CARD_COVER_UPDATED received:', enhancedData)
    console.log('🖼️ Broadcasting card cover update to all members in board:', data.boardId)

    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    io.to(data.boardId).emit('BE_CARD_COVER_UPDATED', enhancedData)

    console.log('🖼️ Socket: Broadcasted card cover update to all board members')
  })

  // Tạo card mới (Universal Notifications)
  socket.on('FE_CARD_CREATED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('📝 Socket FE_CARD_CREATED received:', enhancedData)
    console.log('📝 Broadcasting card creation to all members in board:', data.boardId)

    // Use io.to() to broadcast to ALL members (including sender) for Universal Notifications
    io.to(data.boardId).emit('BE_CARD_CREATED', enhancedData)

    console.log('📝 Socket: Broadcasted card creation to all board members')
  })

  // Tải lên tệp đính kèm cho card (Universal Notifications)
  socket.on('FE_ATTACHMENT_UPLOADED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('📎 Socket FE_ATTACHMENT_UPLOADED received:', enhancedData)
    console.log('📎 Broadcasting attachment upload to all members in board:', data.boardId)

    // Broadcast to all members (including the actor) for universal notifications
    io.to(data.boardId).emit('BE_ATTACHMENT_UPLOADED', enhancedData)

    console.log('📎 Socket: Broadcasted attachment upload to all board members')
  })

  // Xóa tệp đính kèm cho card (Universal Notifications)
  socket.on('FE_ATTACHMENT_DELETED', (data) => {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    console.log('🗑️ Socket FE_ATTACHMENT_DELETED received:', enhancedData)
    console.log('🗑️ Broadcasting attachment delete to all members in board:', data.boardId)

    // Broadcast to all members (including the actor) for universal notifications
    io.to(data.boardId).emit('BE_ATTACHMENT_DELETED', enhancedData)

    console.log('🗑️ Socket: Broadcasted attachment delete to all board members')
  })
} 