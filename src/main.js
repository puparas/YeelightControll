'use strict'
const { app, ipcMain, Tray, Menu  } = require('electron')
const Window = require('./Window')
const Discovery = require('./Discover')
const YeeDevice = require('./Device')
const DevicesData = require('./DataStore')
const path = require('path');

let mainWindow = {}
let tray = null
let contextMenuItems = [
  {
    label: 'Развернуть', click: () => {
      mainWindow.show();
    }
  },
  {
    label: 'Закрыть', click: () => {
      app.isQuiting = true;
      app.quit();
    }
  }
]
const trayMenuItems = []
// Все найденные лампочки
const devices = {}
const devicesResStore = new DevicesData({name:'devices'})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Вешаем прослушивание событий на объект лампочек
function emitersHang(device){
  // Обновление параметров лампочки. При изменении параметров из любого источника
  device.on('deviceUpdate', (newParams) => {
    if (!(newParams.params)) return
    let id = newParams.params.id
    let device = devicesResStore.getDeviceById(id)
    if (newParams.params){
      let deviceNew = { ...device, ...newParams.params}
      devices[id].device = { ...deviceNew, ...newParams.params}
      devicesResStore.addDevice(id, deviceNew)
      mainWindow.webContents.send('update', deviceNew)
    }
  })

  // Вызывается при успешном подключении
  device.on('connected', (device) => {
    let id = device.device.id
    mainWindow.webContents.send('add', device.device)
    devices[id] = device
    devicesResStore.addDevice(id, device.device)

    contextMenuItems.push({
      label: device.device.name , click: () => {
        sendCommand([ id, 'toggle'])
      }
    })
    trayAdd()
  })

  // Вызывается при отключении от лампочки
  device.on('disconnected', (deviceId) => {
    mainWindow.webContents.send('disconected', deviceId)
  })
}

// Подключаемся к сохраненным или найденным лампочкам
function connectToDevice(deviceRes){
  let device = new YeeDevice(deviceRes)
  emitersHang(device)
  device.connect()
}

// Функция предварительной обработки перед подключением сохраненных лампочек
function connectToSaved() {
  for (let [key, item] of Object.entries(devicesResStore.devices)) {
    connectToDevice(item)
  }
}

// Отправляем команду на измнение параметров
function sendCommand(params, effect = 'smooth', duration = 500) {

  if (Array.isArray(params[2])){
    devices[params[0]].sendCommand({
      id: 200,
      method: params[1],
      params: [...params[2], effect, duration],
    })
  }else{
    devices[params[0]].sendCommand({
      id: 200,
      method: params[1],
      params: [params[2], effect, duration],
    })
  }

}
function trayAdd() {
  if(tray){
    tray.destroy()
  }
  let contextMenu = Menu.buildFromTemplate(contextMenuItems)
  const iconName = '/img/on.png'
  const iconPath = path.join(__dirname, iconName)
  tray = new Tray(iconPath)
  tray.setToolTip('Yeelight control')
  tray.setContextMenu(contextMenu)
}

function main() {
  // Создаем основное окно программы
  mainWindow = new Window({
    file: 'index.html',
    resizable: false,
    autoHideMenuBar: true,
  })
  mainWindow.webContents.on('did-finish-load', () => {

    //  Подключаемся к уже имеющимся лампочкам
    if (devicesResStore.devices) {
      connectToSaved()
    }

    // Поиск лампочек
    let discover = new Discovery()
    discover.on('didDiscoverDevice', (deviceRes) => {
      if (!devices[deviceRes.id]) {
        connectToDevice(deviceRes);
      }connectToDevice
    })
    discover.listen()
  })


  // Запрещаем закрывать или сворачивать что бы прога работала в фоне для циклических режимов
  mainWindow.on('minimize', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });

  // Слушаем эмиты с морды
  ipcMain.on('sendCommand', (event, params) => {
    if (app[params[1]] !== undefined){
      params[2] = app[params[1]](params[2])
    }

    if (params[1] != 'toggle' && devices[params[0]].device.power == 'off'){
      sendCommand([params[0], "set_power", "on"])
    }
    sendCommand(params, params[3], params[4])

  })
  // Отправка команды напрямую из инпута с морды. Параметры должны быть в форма  {"id":200,"method":"set_default","params":[]}
  ipcMain.on('sendTestCommand', (event, params) => {

    devices[params[0]].sendCommand(params[1])
  })

  // При выборе режима ambilight открываем окно с выбором источника
  ipcMain.on('selectSource', (event, id) => {
    let data = {
      'lightElementId': id,
    }
    // Если окно еще не существует то создадим его
    // let selectSource = null
    // if ( selectSource === null) {
      // create a new add todo window
      let selectSource = new Window({
        file: 'selectMonitor.html',
        width: 600,
        height: 600,
        resizable: false,
        autoHideMenuBar: true,
        // Указываем родительское окно
        parent: mainWindow,
        modal: true
      })
      selectSource.on('close', (param) => {
        mainWindow.webContents.send('selectedSource', { 'source': data.source, 'lightElementId': data.lightElementId})
      })
      ipcMain.on('selected', (event, idSource) => {
        devices[id].device['mods']['ambilight'] = 'checked'
        devicesResStore.addDevice(id, devices[id].device)
        data.source = idSource
      })
      // Чистим
      selectSource.on('closed', () => {
        selectSource = null
      })
      // После успешного создания отправляем туда данные по найденным потокам
      selectSource.webContents.on('did-finish-load', () => {
        selectSource.webContents.send('sources')
      })

    // }

  })
  ipcMain.on('ambilightOff', (event, id) =>{
    devices[id].device['mods']['ambilight'] = ''
    devicesResStore.addDevice(id, devices[id].device)
  })

  trayAdd()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', main);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // отключаемся при закрытии всех окон приложения. Иначе будут проблемы при попытке снова подключиться в будущем.
  for (let [key, device] of Object.entries(devices)) {
    device.disconnect()
  }
  tray.destroy()

  // devicesResStore.addDevice([deviceRes.id, deviceRes])
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Вспомогательные функции для обработки параметров запроса

app.set_bright = app.set_ct_abx = (param) => {
  if (!isNaN(parseInt(param))) {
    return parseInt(param)
  }
}

app.set_rgb = (param) => {

  if (Array.isArray(param)){
    param = app.rgbToHex(...param)
  }

  return parseInt(param.substr(1), 16)
}
app.set_hsv = (param) => {
  if (Array.isArray(param)) {
    param = rgb2hsv(...param)
  }
  return [param, 50]
}

app.rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgb2hsv(r, g, b) {
  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
  diffc = c => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = num => Math.round(num * 100) / 100;
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = (1 / 3) + rr - bb;
    } else if (babs === v) {
      h = (2 / 3) + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return Math.round(h * 360);
}