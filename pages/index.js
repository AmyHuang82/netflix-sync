import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [messages, setMessages] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // 初始化 Socket.IO 連接
    const initSocket = async () => {
      const { io } = await import('socket.io-client')
      const socketInstance = io('https://web-production-14c5.up.railway.app', {
        transports: ['websocket'],
        timeout: 20000
      })
      
      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket server')
        setSocket(socketInstance)
      })
      
      socketInstance.on('disconnect', () => {
        console.log('Disconnected from WebSocket server')
      })
      
      socketInstance.on('rooms-list', (roomList) => {
        setRooms(roomList)
      })
      
      socketInstance.on('room-deleted', (data) => {
        setRooms(prev => prev.filter(room => room.id !== data.roomId))
        addMessage(`房間 ${data.roomId} 已被刪除`)
      })
      
      socketInstance.on('user-joined', (data) => {
        addMessage(`用戶 ${data.userId} 加入了房間`)
      })
      
      socketInstance.on('user-left', (data) => {
        addMessage(`用戶 ${data.userId} 離開了房間`)
      })
    }
    
    initSocket()
    
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const addMessage = (message) => {
    setMessages(prev => [...prev, { text: message, time: new Date().toLocaleTimeString() }])
  }

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const response = await fetch('https://web-production-14c5.up.railway.app/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms)
      } else {
        addMessage('獲取房間列表失敗')
      }
    } catch (error) {
      addMessage('獲取房間列表錯誤：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteRoom = async (roomId) => {
    if (!confirm('確定要刪除這個房間嗎？房間內的所有用戶將被踢出。')) {
      return
    }
    
    try {
      const response = await fetch('https://web-production-14c5.up.railway.app/rooms', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId })
      })
      
      if (response.ok) {
        addMessage(`房間 ${roomId} 已刪除`)
        setRooms(prev => prev.filter(room => room.id !== roomId))
      } else {
        const error = await response.json()
        addMessage('刪除房間失敗：' + error.error)
      }
    } catch (error) {
      addMessage('刪除房間錯誤：' + error.message)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-TW')
  }

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px' 
    }}>
      <Head>
        <title>Netflix Sync - 房間管理</title>
        <meta name="description" content="Netflix 同步系統房間管理頁面" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 style={{ color: '#e50914', textAlign: 'center' }}>
          🎬 Netflix Sync - 房間管理
        </h1>

        {/* 房間管理區域 */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #ddd',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>房間管理</h2>
            <button 
              onClick={fetchRooms}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e50914',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '載入中...' : '刷新房間列表'}
            </button>
          </div>
          
          {rooms.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>目前沒有活躍的房間</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {rooms.map(room => (
                <div key={room.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                        {room.name || room.id}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
                        <div>
                          <strong>房間 ID：</strong> <code>{room.id}</code>
                        </div>
                        <div>
                          <strong>成員數量：</strong> {room.memberCount}/{room.maxMembers}
                        </div>
                        <div>
                          <strong>房主 ID：</strong> <code>{room.hostId}</code>
                        </div>
                        <div>
                          <strong>建立時間：</strong> {formatTime(room.createdAt)}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteRoom(room.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      刪除房間
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 即時消息區域 */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #ddd',
          marginBottom: '20px'
        }}>
          <h2>即時消息</h2>
          <div style={{ 
            height: '200px', 
            overflowY: 'auto', 
            border: '1px solid #eee', 
            padding: '10px',
            backgroundColor: '#f8f8f8'
          }}>
            {messages.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center' }}>等待消息...</p>
            ) : (
              messages.map((msg, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px', 
                  padding: '8px', 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  borderLeft: '3px solid #e50914'
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>{msg.time}</div>
                  <div>{msg.text}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer style={{ 
          textAlign: 'center', 
          marginTop: '40px', 
          color: '#666',
          fontSize: '14px'
        }}>
          <p>⚠️ 此專案僅供學習和個人使用，請遵守相關服務條款</p>
        </footer>
      </main>
    </div>
  )
}
