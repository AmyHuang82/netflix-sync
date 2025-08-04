// Netflix Sync Content Script
(function() {
  'use strict';
  
  // 配置
  const CONFIG = {
    SERVER_URL: 'https://your-vercel-app.vercel.app', // 請替換為你的 Vercel 應用網址
    RECONNECT_INTERVAL: 5000,
    DEBOUNCE_DELAY: 300
  };
  
  // 全域變數
  let socket = null;
  let currentRoom = null;
  let isConnected = false;
  let debounceTimer = null;
  let isProcessingRemoteAction = false;
  let netflixPlayer = null;
  let netflixVideoPlayer = null;
  
  // Netflix API 管理
  const netflixAPI = {
    // 獲取 Netflix 播放器實例
    getNetflixPlayer() {
      try {
        if (window.netflix && window.netflix.appContext && window.netflix.appContext.state) {
          return window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    
    // 獲取當前影片播放器
    getCurrentVideoPlayer() {
      try {
        const player = this.getNetflixPlayer();
        if (!player) return null;
        
        const sessionIds = player.getAllPlayerSessionIds();
        if (sessionIds.length === 0) return null;
        
        return player.getVideoPlayerBySessionId(sessionIds[0]);
      } catch (error) {
        return null;
      }
    },
    
    // 檢查是否為 Netflix 頁面且有播放器
    isNetflixPage() {
      return window.location.hostname.includes('netflix.com') && this.getCurrentVideoPlayer() !== null;
    },
    
    // 獲取當前播放時間（毫秒）
    getCurrentTime() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return 0;
      
      try {
        return videoPlayer.getCurrentTime();
      } catch (error) {
        return 0;
      }
    },
    
    // 播放影片
    async play() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.play();
        return true;
      } catch (error) {
        console.error(`播放失敗：${error.message}`);
        return false;
      }
    },
    
    // 暫停影片
    async pause() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.pause();
        return true;
      } catch (error) {
        console.error(`暫停失敗：${error.message}`);
        return false;
      }
    },
    
    // 跳轉到指定時間（毫秒）
    seek(timeInMilliseconds) {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.seek(timeInMilliseconds);
        return true;
      } catch (error) {
        console.error(`跳轉失敗：${error.message}`);
        return false;
      }
    },
    
    // 獲取播放狀態
    getPlaybackState() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return null;
      
      try {
        const currentTime = this.getCurrentTime();
        const isPaused = this.isPaused();
        
        return {
          currentTime,
          paused: isPaused,
          readyState: 4
        };
      } catch (error) {
        return null;
      }
    },
    
    // 檢查是否暫停
    isPaused() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return true;
      
      try {
        return videoPlayer.isPaused();
      } catch (error) {
        return true;
      }
    },
    
    // 設置事件監聽器
    setupEventListeners() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return;
      
      try {
        // 監聽播放事件
        videoPlayer.addEventListener('play', () => {
          if (isConnected && currentRoom && !isProcessingRemoteAction) {
            const currentTime = this.getCurrentTime();
            socket.emit('play-state', {
              currentTime: currentTime,
              duration: videoPlayer.getDuration()
            });
            console.log('發送播放同步事件');
          }
        });
        
        // 監聽暫停事件
        videoPlayer.addEventListener('pause', () => {
          if (isConnected && currentRoom && !isProcessingRemoteAction) {
            const currentTime = this.getCurrentTime();
            socket.emit('pause-state', {
              currentTime: currentTime,
              duration: videoPlayer.getDuration()
            });
            console.log('發送暫停同步事件');
          }
        });
        
        // 監聽跳轉事件
        videoPlayer.addEventListener('seeked', () => {
          if (isConnected && currentRoom && !isProcessingRemoteAction) {
            const currentTime = this.getCurrentTime();
            socket.emit('seek-time', {
              currentTime: currentTime,
              duration: videoPlayer.getDuration()
            });
            console.log('發送跳轉同步事件');
          }
        });
        
        console.log('Netflix 事件監聽器設置完成');
      } catch (error) {
        console.error(`設置事件監聽器失敗：${error.message}`);
      }
    }
  };
  
  // 工具函數
  const utils = {
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    log(message, type = 'info') {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[NetflixSync ${timestamp}]`;
      
      switch(type) {
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'success':
          console.log(`${prefix} ✅ ${message}`);
          break;
        default:
          console.log(`${prefix} ${message}`);
      }
    },
    
    // 播放影片
    async playVideo() {
      return await netflixAPI.play();
    },
    
    // 暫停影片
    async pauseVideo() {
      return await netflixAPI.pause();
    },
    
    // 跳轉到指定時間
    seekToTime(targetTime) {
      return netflixAPI.seek(targetTime);
    },
    
    // 獲取當前播放狀態
    getPlaybackState() {
      return netflixAPI.getPlaybackState();
    }
  };
  
  // WebSocket 連接管理
  const connectionManager = {
    async connect() {
      if (socket && socket.connected) {
        utils.log('已經連接到伺服器');
        return;
      }
      
      try {
        // 載入 Socket.IO
        const io = await this.loadSocketIO();
        
        socket = io(CONFIG.SERVER_URL, {
          transports: ['websocket', 'polling'],
          timeout: 20000
        });
        
        socket.on('connect', () => {
          isConnected = true;
          utils.log('成功連接到同步伺服器', 'success');
          
          if (currentRoom) {
            this.joinRoom(currentRoom);
          }
        });
        
        socket.on('disconnect', () => {
          isConnected = false;
          utils.log('與伺服器斷線', 'warn');
          
          // 自動重連
          setTimeout(() => {
            if (!isConnected) {
              utils.log('嘗試重新連接...');
              this.connect();
            }
          }, CONFIG.RECONNECT_INTERVAL);
        });
        
        socket.on('connect_error', (error) => {
          utils.log(`連接錯誤：${error.message}`, 'error');
        });
        
        // 監聽同步事件
        this.setupEventListeners();
        
      } catch (error) {
        utils.log(`連接失敗：${error.message}`, 'error');
      }
    },
    
    async loadSocketIO() {
      return new Promise((resolve, reject) => {
        if (window.io) {
          resolve(window.io);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.0/socket.io.min.js';
        script.onload = () => resolve(window.io);
        script.onerror = () => reject(new Error('無法載入 Socket.IO'));
        document.head.appendChild(script);
      });
    },
    
    disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      isConnected = false;
      currentRoom = null;
      utils.log('已斷開連接');
    },
    
    createRoom(roomData) {
      if (!socket || !socket.connected) {
        utils.log('請先連接到伺服器', 'error');
        return false;
      }
      
      const { roomId, roomName, maxMembers = 10 } = roomData;
      
      if (!roomId || !roomName) {
        utils.log('房間 ID 和房間名稱為必填項目', 'error');
        return false;
      }
      
      socket.emit('create-room', {
        roomId: roomId,
        roomName: roomName,
        maxMembers: maxMembers
      });
      
      utils.log(`正在建立房間：${roomName} (${roomId})`);
      return true;
    },
    
    joinRoom(roomId) {
      if (!socket || !socket.connected) {
        utils.log('請先連接到伺服器', 'error');
        return false;
      }
      
      currentRoom = roomId;
      socket.emit('join-room', roomId);
      utils.log(`加入房間：${roomId}`, 'success');
      return true;
    },
    
    leaveRoom() {
      if (socket && currentRoom) {
        socket.emit('leave-room');
        currentRoom = null;
        utils.log('離開房間');
        return true;
      }
      return false;
    },
    
    getRooms() {
      if (!socket || !socket.connected) {
        utils.log('請先連接到伺服器', 'error');
        return;
      }
      
      socket.emit('get-rooms');
      utils.log('正在獲取房間列表...');
    },
    
    getRoomInfo(roomId) {
      if (!socket || !socket.connected) {
        utils.log('請先連接到伺服器', 'error');
        return;
      }
      
      socket.emit('get-room-info', roomId);
      utils.log(`正在獲取房間資訊：${roomId}`);
    },
    
    setupEventListeners() {
      // 房間管理事件
      socket.on('room-created', (data) => {
        currentRoom = data.roomId;
        utils.log(`房間建立成功：${data.room.name}`, 'success');
        utils.log(`房間 ID：${data.roomId}`);
        utils.log(`房主：${data.room.hostId.slice(0, 8)}`);
      });
      
      socket.on('room-joined', (data) => {
        utils.log(`成功加入房間：${data.room.name}`, 'success');
        utils.log(`房間 ID：${data.roomId}`);
        utils.log(`當前成員數：${data.room.members.length}/${data.room.maxMembers}`);
      });
      
      socket.on('room-error', (data) => {
        utils.log(`房間操作錯誤：${data.error}`, 'error');
        if (data.roomId) {
          utils.log(`房間 ID：${data.roomId}`);
        }
      });
      
      socket.on('rooms-list', (rooms) => {
        utils.log('房間列表：', 'info');
        if (rooms.length === 0) {
          utils.log('目前沒有可用的房間');
        } else {
          rooms.forEach(room => {
            utils.log(`- ${room.name} (${room.id}) - ${room.memberCount}/${room.maxMembers} 人`);
          });
        }
      });
      
      socket.on('room-info', (room) => {
        utils.log(`房間資訊：${room.name}`, 'info');
        utils.log(`房間 ID：${room.id}`);
        utils.log(`房主：${room.hostId.slice(0, 8)}`);
        utils.log(`成員數：${room.members.length}/${room.maxMembers}`);
        utils.log(`建立時間：${new Date(room.createdAt).toLocaleString()}`);
      });
      
      // 播放狀態同步
      socket.on('play-state-update', async (data) => {
        if (data.userId !== socket.id && !isProcessingRemoteAction) {
          isProcessingRemoteAction = true;
          if (await utils.playVideo()) {
            utils.log('收到播放同步');
          }
          setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
        }
      });
      
      socket.on('pause-state-update', async (data) => {
        if (data.userId !== socket.id && !isProcessingRemoteAction) {
          isProcessingRemoteAction = true;
          if (await utils.pauseVideo()) {
            utils.log('收到暫停同步');
          }
          setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
        }
      });
      
      // 時間跳轉同步
      socket.on('seek-time-update', (data) => {
        if (data.userId !== socket.id && !isProcessingRemoteAction) {
          isProcessingRemoteAction = true;
          if (utils.seekToTime(data.currentTime)) {
            utils.log(`跳轉到時間：${utils.formatTime(data.currentTime / 1000)}`);
          }
          setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
        }
      });
      
      // 用戶加入/離開
      socket.on('user-joined', (data) => {
        utils.log(`用戶 ${data.userId.slice(0, 8)} 加入房間`, 'success');
      });
      
      socket.on('user-left', (data) => {
        utils.log(`用戶 ${data.userId.slice(0, 8)} 離開房間`, 'warn');
      });
    }
  };
  
  // Netflix 控制管理
  const netflixController = {
    init() {
      if (!netflixAPI.isNetflixPage()) {
        utils.log('請在 Netflix 頁面使用此腳本', 'error');
        return false;
      }
      
      // 初始化 Netflix API
      netflixPlayer = netflixAPI.getNetflixPlayer();
      netflixVideoPlayer = netflixAPI.getCurrentVideoPlayer();
      
      if (!netflixVideoPlayer) {
        utils.log('找不到 Netflix 播放器，請確保正在播放 Netflix 影片', 'error');
        return false;
      }
      
      this.setupPlaybackListeners();
      utils.log('Netflix 控制器初始化完成', 'success');
      return true;
    },
    
    setupPlaybackListeners() {
      // 設置 Netflix 事件監聽器
      netflixAPI.setupEventListeners();
      utils.log('播放事件監聽器設置完成');
    },
    
    syncCurrentState() {
      if (!isConnected || !currentRoom) return;
      
      const state = utils.getPlaybackState();
      if (!state) return;
      
      if (state.paused) {
        socket.emit('pause-state', {
          currentTime: state.currentTime,
          duration: state.duration
        });
      } else {
        socket.emit('play-state', {
          currentTime: state.currentTime,
          duration: state.duration
        });
      }
      
      utils.log('已同步當前狀態');
    }
  };
  
  // 消息處理器
  const messageHandler = {
    // 獲取狀態
    getStatus() {
      return {
        isConnected,
        currentRoom,
        video: utils.getPlaybackState(),
        netflixPlayer: !!netflixPlayer,
        netflixVideoPlayer: !!netflixVideoPlayer
      };
    },
    
    // 建立房間
    async createRoom(roomData) {
      try {
        // 初始化 Netflix 控制器
        if (!netflixController.init()) {
          return { success: false, error: '無法初始化 Netflix 控制器' };
        }
        
        // 連接到伺服器
        await connectionManager.connect();
        
        // 建立房間
        const success = connectionManager.createRoom(roomData);
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: '建立房間失敗' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    // 加入房間
    async joinRoom(roomName) {
      try {
        // 初始化 Netflix 控制器
        if (!netflixController.init()) {
          return { success: false, error: '無法初始化 Netflix 控制器' };
        }
        
        // 連接到伺服器
        await connectionManager.connect();
        
        // 加入房間
        const success = connectionManager.joinRoom(roomName);
        if (success) {
          return { success: true };
        } else {
          return { success: false, error: '加入房間失敗' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    // 離開房間
    leaveRoom() {
      const success = connectionManager.leaveRoom();
      return { success };
    },
    
    // 獲取房間列表
    async getRooms() {
      try {
        // 初始化 Netflix 控制器
        if (!netflixController.init()) {
          return { success: false, error: '無法初始化 Netflix 控制器' };
        }
        
        // 連接到伺服器
        await connectionManager.connect();
        
        // 獲取房間列表
        connectionManager.getRooms();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    // 獲取房間資訊
    async getRoomInfo(roomId) {
      try {
        // 初始化 Netflix 控制器
        if (!netflixController.init()) {
          return { success: false, error: '無法初始化 Netflix 控制器' };
        }
        
        // 連接到伺服器
        await connectionManager.connect();
        
        // 獲取房間資訊
        connectionManager.getRoomInfo(roomId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    // 手動同步
    sync() {
      netflixController.syncCurrentState();
      return { success: true };
    }
  };
  
  // 監聽來自 popup 的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('收到消息:', request);
    
    switch (request.action) {
      case 'getStatus':
        sendResponse({ success: true, data: messageHandler.getStatus() });
        break;
        
      case 'createRoom':
        messageHandler.createRoom(request.roomData).then(result => {
          sendResponse(result);
        });
        return true; // 保持消息通道開啟
        
      case 'joinRoom':
        messageHandler.joinRoom(request.roomName).then(result => {
          sendResponse(result);
        });
        return true; // 保持消息通道開啟
        
      case 'leaveRoom':
        sendResponse(messageHandler.leaveRoom());
        break;
        
      case 'getRooms':
        messageHandler.getRooms().then(result => {
          sendResponse(result);
        });
        return true; // 保持消息通道開啟
        
      case 'getRoomInfo':
        messageHandler.getRoomInfo(request.roomId).then(result => {
          sendResponse(result);
        });
        return true; // 保持消息通道開啟
        
      case 'sync':
        sendResponse(messageHandler.sync());
        break;
        
      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  });
  
  // 自動初始化
  if (netflixAPI.isNetflixPage()) {
    utils.log('正在初始化 NetflixSync...');
    netflixController.init();
  } else {
    utils.log('請在 Netflix 頁面執行此腳本', 'error');
  }
  
})(); 