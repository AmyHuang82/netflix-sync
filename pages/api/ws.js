import { Server } from 'socket.io'

// 全局存儲房間數據
const globalRooms = new Map()
const globalClients = new Map()

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    
    // 將全局存儲附加到 io 實例上，以便其他 API 可以訪問
    io.globalRooms = globalRooms
    io.globalClients = globalClients
    
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)
      
      // 建立房間
      socket.on('create-room', (roomData) => {
        const { roomId, roomName, hostId } = roomData
        
        // 檢查房間是否已存在
        if (globalRooms.has(roomId)) {
          socket.emit('room-error', {
            error: '房間已存在',
            roomId: roomId
          })
          return
        }
        
        // 建立新房間
        const room = {
          id: roomId,
          name: roomName,
          hostId: hostId || socket.id,
          createdAt: Date.now(),
          members: [socket.id],
          maxMembers: roomData.maxMembers || 10
        }
        
        globalRooms.set(roomId, room)
        
        // 加入房間
        socket.join(roomId)
        globalClients.set(socket.id, roomId)
        
        console.log(`Room created: ${roomId} by ${socket.id}`)
        
        // 通知建立者房間建立成功
        socket.emit('room-created', {
          roomId: roomId,
          room: room
        })
      })
      
      // 加入房間
      socket.on('join-room', (roomId) => {
        // 檢查房間是否存在
        const room = globalRooms.get(roomId)
        if (!room) {
          socket.emit('room-error', {
            error: '房間不存在',
            roomId: roomId
          })
          return
        }
        
        // 檢查房間是否已滿
        if (room.members.length >= room.maxMembers) {
          socket.emit('room-error', {
            error: '房間已滿',
            roomId: roomId
          })
          return
        }
        
        // 檢查用戶是否已在房間中
        if (room.members.includes(socket.id)) {
          socket.emit('room-error', {
            error: '您已在房間中',
            roomId: roomId
          })
          return
        }
        
        // 加入房間
        socket.join(roomId)
        globalClients.set(socket.id, roomId)
        room.members.push(socket.id)
        
        console.log(`Client ${socket.id} joined room: ${roomId}`)
        
        // 通知房間內其他用戶有新用戶加入
        socket.to(roomId).emit('user-joined', {
          userId: socket.id,
          timestamp: Date.now()
        })
        
        // 通知加入者成功加入
        socket.emit('room-joined', {
          roomId: roomId,
          room: room
        })
      })
      
      // 離開房間
      socket.on('leave-room', () => {
        const roomId = globalClients.get(socket.id)
        if (roomId) {
          const room = globalRooms.get(roomId)
          if (room) {
            // 從房間成員列表中移除
            room.members = room.members.filter(id => id !== socket.id)
            
            // 如果房間空了，刪除房間
            if (room.members.length === 0) {
              globalRooms.delete(roomId)
              console.log(`Room deleted: ${roomId}`)
            } else {
              // 如果房主離開，轉移房主權限給第一個成員
              if (room.hostId === socket.id) {
                room.hostId = room.members[0]
                console.log(`Host transferred to: ${room.hostId}`)
              }
            }
          }
          
          socket.leave(roomId)
          socket.to(roomId).emit('user-left', {
            userId: socket.id,
            timestamp: Date.now()
          })
          globalClients.delete(socket.id)
          
          console.log(`Client ${socket.id} left room: ${roomId}`)
        }
      })
      
      // 獲取房間列表
      socket.on('get-rooms', () => {
        const roomList = Array.from(globalRooms.values()).map(room => ({
          id: room.id,
          name: room.name,
          memberCount: room.members.length,
          maxMembers: room.maxMembers,
          hostId: room.hostId,
          createdAt: room.createdAt
        }))
        
        socket.emit('rooms-list', roomList)
      })
      
      // 獲取房間資訊
      socket.on('get-room-info', (roomId) => {
        const room = globalRooms.get(roomId)
        if (room) {
          socket.emit('room-info', room)
        } else {
          socket.emit('room-error', {
            error: '房間不存在',
            roomId: roomId
          })
        }
      })
      
      // 處理播放狀態同步
      socket.on('play-state', (data) => {
        const roomId = globalClients.get(socket.id)
        if (roomId) {
          socket.to(roomId).emit('play-state-update', {
            ...data,
            userId: socket.id,
            timestamp: Date.now()
          })
        }
      })
      
      // 處理暫停狀態同步
      socket.on('pause-state', (data) => {
        const roomId = globalClients.get(socket.id)
        if (roomId) {
          socket.to(roomId).emit('pause-state-update', {
            ...data,
            userId: socket.id,
            timestamp: Date.now()
          })
        }
      })
      
      // 處理跳轉時間同步
      socket.on('seek-time', (data) => {
        const roomId = globalClients.get(socket.id)
        if (roomId) {
          socket.to(roomId).emit('seek-time-update', {
            ...data,
            userId: socket.id,
            timestamp: Date.now()
          })
        }
      })
      
      // 處理斷線
      socket.on('disconnect', () => {
        const roomId = globalClients.get(socket.id)
        if (roomId) {
          const room = globalRooms.get(roomId)
          if (room) {
            // 從房間成員列表中移除
            room.members = room.members.filter(id => id !== socket.id)
            
            // 如果房間空了，刪除房間
            if (room.members.length === 0) {
              globalRooms.delete(roomId)
              console.log(`Room deleted: ${roomId}`)
            } else {
              // 如果房主離開，轉移房主權限給第一個成員
              if (room.hostId === socket.id) {
                room.hostId = room.members[0]
                console.log(`Host transferred to: ${room.hostId}`)
              }
            }
          }
          
          socket.to(roomId).emit('user-left', {
            userId: socket.id,
            timestamp: Date.now()
          })
          globalClients.delete(socket.id)
        }
        console.log('Client disconnected:', socket.id)
      })
    })
    
    res.socket.server.io = io
  }
  
  res.end()
}

export default ioHandler 