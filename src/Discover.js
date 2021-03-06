const EventEmitter = require('events')
const dgram = require('dgram')
const url = require('url')

const supportedHeaders = ['id', 'Location', 'power', 'bright', 'model', 'rgb', 'hue', 'sat', 'ct', 'color_mode', 'support']
const options = {
    multicastAddres:  '239.255.255.250',
    multicastPort: 1982,
    discoveryMsg: 'M-SEARCH * HTTP/1.1\r\n"HOST: 192.168.222:1982\r\n"MAN: \"ssdp:discover\"\r\nST: wifi_bulb\r\n',
}

class YeeDiscovery extends EventEmitter{
    constructor(){
        super()
        this.socket = dgram.createSocket('udp4')
        this.ids = []
    }

    listen(){
        this.socket.on('listening', () =>{
            this.socket.addMembership(options.multicastAddres)
            this.discover()
            this.emit('started')
        })
        this.socket.on('message', (message) => {
            this.didDiscoverDevice(message)
        })
        try{
            this.socket.bind(options.multicastPort, () => {
                this.socket.setBroadcast(true)
            })
        }catch (ex){
            throw ex
        }
    }
    discover(){
        const buffer = Buffer.from(options.discoveryMsg)
        this.socket.send(buffer, 0, buffer.length, options.multicastPort, options.multicastAddres)
    }
    didDiscoverDevice(response) {
        const headers = response.toString().split('\r\n')
        var device = {}
        headers.forEach((header) => {
            supportedHeaders.forEach((supportedHeader) => {
                const checkHeader = supportedHeader + ':'
                if (header.indexOf(checkHeader) >= 0) {
                    device[supportedHeader] = header.slice(checkHeader.length +1)
                }
            })
        })
        if (device.id && device.Location && !this.ids[device.id]) {
            this.ids[device.id] = device.id
            const parsedUrl = url.parse(device.Location)
            device.host = parsedUrl.hostname
            device.port = parsedUrl.port
            device.connected = 'false'
            this.emit('didDiscoverDevice', device)
        }
    }
}

module.exports = YeeDiscovery