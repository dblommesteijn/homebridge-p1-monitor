import { Service, PlatformAccessory } from 'homebridge';
import { MeterAccessory } from './meterAccessory';
import { HomebridgeP1Monitor } from './platform';

export class GasM3WithTimeKeepingAccessory extends MeterAccessory {
  private service: Service;
  private registeredEntries: [Date, number][] = [];
  private timeLastUpdated: Date = new Date();
  private valueLastUpdated = 0;

  constructor(
    private readonly platform: HomebridgeP1Monitor,
    private readonly accessory: PlatformAccessory,
  ) {
    super();
    // TODO: same as GasM3Accessory DRY
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'P1 Monitor by ZTATZ')
      .setCharacteristic(this.platform.Characteristic.Model, 'Gas M3 with Timekeeping')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Unknown');

    this.service = this.accessory.getService(this.platform.Service.LightSensor) ||
      this.accessory.addService(this.platform.Service.LightSensor);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.setValue(0);
  }

  async update(status) {
    const gas = await this.platform.getGas(status);
    const timeNow = new Date();
    const deltaTimeSeconds = (timeNow.getTime() - this.timeLastUpdated.getTime()) / 1000;
    let assessoryValue = 0;
    let value = gas[this.accessory.context.device.label];

    if(!this.valueLastUpdated) {
      this.valueLastUpdated = value;
    }
    if(!this.timeLastUpdated) {
      this.timeLastUpdated = timeNow;
    }

    // reset value to zero when there was no update for 6 minutes
    //  NOTE: average between consumption usage is 200-300 seconds
    if (deltaTimeSeconds > 360) {
      value = 0;
    }

    // only update when values change
    if (this.valueLastUpdated !== value) {
      const deltaValue = value - this.valueLastUpdated;
      assessoryValue = deltaValue / deltaTimeSeconds;
      this.valueLastUpdated = value;
      this.timeLastUpdated = timeNow;
      this.platform.log.debug('gas with timekeeping value changed', deltaValue, deltaTimeSeconds, assessoryValue);
      this.setValue(assessoryValue);
    }
  }

  setValue(value: number) {
    this.platform.log.debug('gas with time setValue', this.accessory.context.device.name, value);
    if(value < 0.0001) {
      value = 0.0001;
    }
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(value);
  }
}
