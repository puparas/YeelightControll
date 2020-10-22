'use strict'

const Store = require('electron-store')

class DataStore extends Store {
  constructor (settings) {
    super(settings)

    // initialize with devices or empty array
    this.devices = this.get('devices') || {}
  }

  saveDevices () {
    // save devices to JSON file
    this.set('devices', this.devices)

    // returning 'this' allows method chaining
    return this
  }

  getDevices () {
    // set object's devices to devices in JSON file
    this.devices = this.get('devices') || {}
    return this
  }

  getDeviceById(id) {
    return this.devices[id]
  }

  addDevice (device) {
    let id = device.id
    this.devices[id] = device
    return this.saveDevices()
  }

  deleteDevice (Device) {
    // filter out the target Device
    this.devices = Object.keys(this.devices).filter(t => {if(t !== Device.id){return this.devices.t}})
    console.log(this.devices)
    return this.saveDevices()
  }
}

module.exports = DataStore
