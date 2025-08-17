# Netflix Sync

A front-end system for synchronizing Netflix playback status across multiple users, supporting both browser console script and Chrome extension implementations. The backend contains in [netflix-sync-be](https://github.com/AmyHuang82/netflix-sync-be).

## Features

- 🎬 **Playback Sync**: Synchronize play/pause states
- ⏰ **Time Sync**: Sync video timestamp across viewers
- 🔄 **Auto Reconnect**: Automatically reconnects when network disconnects
- 🎯 **Chrome Extension**: User-friendly browser extension
- 📱 **Multiple Options**: Supports both console script and extension
- 👥 **Room Management**: View and manage sync rooms

## 📁 Project Structure

```
netflix-sync/
├── chrome-extension/      # Chrome extension files
│   ├── manifest.json     # Extension configuration
│   ├── popup.html       # Extension popup
│   ├── content.js      # Core logic
│   ├── background.js   # Background script
│   ├── netflix-api.js   # Insert script to Netflix page
│   └── icons/         # Extension icons
├── pages/              # Vercel backend API
│   └── index.js       # Management page
├── netflix-sync-client.js  # Console script version
└── README.md          # This file
```

## 🚀 Quick Start

### Method 1: Chrome Extension (Recommended)

  - Load the extension in Chrome
  - Open Netflix and play a video
  - Click the extension icon
  - Enter room id and join

For detailed instructions, see: [Chrome Extension Docs](chrome-extension/README.md)

### Method 2: Browser Console Script

  - Open Netflix and start playing a video
  - Press `F12` to open developer tools
  - Copy content from `netflix-sync-client.js`
  - Paste into Console and execute

## 📖 Usage Guide

### Room Management

https://netflix-sync-qsv2.vercel.app/

### Console Script

```javascript
// Create sync room
netflixSyncAPI.createRoom({
  roomId: 'my-room-id',
  roomName: 'Room Name'
})

// Join sync room
netflixSyncAPI.joinRoom('my-room-id');

// Manually sync playback state
netflixSyncAPI.play();
netflixSyncAPI.pause();
```

## 🔒 Security Notes

- This project is for personal learning and entertainment purposes only
- Please comply with Netflix's terms of service
- Not for commercial use
- Recommended for private use only
