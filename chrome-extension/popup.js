// Popup 腳本
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const statusTextElement = document.getElementById('statusText');
  const roomNameInput = document.getElementById('roomName');
  const joinBtn = document.getElementById('joinBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const roomInfo = document.getElementById('roomInfo');
  const currentRoomElement = document.getElementById('currentRoom');
  const netflixCheck = document.getElementById('netflixCheck');

  // 更新狀態顯示
  function updateStatus(isConnected, roomName = null) {
    if (isConnected) {
      statusElement.className = 'status connected';
      statusTextElement.textContent = roomName ? `已連接 - 房間：${roomName}` : '已連接';
    } else {
      statusElement.className = 'status disconnected';
      statusTextElement.textContent = '未連接';
    }
  }

  // 更新房間信息
  function updateRoomInfo(roomName) {
    if (roomName) {
      roomInfo.classList.remove('hidden');
      currentRoomElement.textContent = roomName;
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
          updateStatus(status.isConnected, status.currentRoom);
          updateRoomInfo(status.currentRoom);
        }
      });
    });
  }

  // 加入房間
  joinBtn.addEventListener('click', function() {
    const roomName = roomNameInput.value.trim();
    if (!roomName) {
      alert('請輸入房間名稱');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'joinRoom',
        roomName: roomName
      }, function(response) {
        if (response && response.success) {
          updateStatus(true, roomName);
          updateRoomInfo(roomName);
          roomNameInput.value = '';
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

  // 初始化
  checkNetflixPage();
  getCurrentStatus();

  // 定期更新狀態
  setInterval(getCurrentStatus, 2000);
}); 