const EventEmitter = require('events')
const net = require('net')

class YeeDevice extends EventEmitter {
    constructor(device) {
        super()
        device.mods = ['ambilight']
        this.device = device
        this.id = device.id
        this.debug = this.device.debug || false
        this.connected = false
        this.forceDisconnect = false
        this.timer = null
        this.tracked_attrs = this.device.tracked_attrs || ['power', 'bright', 'color_mode', 'rgb', 'flowing', 'flow_params', 'hue', 'sat', 'ct', 'delayoff', 'music_on', 'name' ]
        this.polligInterval = this.device.interval || 2000
        this.retry_timer = null

    }

    connect() {
        try {
            this.forceDisconnect = false
            this.socket = new net.Socket()
            this.bindSocket()
            this.socket.connect({ host: this.device.host, port: this.device.port }, () => {
                this.didConnect()
                this.getNewParams()
            })

        } catch (err) {
            this.socketClosed(err)
        }
    }

    disconnect(forceDisconnect = true) {
        this.forceDisconnect = forceDisconnect
        this.connected = false
        clearInterval(this.timer)
        this.socket.destroy()
        this.socket = null
        this['device']['connected'] = false
        this.emit('disconnected', this['device'])
        if (this.forceDisconnect && this.retry_timer) clearTimeout(this.retry_timer)
    }

    bindSocket() {
        this.socket.on('data', (data) => {
            this.didReceiveResponse(data)
        })

        this.socket.on('error', (err) => {
            this.emit('socketError', err)
            this.socketClosed(err)
        })

        this.socket.on('end', () => {
            this.emit('socketEnd')
            this.socketClosed()
        })
    }
    setName (name) {
        this.sendCommand({
            id: 404,
            method: 'set_name',
            params: [name],
        })
    }
    socketClosed(err) {
        if (this.forceDisconnect) return

        if (err && this.debug) {
            console.log('Socket Closed :', err)
            console.log('Reconnecting in 5 secs')
        }
        this.disconnect(false)
        if (this.retry_timer) {
            clearTimeout(this.retry_timer)
            this.retry_timer = null
        }
        this.retry_timer = setTimeout(this.connect.bind(this), 3000)
    }

    didConnect() {
        this.connected = true
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }

    }

    getNewParams() {
        this.sendCommand({
            id: 199,
            method: 'get_prop',
            params: this.tracked_attrs,
        })
    }

    didReceiveResponse(data) {
        const dataArray = data.toString('utf8').split('\r\n')
        dataArray.forEach((dataString) => {
            if (dataString.length < 1) return
            try {
                const response = JSON.parse(dataString)
                if (response.id == 199){
                    for (let [key, paramVal] of Object.entries(response.result)) {
                        this.device[this.tracked_attrs[key]] = paramVal
                    }
                    this.device.connected = true
                    this.emit('DeviceResponse', this.device)
                }else if(response.method == 'props'){
                    this.device = {...this.device, ...response.params}
                    this.emit('DeviceResponse', this.device, true)
                }else if(response.id == 200){

                }else{
                    this.emit('DeviceResponseError', response)
                }
            } catch (err) {
                console.log(err, dataString)
            }
        })
    }

    sendCommand(data) {
        const cmd = JSON.stringify(data)
        if (this.connected && this.socket) {
            try {
                this.socket.write(cmd + '\r\n')
            } catch (err) {
                this.socketClosed(err)
            }
        }
    }


}

module.exports = YeeDevice