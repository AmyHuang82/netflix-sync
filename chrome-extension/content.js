// Netflix Sync Content Script - Chrome Extension 版本
// 基於 netflix-sync-client.js 邏輯改寫
(function() {
  'use strict';

  // 注入所需的腳本到頁面
  async function injectScripts() {
    // 首先注入 Socket.IO
    const socketScript = document.createElement('script');
    socketScript.src = chrome.runtime.getURL('socket.io.min.js');
    await new Promise((resolve) => {
      socketScript.onload = resolve;
      (document.head || document.documentElement).appendChild(socketScript);
    });
    
    // 然後注入 Netflix API 腳本
    const apiScript = document.createElement('script');
    apiScript.src = chrome.runtime.getURL('netflix-api.js');
    await new Promise((resolve) => {
      apiScript.onload = () => {
        resolve();
        apiScript.remove(); // 注入後移除 script 標籤
      };
      (document.head || document.documentElement).appendChild(apiScript);
    });
  }

  // 處理來自頁面腳本的事件
  function handleNetflixEvent(event) {
    const { action, data } = event;
    
    switch (action) {
      case 'timeUpdate':
        if (socket && socket.connected && !isProcessingRemoteAction) {
          socket.emit('time-update', {
            currentTime: data.currentTime,
          });
        }
        break;
      
      case 'error':
        utils.log(data.message, 'error');
        break;
        
      default:
        utils.log(`未知的事件類型：${action}`);
    }
  }

  // 初始化訊息監聽器
  function initMessageListener() {
    window.addEventListener('message', function(event) {
      // 確保訊息來源是同一個視窗
      if (event.source !== window) return;
      
      if (event.data.type && event.data.type === 'NETFLIX_SYNC_EVENT') {
        handleNetflixEvent(event.data);
      }
    });
  }
  
  // 配置
  const CONFIG = {
    SERVER_URL: 'https://web-production-14c5.up.railway.app',
    RECONNECT_INTERVAL: 5000
  };
  
  // 全域變數
  let socket = null;
  let currentRoom = null;
  let isConnected = false;
  let isProcessingRemoteAction = false;
  let netflixPlayer = null;
  let netflixVideoPlayer = null;
  
  // Netflix API 管理 - 通過 postMessage 與注入腳本通信
  const netflixAPI = {
    // 發送命令到注入腳本
    async sendCommand(command, data = {}) {
      return new Promise((resolve) => {
        const messageId = Date.now().toString();
        
        // 設置一次性監聽器等待回應
        const listener = (event) => {
          if (event.source !== window) return;
          if (!event.data || event.data.type !== 'NETFLIX_SYNC_RESPONSE' || event.data.messageId !== messageId) return;
          
          window.removeEventListener('message', listener);
          resolve(event.data.result);
        };
        
        window.addEventListener('message', listener);
        
        // 發送命令
        window.postMessage({
          type: 'NETFLIX_SYNC_COMMAND',
          command,
          data,
          messageId
        }, '*');
      });
    },
    
    // 檢查是否為 Netflix 頁面且有播放器
    async isNetflixPage() {
      return await this.sendCommand('isNetflixPage');
    },
    
    // 獲取當前播放時間（毫秒）
    async getCurrentTime() {
      return await this.sendCommand('getCurrentTime');
    },
    
    // 播放影片
    async play(timeInMilliseconds) {
      const result = await this.sendCommand('play', { timeInMilliseconds });
      if (result && socket && socket.connected) {
        const currentTime = await this.getCurrentTime();
        socket.emit('play-state', { currentTime });
      }
      return result;
    },
    
    // 暫停影片
    async pause() {
      const result = await this.sendCommand('pause');
      if (result && socket && socket.connected) {
        const currentTime = await this.getCurrentTime();
        socket.emit('pause-state', { currentTime });
      }
      return result;
    },
    
    // 跳轉到指定時間（毫秒）
    async seek(timeInMilliseconds) {
      const result = await this.sendCommand('seek', { timeInMilliseconds });
      if (result && socket && socket.connected) {
        socket.emit('seek-time', { currentTime: timeInMilliseconds });
      }
      return result;
    }
  };
  
  // 工具函數
  const utils = {
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
    async playVideo(targetTime) {
      return await netflixAPI.play(targetTime);
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
        // 通過 postMessage 請求建立 Socket.IO 連接
        const result = await new Promise((resolve) => {
          const messageId = Date.now().toString();
          
          const listener = (event) => {
            if (event.source !== window) return;
            if (!event.data || event.data.type !== 'SOCKET_IO_CONNECT_RESPONSE' || event.data.messageId !== messageId) return;
            
            window.removeEventListener('message', listener);
            resolve(event.data.success);
          };
          
          window.addEventListener('message', listener);
          
          window.postMessage({
            type: 'SOCKET_IO_CONNECT',
            messageId,
            serverUrl: CONFIG.SERVER_URL,
            options: {
              transports: ['websocket'],
              timeout: 20000
            }
          }, '*');
        });

        if (!result) {
          throw new Error('Socket.IO 連接失敗');
        }
        
        // 創建一個代理物件來處理 Socket.IO 操作
        socket = {
          connected: true,
          on: (event, callback) => {
            const handler = (e) => {
              if (e.source !== window) return;
              if (!e.data || e.data.type !== 'SOCKET_IO_EVENT' || e.data.event !== event) return;
              callback(e.data.data);
            };
            window.addEventListener('message', handler);
            // 保存事件處理器以便之後可以移除
            if (!socket._handlers) socket._handlers = new Map();
            socket._handlers.set(event, handler);
          },
          emit: (event, data) => {
            window.postMessage({
              type: 'SOCKET_IO_EMIT',
              event,
              data
            }, '*');
          },
          disconnect: () => {
            window.postMessage({
              type: 'SOCKET_IO_DISCONNECT'
            }, '*');
            // 清理所有事件監聽器
            if (socket._handlers) {
              socket._handlers.forEach((handler, event) => {
                window.removeEventListener('message', handler);
              });
              socket._handlers.clear();
            }
            socket.connected = false;
          }
        };
        
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
    }
  };
  
  // Netflix 控制管理
  const netflixController = {
    init() {
      if (!utils.isNetflixPage()) {
        utils.log('請在 Netflix 頁面使用此腳本', 'error');
        return false;
      }
      
      utils.log('Netflix 控制器初始化完成', 'success');
      return true;
    }
  };
  
  // 消息處理器 - Chrome 擴展專用
  const messageHandler = {
    // 獲取狀態
    getStatus() {
      return {
        isConnected,
        currentRoom,
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
    async joinRoom(roomId) {
      try {
        // 初始化 Netflix 控制器
        if (!netflixController.init()) {
          return { success: false, error: '無法初始化 Netflix 控制器' };
        }
        
        // 連接到伺服器
        await connectionManager.connect();
        
        // 加入房間
        const success = connectionManager.joinRoom(roomId);
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
    
    // 手動控制
    async play(time) {
      return await utils.playVideo(time);
    },
    
    async pause() {
      return await utils.pauseVideo();
    },
    
    seek(time) {
      return utils.seekToTime(time); // time 參數是毫秒
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
        messageHandler.joinRoom(request.roomId).then(result => {
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
        
      case 'play':
        messageHandler.play(request.time).then(result => {
          sendResponse({ success: result });
        });
        return true;
        
      case 'pause':
        messageHandler.pause().then(result => {
          sendResponse({ success: result });
        });
        return true;
        
      case 'seek':
        const seekResult = messageHandler.seek(request.time);
        sendResponse({ success: seekResult });
        break;
        
      case 'getNetflixAPI':
        sendResponse({ success: true, data: messageHandler.getNetflixAPI() });
        break;
        
      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  });
  
  // 自動初始化
  async function initialize() {
    if (utils.isNetflixPage()) {
      utils.log('正在初始化 NetflixSync Chrome 擴展...');
      
      try {
        // 注入必要的腳本
        await injectScripts();
        
        // 初始化訊息監聽
        initMessageListener();
        
        // 初始化 Netflix 控制器
        netflixController.init();
        
        utils.log('初始化完成', 'success');
      } catch (error) {
        utils.log(`初始化失敗：${error.message}`, 'error');
      }
    } else {
      utils.log('請在 Netflix 頁面使用此擴展', 'error');
    }
  }
  
  // 開始初始化
  initialize();
  
})();
