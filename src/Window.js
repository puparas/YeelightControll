'use strict'

const { BrowserWindow } = require('electron')
const path = require('path');

const defProps = {
    width: 500,
    height: 500,
    show: false,
    icon: path.join(__dirname, '/img/fav.ico'),
    webPreferences: {
        nodeIntegration: true
    }
}

class Window extends BrowserWindow {
    constructor ({ file, ...windowSettings }){
        super({...defProps, ...windowSettings})
        this.loadFile(path.join(__dirname, file));
        this.webContents.openDevTools()

        this.once('ready-to-show', () => {
            this.show();
        })
    }
}
module.exports = Window