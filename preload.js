const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script loaded"); // Debug log

contextBridge.exposeInMainWorld('electronAPI', {
    checkInbox: (senderEmail) => {
        console.log("Invoking check-inbox IPC call"); // Debug log
        return ipcRenderer.invoke('check-inbox', senderEmail);
    }
});