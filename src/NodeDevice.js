'use strict'
const EventEmitter = require('events')
const diff = require('object-diff')
const Utility = require('./Utility')

const utility = new Utility()

class DeviceNode extends EventEmitter{
    constructor(device) {
        super()
        // this.id = device.id
        this.device = device
        this.deviceSelectorPrefix = 'lightElement_'
    }

    updateChangedParams(newParams){
        let changedParams = diff(this.device, newParams)
        if(!utility.isEmpty(changedParams)){
             this.updateDevice(changedParams)
        }
        this.device = newParams

    }
    callFunction(funcName){
        if(typeof this[funcName] !== "undefined"){
            this[funcName]()
        }
    }
    updateDevice(changedParams = false) {
        if(!changedParams)
            new Error('deviceData empty')
        this.changedParams = changedParams
        for (let [key, value] of Object.entries(changedParams)) {
            this.callFunction(key)
        }

    }
    getFrame(device){
        let chank =
            `<div id="${device.id}" class="lightElement_${device.id} lightElement loading">
                <div class="loader">
                    <div class="l_main">
                      <div class="l_square"><span></span><span></span><span></span></div>
                      <div class="l_square"><span></span><span></span><span></span></div>
                      <div class="l_square"><span></span><span></span><span></span></div>
                      <div class="l_square"><span></span><span></span><span></span></div>
                    </div>
                </div>
                <div class="light_${device.id} light name">
 
                    <div class="set_rgb"> 
                    </div>
                    <div class="set_name">
                    </div>
                    <sup>
                        <div class="toggle">
                        </div>
                    </sup>
                </div>
                <div class="lightStatus_${device.id} lightStatus">
        
                    <div class="set_bright">
                    </div>
                    <div class="set_ct_abx">
                    </div>
                    <div class="modes">
                    </div>
        
                </div>
            </div>`
        this.emit('RendererNode', '', chank)
        this.updateDevice(device)
    }
    onIt(){
        if(this.device.power == 'off'){
            ipcRenderer.send('sendCommand_' + this.device.id, 'toggle', [])
        }
    }
    sendCommand(command, params, powerOn = false){
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id, false, 'loading')
        if(powerOn){
            this.onIt()
        }
        ipcRenderer.send('sendCommand_' + this.device.id, command, params)
    }
    getClass(){
        return '.' + this.deviceSelectorPrefix + this.device.id
    }
    rgb(){
        let colorRGB = this.changedParams.color_mode == 2 ? '255.255.255' : utility.convertDecColorToRGB(this.changedParams.rgb)
        let chunk = document.createRange().createContextualFragment(`<span class="colorPiker set_rgb"
                style="background-color:rgb(${colorRGB});">
                <input class="onchange" data-command="set_rgb" type="color">
            </span>`)
        let command = chunk.querySelector('.onchange').dataset.command
        chunk.querySelector('.onchange').addEventListener('change', (e)=>{
            let thisEl = e.target
            let decColor = parseInt(thisEl.value.substr(1), 16)
            this.sendCommand(command, decColor, true)

        })
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .' + command, chunk)
    }
    name(){
        let chunk = document.createRange().createContextualFragment(`<input type="text" class="onchange set_name" 
            data-command="set_name" value="${this.changedParams.name}"
            placeholder="${this.changedParams.name}">`)
        let command = chunk.querySelector('.onchange').dataset.command
        chunk.querySelector('.onchange').addEventListener('keyup',utility.delay( (e)=>{
            let thisEl = e.target
            this.sendCommand(command, thisEl.value)
            // ipcRenderer.send('sendCommand_' + this.device.id, command, thisEl.value)
        }, 1000))
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .' + command, chunk)
    }
    power(){
        let chunk = document.createRange().createContextualFragment(`<div class="power toggle onclick" data-command="toggle">
                    <img src="./img/${this.changedParams.power}.png" alt="">
                </div>`)
        let command = chunk.querySelector('.onclick').dataset.command
        chunk.querySelector('.onclick').addEventListener('click',  (e)=>{
            this.sendCommand(command, [])
            // ipcRenderer.send('sendCommand_' + this.device.id, command, [])
        })
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .' + command, chunk)
    }
    bright(){
        let chunk = document.createRange().createContextualFragment(`<div class="parametrs parametrsWithRange set_bright">
                <span class="paramName">Яркость</span>
                <input class="onchange" data-command="set_bright" type="range" value="${this.changedParams.bright}" min="1" max="100" step="1" />
                <input disabled class="brightCounter" type="text" value="${this.changedParams.bright}" size="3" />
            </div>`)
        let command = chunk.querySelector('.onchange').dataset.command
        let inputNode = utility.initRangeEl(chunk)
        inputNode.addEventListener("change", (e) => {
            let value = parseInt(inputNode.value)
            this.sendCommand(command, value, true)
            // ipcRenderer.send('sendCommand_' + this.device.id, command, value)
            // console.log(e.target.value)
        })
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .' + command, chunk)
    }
    ct(){
        let chunk = document.createRange().createContextualFragment(`<div class="parametrs parametrsWithRange set_ct_abx">
                <span class="paramName">Цветовая температура</span>
                <input class="onchange" data-command="set_ct_abx" type="range" value="${this.changedParams.ct}" min="1700"
                    max="6500" step="1" />
                <input disabled class="CtCounter" type="text" value="${this.changedParams.ct}" size="4" />
            </div>`)
        let command = chunk.querySelector('.onchange').dataset.command
        let inputNode = utility.initRangeEl(chunk)
        inputNode.addEventListener("change", (e) => {
            let value = parseInt(inputNode.value)
            this.sendCommand(command, value, true)
            // ipcRenderer.send('sendCommand_' + this.device.id, command, value)
            // console.log(e.target.value)
        })
        this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .' + command, chunk)
    }
    // mods(){
    //     let chunk = document.createRange().createContextualFragment(`<div class="modes"></div>`)
    //     if(utility.isEmpty(this.changedParams.mods))
    //         this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .modes', chunk)
    //     this.changedParams.mods.forEach((mod)=>{
    //         let modChunk = document.createRange().createContextualFragment(
    //             `<div class="switchDiv"><p>${mod}</p><label class="switch" for="checkbox_${this.changedParams.id}">
    //         <input type="checkbox"  class="${mod}" id="checkbox_${this.changedParams.id}" />
    //         <div class="slider round"></div>
    //         </label></div>`)
    //         modChunk.querySelector('.' + mod).addEventListener('change', function (){
    //             if (this.checked){
    //                 const ambilight = new Ambilight()
    //                 ambilight.start()
    //                 // ipcRenderer.send('selectSource', deviceId)
    //                 // console.log('mod ' + mod + ' on')
    //             }else{
    //                 // console.log('mod ' + mod + ' off')
    //                 // ipcRenderer.send('ambilightOff', deviceId)
    //
    //             }
    //         })
    //
    //         chunk.querySelector('.modes').appendChild( modChunk)
    //     })
    //     this.emit('RendererNode', '.' + this.deviceSelectorPrefix + this.device.id + ' .modes', chunk)
    //
    // }
}

module.exports = DeviceNode