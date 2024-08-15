/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IPCMainActions, IPCRendererActions } from '../types'
import { app, shell, BrowserWindow, ipcMain, Tray, Menu, desktopCapturer } from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png'
import fs from 'fs'

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    movable: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    fullscreenable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    ipcListeners(mainWindow)
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

const capturingScreenshot = async () => {
  desktopCapturer
    .getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    .then(async (sources) => {
      try {
        const image = await sources[0].thumbnail.resize({ width: 1920, height: 1080 }).toPNG()
        const filePath =
          `C:/Users/samuk/Documents/electron-ganesha/screenshots/` +
          new Date().getUTCMilliseconds() +
          'snapshot2.png'
        fs.writeFile(filePath, image, (err) => {
          if (err) {
            console.log('Failed to save screenshot:', err)
          } else {
            console.log('Screenshot saved successfully:', filePath)
          }
        })
      } catch (e) {
        console.log('Failed to capture screen:', e)
      }
    })
}

const appState: { intervalListener: null | NodeJS.Timeout; screenshotInterval: number } = {
  intervalListener: null,
  screenshotInterval: 3000
}

const triggerCountDown = (win: BrowserWindow): NodeJS.Timeout => {
  let count = appState.screenshotInterval
  return setInterval(() => {
    count = count - 1000
    if (count == 0) {
      count = appState.screenshotInterval
    }
    win.webContents.send(IPCMainActions.SET_COUNTDOWN, count / 1000)
  }, 1000)
}

const ipcListeners = (win: BrowserWindow) => {
  let countdownListener
  ipcMain.on(IPCRendererActions.START_SCREENSHOTS, () => {
    appState.intervalListener = setInterval(
      () => capturingScreenshot(),
      appState.screenshotInterval
    )
    win.webContents.send(IPCMainActions.TOGGLE_RECORDING_STATE, true)
    countdownListener = triggerCountDown(win)
  })

  ipcMain.on(IPCRendererActions.END_SCREENSHOTS, () => {
    if (appState.intervalListener) {
      clearInterval(appState.intervalListener)
    }
    appState.intervalListener = null
    win.webContents.send(IPCMainActions.TOGGLE_RECORDING_STATE, false)
    if (countdownListener) {
      clearInterval(countdownListener)
    }
  })

  ipcMain.on(IPCRendererActions.CHANGE_SCREENSHOT_INTERVAL, (_, args) => {
    appState.screenshotInterval = args
    ipcMain.emit(IPCRendererActions.END_SCREENSHOTS)
    ipcMain.emit(IPCRendererActions.START_SCREENSHOTS)
  })
}

const generateSystemTrayAndTriggeringScreenshots = () => {
  const tray = new Tray('C:/Users/samuk/Downloads/ganesha.png')
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pausar monitoramento',
      click: () => {
        ipcMain.emit(IPCRendererActions.END_SCREENSHOTS)
      }
    },
    {
      label: 'Iniciar monitoramento',
      enabled: !appState.intervalListener,
      click: () => {
        ipcMain.emit(IPCRendererActions.START_SCREENSHOTS)
      }
    },
    {
      label: 'Sair',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Monitorando tela')
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  generateSystemTrayAndTriggeringScreenshots()
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
