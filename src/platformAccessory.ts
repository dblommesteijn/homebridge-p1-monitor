import { Service, PlatformAccessory } from 'homebridge';
import { HomebridgeP1Monitor } from './platform';

export class ElectricityAccessory {
  private service: Service;

  constructor(
    private readonly platform: HomebridgeP1Monitor,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'P1 Monitor by ZTATZ')
      .setCharacteristic(this.platform.Characteristic.Model, 'Unknown')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Unknown');

    this.service = this.accessory.getService(this.platform.Service.LightSensor) ||
      this.accessory.addService(this.platform.Service.LightSensor);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    let value = accessory.context.device.value;
    if (value <= 0) {
      value = 0.0001;
    }
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }

  async update(consumption, delivery) {
    this.platform.log.debug('update assessory', this.accessory.context.device.name);
    let value = 0;
    if(this.accessory.context.device.type === 'consumption') {
      value = consumption[this.accessory.context.device.label];
    } else if (this.accessory.context.device.type === 'delivery') {
      value = delivery[this.accessory.context.device.label];
    }
    if(value <= 0) {
      value = 0.0001;
    }
    this.platform.log.debug('value', value);
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }
}
