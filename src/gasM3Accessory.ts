import { Service, PlatformAccessory } from 'homebridge';
import { MeterAccessory } from './meterAccessory';
import { HomebridgeP1Monitor } from './platform';

export class GasM3Accessory extends MeterAccessory {
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

    this.setValue(accessory.context.device.value);
  }

  async update(status) {
    const gas = await this.platform.getGas(status);
    let value = gas[this.accessory.context.device.label];
    if(value < 0.0001) {
      value = 0.0001;
    }
    this.setValue(value);
  }

  setValue(value: number) {
    this.platform.log.debug('gas setValue', this.accessory.context.device.name, value);
    if(value < 0.0001) {
      value = 0.0001;
    }
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }
}
