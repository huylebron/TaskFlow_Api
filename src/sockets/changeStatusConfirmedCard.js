

export const changeStatusConfirmedCard = (socket) => {
    socket.on('CARD_COMPLETED_STATUS_CHANGED', (data) => {
        socket.broadcast.emit('CARD_COMPLETED_STATUS_CHANGED', data)
    })
}