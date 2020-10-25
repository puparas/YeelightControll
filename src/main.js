'use strict'
const { app, ipcMain  } = require('electron')
const Window = require('./Window')
const Discovery = require('./Discover')
const YeeDevice = require('./Device')
const DevicesData = require('./DataStore')
const Utility = require('./Utility')
const TrayExtend = require('./Tray')
// const path = require('path');

let dbempty = ''
let tray = ''
let mainWnd = {}
const discovery = new Discovery()
const utility = new Utility()
const deviceStore = new DevicesData('devices')
let main = () => {
  mainWnd = new  Window()
  tray = new TrayExtend('/img/on.png', 'Yeelight control', mainWnd, app)
  // emitersHangWindow(mainWnd)
  mainWnd.webContents.on('did-finish-load', () => {
    //Если в сохраненных нету девайсов, то сразу ищем, иначе сначала подключаемся к ним
    if (Object.keys(deviceStore.devices).length === 0) {
      searchDevices()
      dbempty = true
    } else {
      for (let [id, device] of Object.entries(deviceStore.devices)) {
        dbempty = false
        connectToDevice(device)
      }
    }
  })
  // Запрещаем закрывать или сворачивать что бы прога работала в фоне для циклических режимов
  mainWnd.on('minimize', function (event) {
    event.preventDefault();
    mainWnd.hide();
  });

  mainWnd.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWnd.hide();
    }

    return false;
  });

  require('electron').powerMonitor.on('resume', () => {
    main();
  });
}

//Функция подключения к девайсу
const connectToDevice = (deviceRes) => {

  const device = new YeeDevice(deviceRes)
  emitersHangDevice(device)
  device.connect()
}

//Обрабатываем события девайса
const emitersHangDevice = (device) => {
  app.on('window-all-closed', () => {
    device.disconnect()
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })
  ipcMain.on('sendCommand_' + device.id, (event, arg1, arg2) => {
    let defParams = ["smooth", 500]
    device.sendCommand({id:200, method:arg1, params:[arg2, ...defParams]})
  })
  tray.addDevice(device)
  device.on('DeviceResponse', (device, updResp = false) => {
    deviceStore.addDevice(device)

    frontSend(device)
    if(utility.checkConnected(deviceStore.devices) && !dbempty && !updResp){
      searchDevices()
     }
  })
  device.on('disconnected', (device) => {
    deviceStore.addDevice(device)
    console.log('disconnected');
  })
  //Ошибки сокета или ошибка обработки команд
  device.on('socketError', (err, ) => {
    device.disconnect()

    deviceStore.deleteDevice('socketError', device)
    searchDevices()
  })
  device.on('DeviceResponseError', (err) => {
    console.log('DeviceResponseError', err)
  })
  app.on('window-all-closed', () => {
    // отключаемся при закрытии всех окон приложения. Иначе будут проблемы при попытке снова подключиться в будущем.
    device.disconnect()
    console.log('disconnected')
    tray.destroy()
  })
  require('electron').powerMonitor.on('suspend', () => {
    device.disconnect()
  });
}

//Функция поиска девайсов
const searchDevices = () => {
  discovery.on('didDiscoverDevice', (deviceRes) => {
    //Если найденный девайс уже есть, то пропускаем его. Иначе отправляем на подключение
    if(deviceStore.devices.hasOwnProperty(deviceRes['id'])){
      return
    }else{
      connectToDevice(deviceRes)
    }

  })

  discovery.listen()
}
//functions
const frontSend = (data = {}, event = 'updateDevice') => {
  mainWnd.webContents.send(event, data)
}




//Жизненный цикл приложения
app.on('ready', main);



app.on('activate', () => {


  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWnd.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on('window-all-closed', () => {
  // devicesResStore.addDevice([deviceRes.id, deviceRes])
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

