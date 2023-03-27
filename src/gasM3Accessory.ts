import { Service, PlatformAccessory } from 'homebridge';
import { MeterAccessory } from './meterAccessory';
import { HomebridgeP1Monitor } from './platform';

export class GasM3Accessory extends MeterAccessory{
  private service: Service;

  constructor(
    private readonly platform: HomebridgeP1Monitor,
    private readonly accessory: PlatformAccessory,
  ) {
    super();
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'P1 Monitor by ZTATZ')
      .setCharacteristic(this.platform.Characteristic.Model, 'Gas M3')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Unknown');

    this.service = this.accessory.getService(this.platform.Service.LightSensor) ||
      this.accessory.addService(this.platform.Service.LightSensor);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    let value = accessory.context.device.value;
    if(value < 0.0001) {
      value = 0.0001;
    }
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }

  async update(status) {
    const gas = await this.platform.getGas(status);
    this.platform.log.debug('update assessory gas', this.accessory.context.device.name);
    let value = gas[this.accessory.context.device.label];
    if(value < 0.0001) {
      value = 0.0001;
    }
    this.platform.log.debug('value', value);
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }
}
