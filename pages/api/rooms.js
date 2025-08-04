export default function handler(req, res) {
  if (req.method === 'GET') {
    // 獲取房間列表
    const io = res.socket.server.io
    if (!io) {
      return res.status(500).json({ error: 'WebSocket server not initialized' })
    }
    
    // 從全局房間存儲獲取房間資訊
    const globalRooms = io.globalRooms || new Map()
    const roomList = Array.from(globalRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      memberCount: room.members.length,
      maxMembers: room.maxMembers,
      hostId: room.hostId,
      createdAt: room.createdAt
    }))
    
    res.status(200).json({ rooms: roomList })
  } else if (req.method === 'DELETE') {
    // 刪除房間
    const { roomId } = req.body
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' })
    }
    
    const io = res.socket.server.io
    if (!io) {
      return res.status(500).json({ error: 'WebSocket server not initialized' })
    }
    
    const globalRooms = io.globalRooms
    const room = globalRooms.get(roomId)
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }
    
    // 通知房間內所有用戶房間被刪除
    io.to(roomId).emit('room-deleted', { roomId })
    
    // 將所有用戶踢出房間
    room.members.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.leave(roomId)
        socket.emit('room-deleted', { roomId })
      }
    })
    
    // 從全局存儲中刪除房間
    globalRooms.delete(roomId)
    
    res.status(200).json({ message: 'Room deleted successfully' })
  } else {
    res.setHeader('Allow', ['GET', 'DELETE'])
    res.status(405).json({ error: 'Method not allowed' })
  }
} 