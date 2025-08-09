// Netflix API 互動邏輯
(function() {
  'use strict';

  // Socket.IO 實例
  let socket = null;

  const utils = {
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
  }

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

    // 與 content script 通訊
    sendToContentScript(type, data) {
      window.postMessage({
        type: 'NETFLIX_SYNC_EVENT',
        action: type,
        data: data
      }, '*');
    },

    // 回應 content script 的命令
    sendResponse(messageId, result) {
      window.postMessage({
        type: 'NETFLIX_SYNC_RESPONSE',
        messageId,
        result
      }, '*');
    },

    // API 方法
    isNetflixPage() {
      return window.location.hostname.includes('netflix.com') && this.getCurrentVideoPlayer() !== null;
    },

    getCurrentTime() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return 0;
      
      try {
        return videoPlayer.getCurrentTime();
      } catch (error) {
        return 0;
      }
    },

    async play(timeInMilliseconds) {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        if (timeInMilliseconds) videoPlayer.seek(timeInMilliseconds);
        videoPlayer.play();
        this._lastTime = this.getCurrentTime();
        return true;
      } catch (error) {
        console.log(`播放失敗：${error.message}`, 'error');
        return false;
      }
    },

    async pause() {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.pause();
        this._lastTime = this.getCurrentTime();
        return true;
      } catch (error) {
        console.log(`暫停失敗：${error.message}`, 'error');
        return false;
      }
    },

    seek(timeInMilliseconds) {
      const videoPlayer = this.getCurrentVideoPlayer();
      if (!videoPlayer) return false;
      
      try {
        videoPlayer.seek(timeInMilliseconds);
        this._lastTime = timeInMilliseconds;
        console.log(`跳轉到時間：${utils.formatTime(timeInMilliseconds / 1000)}`);
        return true;
      } catch (error) {
        console.log(`跳轉失敗：${error.message}`, 'error');
        return false;
      }
    },

    // 設置事件監聽器
    setupEventListeners() {
      const videoElement = document.querySelector('video');
      if (!videoElement) return;

      videoElement.addEventListener('play', () => {
        const currentTime = this.getCurrentTime();
        socket.emit('play-state', {
          currentTime: currentTime,
        });
        console.log('發送播放同步事件');
      });

      videoElement.addEventListener('pause', () => {
        const currentTime = this.getCurrentTime();
        socket.emit('pause-state', {
          currentTime: currentTime,
        });
        console.log('發送暫停同步事件');
      });

      videoElement.addEventListener('seeked', () => {
        const currentTime = videoElement.currentTime * 1000;
        socket.emit('seek-time', {
          currentTime: currentTime,
        });
        console.log('發送跳轉同步事件');
      });
    }
  };

  // 監聽來自 content script 的命令
  window.addEventListener('message', async function(event) {
    if (event.source !== window) return;

    const { type, command, data, messageId } = event.data;
    
    // 處理 Socket.IO 相關操作
    if (type && type.startsWith('SOCKET_IO_')) {
      handleSocketIOOperation(event);
      return;
    }
    
    // 處理 Netflix API 命令
    if (type === 'NETFLIX_SYNC_COMMAND') {
      let result = null;
      
      switch (command) {
        case 'isNetflixPage':
          result = netflixAPI.isNetflixPage();
          break;
          
        case 'getCurrentTime':
          result = netflixAPI.getCurrentTime();
          break;
          
        case 'play':
          result = await netflixAPI.play(data.timeInMilliseconds);
          break;
          
        case 'pause':
          result = await netflixAPI.pause();
          break;
          
        case 'seek':
          result = netflixAPI.seek(data.timeInMilliseconds);
          break;
          
        default:
          console.warn('未知的命令：', command);
          result = false;
      }
      
      netflixAPI.sendResponse(messageId, result);
    }
  });

  // Socket.IO 事件處理
  function handleSocketIOOperation(event) {
    const { type, messageId, serverUrl, options, event: socketEvent, data } = event.data;

    switch (type) {
      case 'SOCKET_IO_CONNECT':
        if (!socket) {
          socket = io(serverUrl, options);

          let isConnected = false;
          let isProcessingRemoteAction = false;
          
          // 基本事件監聽
          socket.on('connect', () => {
            isConnected = true;

            netflixAPI.setupEventListeners();
            console.log('開始監聽播放事件');

            window.postMessage({
              type: 'SOCKET_IO_EVENT',
              event: 'connect'
            }, '*');
          });
          
          socket.on('disconnect', () => {
            isConnected = false;
            console.log('Socket.IO 斷開連接');

            window.postMessage({
              type: 'SOCKET_IO_EVENT',
              event: 'disconnect'
            }, '*');

            setTimeout(() => {
              if (!isConnected) {
                console.log('Socket.IO 重新連接中...');
                socket.connect();
              }
            }, 5000);
          });
          
          socket.on('connect_error', (error) => {
            console.error('Socket.IO 連接錯誤：', error.message);

            window.postMessage({
              type: 'SOCKET_IO_EVENT',
              event: 'connect_error',
              data: { message: error.message }
            }, '*');
          });

          socket.on('room-joined', (data) => {
            console.log(`成功加入房間：${data.room.name}`, 'success');
            console.log(`房間 ID：${data.roomId}`);
            console.log(`當前成員數：${data.room.members.length}/${data.room.maxMembers}`);
          });

          socket.on('play-state-update', async (data) => {
            if (data.userId !== socket.id && !isProcessingRemoteAction) {
              isProcessingRemoteAction = true;
              if (await netflixAPI.play(data.currentTime)) {
                console.log('收到播放同步');
              }
              setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
            }
          });

          socket.on('pause-state-update', async (data) => {
            if (data.userId !== socket.id && !isProcessingRemoteAction) {
              isProcessingRemoteAction = true;
              if (await netflixAPI.pause()) {
                console.log('收到暫停同步');
              }
              setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
            }
          });

          socket.on('seek-time-update', (data) => {
            if (data.userId !== socket.id && !isProcessingRemoteAction) {
              isProcessingRemoteAction = true;
              if (netflixAPI.seek(data.currentTime)) {
                console.log(`跳轉到時間：${utils.formatTime(data.currentTime / 1000)}`);
              }
              setTimeout(() => { isProcessingRemoteAction = false; }, 1000);
            }
          });

          socket.on('user-joined', (data) => {
            console.log(`用戶 ${data.userId.slice(0, 8)} 加入房間`, 'success');
          });

          socket.on('user-left', (data) => {
            console.log(`用戶 ${data.userId.slice(0, 8)} 離開房間`, 'warn');
          });
        }
        
        window.postMessage({
          type: 'SOCKET_IO_CONNECT_RESPONSE',
          messageId,
          success: true
        }, '*');
        break;
        
      case 'SOCKET_IO_EMIT':
        if (socket) {
          socket.emit(socketEvent, data);
        }
        break;
        
      case 'SOCKET_IO_DISCONNECT':
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        break;
    }
  }

  // 初始化事件監聽器
  if (netflixAPI.isNetflixPage()) {
    netflixAPI.setupPlayerEvents(netflixAPI.getCurrentVideoPlayer());
  }

  // 將 API 掛載到 window 物件
  window.netflixSyncAPI = netflixAPI;
})();
