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

    return this.get('devices')[id]
  }

  addDevice (id, Device) {
    // merge the existing devices with the new Device
    this.devices[id] = Device
    return this.saveDevices()
  }

  deleteDevice (Device) {
    // filter out the target Device
    this.devices = this.devices.filter(t => t !== Device)

    return this.saveDevices()
  }
}

module.exports = DataStore
