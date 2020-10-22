'use strict'
const { Tray, Menu  } = require('electron')
const path = require('path');

class TrayExtend extends Tray{
    constructor (file = '/img/on.png', toolTip = 'Yeelight control', mainWnd, app) {
        super(path.join(__dirname, file))
        const defTrayMenu = [
            {
                label: 'Развернуть', click: () => {
                    mainWnd.show()
                }
            },
            {
                label: 'Закрыть', click: () => {
                    app.isQuiting = true
                    app.quit()
                }
            }
        ]
        this.setToolTip(toolTip)
        this.trayMenu = defTrayMenu
        this.showen = false
    }
    addDevice(device) {
        let item = {
            label: device.device.name ,
            click: () => {
                device.sendCommand({ id: 200, method: 'toggle', params: [ [], 'smooth', 500 ] })
            }
        }
        this.trayMenu.push(item)
        this.showTray()
    }
    showTray() {
        if(this.showen){
            this.destroy()
        }
        let contextMenu = Menu.buildFromTemplate(this.trayMenu)
        this.setContextMenu(contextMenu)
    }
}
module.exports = TrayExtend