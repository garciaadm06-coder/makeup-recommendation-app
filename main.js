const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow(){ // Function to create the main application window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences:{
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('renderer/index.html'); // Load the main HTML file
}

app.whenReady().then(createWindow);

//DATA FOLDER AUTO CREATE FIX
const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'cart.json');

if(!fs.existsSync(dataDir)){
  fs.mkdirSync(dataDir);
}

if(!fs.existsSync(filePath)){
  fs.writeFileSync(filePath, '[]');
}

//IPC EVENTS
ipcMain.on('save-cart', (event, data) => { // Save new cart item

  let items = [];

  try{
    const fileData = fs.readFileSync(filePath, 'utf-8');
    items = fileData ? JSON.parse(fileData) : [];
  }catch(err){
    items = [];
  }

  items.push(data);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
});

ipcMain.handle('load-cart', async () => { // Load all cart items from file
  try{
    const fileData = fs.readFileSync(filePath, 'utf-8');
    return fileData ? JSON.parse(fileData) : [];
  }catch(err){
    return [];
  }
});

ipcMain.on('update-cart', (event, data) => { // Update entire cart (used for edit and delete)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});