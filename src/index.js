'use strict'
const { ipcRenderer, desktopCapturer } = require('electron')
const NodeDevice = require('./NodeDevice')


ipcRenderer.on('updateDevice', (event, deviceRes) => {
    let deviceObjName = 'device_' + deviceRes.id
    //Если объекта лампочки еще нет, то создаем и навешиваем обработчики
    if(typeof window[deviceObjName] == "undefined"){
        window[deviceObjName] = new NodeDevice(deviceRes)
        emitersHangDevice(deviceObjName)
        window[deviceObjName].getFrame(deviceRes)
    }else{
        window[deviceObjName].updateChangedParams(deviceRes)
    }

})

const emitersHangDevice = (deviceObjName) =>{
    if(!window[deviceObjName])
        return
    window[deviceObjName].on('RendererNode', (arg1, arg2, arg3)=>{
        if(arg1 && arg2){
            if(document.querySelector(window[deviceObjName].getClass()).classList.contains("loading")){
                document.querySelector(window[deviceObjName].getClass()).classList.remove('loading')
            }

            document.querySelector(arg1).replaceWith(arg2)
        }else if (arg1 && arg3){
            document.querySelector(arg1).classList.add('loading')
        }else{
            document.querySelector('.elementsTable').insertAdjacentHTML('beforeend', arg2)
        }
    })

}