// Netflix Sync Client - 使用 Netflix 注入 API 版本
// 使用方式：
// 1. 打開 Netflix 並開始播放影片
// 2. 按 F12 打開開發者工具
// 3. 貼上此腳本到 Console 並執行
// 4. 使用 NetflixSync.joinRoom('房間名稱') 加入同步房間

(function() {
  'use strict';
  
  // 首先載入 Socket.IO 客戶端庫
  function loadSocketIO() {
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
  }
  
  // 配置
  const CONFIG = {
    SERVER_URL: 'https://web-production-14c5.up.railway.app',
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
        return videoPlayer.getCurrentTime(); // 直接返回毫秒
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
        this._lastTime = this.getCurrentTime();
        socket.emit('play-state', {
          currentTime: this._lastTime,
        });
        return true;
      } catch (error) {
        utils.log(`播放失敗：${error.message}`, 'error');
        return false;
      }
    },
    
    // 暫停影片
    async pause() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.pause();
        this._lastTime = this.getCurrentTime();
        socket.emit('pause-state', {
          currentTime: this._lastTime,
        });
        return true;
      } catch (error) {
        utils.log(`暫停失敗：${error.message}`, 'error');
        return false;
      }
    },
    
    // 跳轉到指定時間（毫秒）
    seek(timeInMilliseconds) {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.seek(timeInMilliseconds);
        this._lastTime = timeInMilliseconds;
        utils.log(`跳轉到時間：${utils.formatTime(timeInMilliseconds / 1000)}`);
        return true;
      } catch (error) {
        utils.log(`跳轉失敗：${error.message}`, 'error');
        return false;
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
            utils.log('發送播放同步事件');
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
            utils.log('發送暫停同步事件');
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
            utils.log('發送跳轉同步事件');
          }
        });
        
        utils.log('Netflix 事件監聽器設置完成');
      } catch (error) {
        utils.log(`設置事件監聽器失敗：${error.message}`, 'error');
      }
    }
  };
  
  // 工具函數
  const utils = {
    getVideo() {
      // 保留 DOM video 元素作為備用
      return document.querySelector('video');
    },
    
    isNetflixPage() {
      return netflixAPI.isNetflixPage();
    },
    
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
      return netflixAPI.seek(targetTime); // targetTime 現在是毫秒
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
        const io = await loadSocketIO();
        
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
      }
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
      if (!utils.isNetflixPage()) {
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
    }
  };
  
  // 全域 API
  window.NetflixSync = {
    // 連接管理
    connect() {
      connectionManager.connect();
    },
    
    disconnect() {
      connectionManager.disconnect();
    },
    
    createRoom(roomData) {
      return connectionManager.createRoom(roomData);
    },
    
    joinRoom(roomId) {
      return connectionManager.joinRoom(roomId);
    },
    
    leaveRoom() {
      connectionManager.leaveRoom();
    },
    
    getRooms() {
      connectionManager.getRooms();
    },
    
    getRoomInfo(roomId) {
      connectionManager.getRoomInfo(roomId);
    },
    
    // 狀態查詢
    getStatus() {
      return {
        isConnected,
        currentRoom,
        netflixPlayer: !!netflixPlayer,
        netflixVideoPlayer: !!netflixVideoPlayer
      };
    },
    
    // 手動同步
    sync() {
      netflixController.syncCurrentState();
    },
    
    // 手動控制
    async play() {
      return await utils.playVideo();
    },
    
    async pause() {
      return await utils.pauseVideo();
    },
    
    seek(time) {
      utils.seekToTime(time); // time 參數是毫秒
    },
    
    // 獲取 Netflix API 實例
    getNetflixAPI() {
      return {
        player: netflixPlayer,
        videoPlayer: netflixVideoPlayer,
        api: netflixAPI
      };
    },
    
    // 初始化
    async init() {
      if (netflixController.init()) {
        await connectionManager.connect();
        utils.log('NetflixSync 初始化完成！', 'success');
        utils.log('使用 NetflixSync.createRoom({roomId: "房間 ID", roomName: "房間名稱"}) 建立房間');
        utils.log('使用 NetflixSync.joinRoom("房間 ID") 加入同步房間');
        utils.log('使用 NetflixSync.getRooms() 查看所有房間');
        utils.log('使用 NetflixSync.getRoomInfo("房間 ID") 查看房間詳細資訊');
        utils.log('使用 NetflixSync.getStatus() 查看當前狀態');
        utils.log('使用 NetflixSync.sync() 手動同步當前狀態');
        utils.log('使用 NetflixSync.play() / NetflixSync.pause() 手動控制播放');
        utils.log('使用 NetflixSync.getNetflixAPI() 獲取 Netflix API 實例');
      }
    }
  };
  
  // 自動初始化
  if (utils.isNetflixPage()) {
    utils.log('正在初始化 NetflixSync...');
    window.NetflixSync.init();
  } else {
    utils.log('請在 Netflix 頁面執行此腳本', 'error');
  }
  
})(); 
