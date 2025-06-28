const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Imap = require('imap');

// Configure your test email accounts
const TEST_ACCOUNTS = [
  {
    email: 'mahbubahmedrafi59@gmail.com',
    password: 'mboe rsze viug fjmq',
    host: 'imap.gmail.com'
  },
  {
    email: 'rafiislam2025rafi@gmail.com',
    password: 'ncpq faaq ilir qrns',
    host: 'imap.gmail.com'
  },
  {
    email: 'fatimacnsvvd53vge@gmail.com',
    password: 'fnlb bnko diql bkpm',
    host: 'imap.gmail.com'
  }
];

let mainWindow;

function createWindow() {
  // Fix cache access issues
  app.setPath('userData', path.join(app.getPath('documents'), 'InboxCheckerCache'));
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools(); // Keep this enabled for debugging
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Enhanced IMAP email checking function
ipcMain.handle('check-inbox', async (event, senderEmail) => {
  const results = [];
  
  for (const account of TEST_ACCOUNTS) {
    try {
      console.log(`Checking account: ${account.email}`);
      const result = await checkAccount(account, senderEmail);
      console.log(`Result for ${account.email}:`, result);
      results.push(result);
    } catch (error) {
      console.error(`Error checking ${account.email}:`, error);
      results.push({
        account: account.email,
        error: error.message,
        folder: 'Error'
      });
    }
  }
  
  return results;
});

async function checkAccount(account, senderEmail) {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: account.email,
      password: account.password,
      host: account.host,
      port: 993,
      tls: true,
      authTimeout: 30000, // Increased timeout
      connTimeout: 30000, // Increased timeout
      tlsOptions: { 
        rejectUnauthorized: false,
        servername: 'imap.gmail.com' // Added for better SSL handling
      }
    });

    let result = {
      account: account.email,
      folder: 'Not Found',
      error: null,
      found: false
    };

    imap.once('error', (err) => {
      console.error(`IMAP connection error for ${account.email}:`, err);
      result.error = `Connection error: ${err.message}`;
      safeImapEnd(imap);
      resolve(result);
    });

    imap.once('ready', () => {
      console.log(`Connected to ${account.email}`);
      checkFolder('INBOX');
    });

    function checkFolder(folder) {
      imap.openBox(folder, false, (err, box) => {
        if (err) {
          console.error(`Error opening ${folder} for ${account.email}:`, err);
          if (folder === 'INBOX') return checkSpam();
          safeImapEnd(imap);
          return resolve(result);
        }

        // Using proper search criteria with date range to improve results
        const searchDate = new Date();
        searchDate.setDate(searchDate.getDate() - 7); // Check last 7 days
        
        imap.search([
          ['FROM', senderEmail],
          ['SINCE', searchDate.toISOString().split('T')[0]]
        ], (err, results) => {
          if (err) {
            console.error(`Search error in ${folder} for ${account.email}:`, err);
            result.error = `Search error: ${err.message}`;
            safeImapEnd(imap);
            return resolve(result);
          }

          if (results.length === 0) {
            console.log(`No emails found in ${folder} for ${account.email}`);
            if (folder === 'INBOX') return checkSpam();
            safeImapEnd(imap);
            return resolve(result);
          }

          console.log(`Found ${results.length} emails in ${folder} for ${account.email}`);
          
          // Fetch the most recent email with full headers
          const fetch = imap.fetch(results.slice(-1), {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'],
            markSeen: false
          });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              stream.on('end', () => {
                result.folder = folder === '[Gmail]/Spam' ? 'Spam' : 'Inbox';
                result.found = true;
              });
            });
          });

          fetch.once('error', (err) => {
            console.error(`Fetch error for ${account.email}:`, err);
            result.error = `Fetch error: ${err.message}`;
          });

          fetch.once('end', () => {
            safeImapEnd(imap);
            resolve(result);
          });
        });
      });
    }

    function checkSpam() {
      imap.openBox('[Gmail]/Spam', false, (err, box) => {
        if (err) {
          console.error(`Error opening Spam for ${account.email}:`, err);
          result.error = `Spam folder error: ${err.message}`;
          safeImapEnd(imap);
          return resolve(result);
        }
        checkFolder('[Gmail]/Spam');
      });
    }

    imap.once('end', () => {
      console.log(`Connection ended for ${account.email}`);
    });

    imap.connect();
  });
}

// Helper function to safely end IMAP connection
function safeImapEnd(imap) {
  try {
    if (imap && imap.state && imap.state !== 'disconnected') {
      imap.end();
    }
  } catch (err) {
    console.error('Error ending IMAP connection:', err);
  }
}