// Popup 腳本 - 更新版本
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const statusTextElement = document.getElementById('statusText');
  const roomIdInput = document.getElementById('roomName'); // 保持 ID 不變，但實際是房間 ID
  const joinBtn = document.getElementById('joinBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const roomInfo = document.getElementById('roomInfo');
  const currentRoomElement = document.getElementById('currentRoom');
  const netflixCheck = document.getElementById('netflixCheck');
  
  // 新增元素
  const createRoomIdInput = document.getElementById('createRoomId');
  const createRoomNameInput = document.getElementById('createRoomName');
  const createBtn = document.getElementById('createBtn');
  const getRoomsBtn = document.getElementById('getRoomsBtn');

  // 更新狀態顯示
  function updateStatus(isJoinedRoom, roomId = null) {
    if (isJoinedRoom) {
      statusElement.className = 'status connected';
      statusTextElement.textContent = roomId ? `已連接 - 房間：${roomId}` : '已連接';
    } else {
      statusElement.className = 'status disconnected';
      statusTextElement.textContent = '未連接';
    }
  }

  // 更新房間信息
  function updateRoomInfo(roomId) {
    if (roomId) {
      roomInfo.classList.remove('hidden');
      currentRoomElement.textContent = roomId;
    } else {
      roomInfo.classList.add('hidden');
    }
  }

  // 檢查是否在 Netflix 頁面
  function checkNetflixPage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const isNetflix = currentTab.url && currentTab.url.includes('netflix.com');
      
      if (isNetflix) {
        netflixCheck.style.display = 'none';
      } else {
        netflixCheck.style.display = 'block';
      }
    });
  }

  // 獲取當前狀態
  function getCurrentStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
        if (response && response.success) {
          const status = response.data;
          updateStatus(status.isJoinedRoom, status.currentRoom);
          updateRoomInfo(status.currentRoom);
        }
      });
    });
  }

  // 加入房間
  joinBtn.addEventListener('click', function() {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
      alert('請輸入房間 ID');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'joinRoom',
        roomId: roomId
      }, function(response) {
        if (response && response.success) {
          updateStatus(true, roomId);
          updateRoomInfo(roomId);
          roomIdInput.value = '';
        } else {
          alert('加入房間失敗：' + (response ? response.error : '未知錯誤'));
        }
      });
    });
  });

  // 離開房間
  leaveBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'leaveRoom'}, function(response) {
        if (response && response.success) {
          updateStatus(false);
          updateRoomInfo(null);
        }
      });
    });
  });

  // 建立房間
  createBtn.addEventListener('click', function() {
    const roomId = createRoomIdInput.value.trim();
    const roomName = createRoomNameInput.value.trim();
    
    if (!roomId || !roomName) {
      alert('請輸入房間 ID 和房間名稱');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'createRoom',
        roomData: {
          roomId: roomId,
          roomName: roomName,
          maxMembers: 10
        }
      }, function(response) {
        if (response && response.success) {
          updateStatus(true, roomId);
          updateRoomInfo(roomId);
          createRoomIdInput.value = '';
          createRoomNameInput.value = '';
          alert('房間建立成功！');
        } else {
          alert('建立房間失敗：' + (response ? response.error : '未知錯誤'));
        }
      });
    });
  });

  // 查看房間列表
  getRoomsBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getRooms'}, function(response) {
        if (response && response.success) {
          alert('已發送獲取房間列表請求，請查看瀏覽器控制台');
        } else {
          alert('獲取房間列表失敗：' + (response ? response.error : '未知錯誤'));
        }
      });
    });
  });

  // 初始化
  checkNetflixPage();
  getCurrentStatus();

  // 定期更新狀態
  setInterval(getCurrentStatus, 30 * 60 * 1000);
}); 