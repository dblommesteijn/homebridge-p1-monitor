import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import request from 'request';
import util from 'util';
const requestPromise = util.promisify(request);

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { MeterAccessory } from './meterAccessory';
import { GasM3Accessory } from './gasM3Accessory';
import { ElectricityWattAccessory } from './electricityWattAccessory';
import { GasM3WithTimeKeepingAccessory } from './gasM3WithTimeKeepingAccessory';

export class HomebridgeP1Monitor implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  private requestAttempts = 0;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    if(!this.config.ipAddress) {
      log.error('Incorrect ip-addres, terminating..');
    } else {
      this.api.on('didFinishLaunching', () => {
        log.debug('discover devices');
        this.discoverDevices();
      });
    }
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  loadElectricityWattAccessory(type: string, label: string, name: string, value: number): MeterAccessory {
    const uuid = this.api.hap.uuid.generate(`p1monitor_${this.config.ipAddress}_${type}_${label}_${name}`);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let ret;
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      this.api.updatePlatformAccessories([existingAccessory]);
      ret = new ElectricityWattAccessory(this, existingAccessory);
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      // this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    } else {
      this.log.info('Adding new accessory:', uuid);
      const accessory = new this.api.platformAccessory(name, uuid);
      accessory.context.device = { 'name': name, 'value': value, 'type': type, 'label': label };
      ret = new ElectricityWattAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return ret;
  }

  // TODO: almost the same as Electricity Accessory, extract class and done!
  loadGasM3Accessory(type: string, label: string, name: string, value: number): GasM3Accessory {
    const uuid = this.api.hap.uuid.generate(`p1monitor_${this.config.ipAddress}_${type}_${label}_${name}`);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let ret;
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      this.api.updatePlatformAccessories([existingAccessory]);
      ret = new GasM3Accessory(this, existingAccessory);
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      // this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    } else {
      this.log.info('Adding new accessory:', uuid);
      const accessory = new this.api.platformAccessory(name, uuid);
      accessory.context.device = { 'name': name, 'value': value, 'type': type, 'label': label };
      ret = new GasM3Accessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return ret;
  }

  // TODO: almost the same as Gas Accessory, extract class and done!
  loadGasM3WithTimeKeepingAccessory(type: string, label: string, name: string, value: number): GasM3WithTimeKeepingAccessory {
    const uuid = this.api.hap.uuid.generate(`p1monitor_${this.config.ipAddress}_${type}_${label}_${name}`);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let ret;
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      this.api.updatePlatformAccessories([existingAccessory]);
      ret = new GasM3WithTimeKeepingAccessory(this, existingAccessory);
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      // this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    } else {
      this.log.info('Adding new accessory:', uuid);
      const accessory = new this.api.platformAccessory(name, uuid);
      accessory.context.device = { 'name': name, 'value': value, 'type': type, 'label': label };
      ret = new GasM3WithTimeKeepingAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return ret;
  }

  async discoverDevices() {
    const status = await this.status();
    const accessories: MeterAccessory[] = [];
    const consumption = await this.getElectricConsumption(status);

    // Electricity
    accessories.push(this.loadElectricityWattAccessory('consumption', 'total', 'Usage Total Watt', consumption.total));
    accessories.push(this.loadElectricityWattAccessory('consumption', 'day_total', 'Usage Day Total Wh', consumption.day_total));
    if(this.config.showPhases) {
      if(consumption.L1 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('consumption', 'L1', 'Usage L1 Watt', consumption.L1));
      }
      if(consumption.L2 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('consumption', 'L2', 'Usage L2 Watt', consumption.L2));
      }
      if(consumption.L3 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('consumption', 'L3', 'Usage L3 Watt', consumption.L3));
      }
    }

    // Electricity delivered back
    const delivery = await this.getElectricDelivery(status);
    accessories.push(this.loadElectricityWattAccessory('delivery', 'total', 'Return Total Watt', delivery.total));
    accessories.push(this.loadElectricityWattAccessory('delivery', 'day_total', 'Return Day Total Wh', delivery.day_total));
    if(this.config.showPhases) {
      if(delivery.L1 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('delivery', 'L1', 'Return L1 Watt', delivery.L1));
      }
      if(delivery.L2 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('delivery', 'L2', 'Return L2 Watt', delivery.L2));
      }
      if(delivery.L3 !== undefined) {
        accessories.push(this.loadElectricityWattAccessory('delivery', 'L3', 'Return L3 Watt', delivery.L3));
      }
    }

    // Gas
    if(this.config.showGas) {
      const gas = await this.getGas(status);
      accessories.push(this.loadGasM3Accessory('consumption', 'day_total', 'Gas Day Total M3', gas.day_total));
      accessories.push(this.loadGasM3WithTimeKeepingAccessory('consumption', 'total', 'Gas Total M3', gas.total));
    }

    // update all accessories
    this.fetchStatusEvery(5000, accessories);
  }

  async fetchStatusEvery(timeout: number, accessories) {
    setInterval(async () => {
      const status = await this.status();
      for(const accessory of accessories) {
        accessory.update(status);
      }
    }, timeout);
  }

  async getElectricConsumption(status) {
    if(status === undefined) {
      status = await this.status();
    }
    const consumption = { 'day_total': 0, 'total': 0, 'L1': undefined, 'L2': undefined, 'L3': undefined };
    for(const state of status) {
      const exactMatchCurrent = new RegExp(/huidige KW (\w+) (L[0-9]) \(\S+\)/i);
      const foundCurrent = state[2].match(exactMatchCurrent);
      if (foundCurrent) {
        if (foundCurrent[1] === 'verbruik') {
          consumption[foundCurrent[2]] = state[1] as number * 1000;
          consumption['total'] += state[1] as number * 1000 ;
        }
      }
      const exactMatchTotal = new RegExp(/huidige dag KWh (\w+)/i);
      const foundTotal = state[2].match(exactMatchTotal);
      if (foundTotal) {
        if (foundTotal[1] === 'verbruik') {
          consumption['day_total'] += state[1] as number * 1000 ;
        }
      }
    }
    return consumption;
  }

  async getElectricDelivery(status) {
    if(status === undefined) {
      status = await this.status();
    }
    const delivery = { 'day_total': 0, 'total': 0, 'L1': undefined, 'L2': undefined, 'L3': undefined };
    for(const state of status) {
      const exactMatch = new RegExp(/huidige KW (\w+) (L[0-9]) \(\S+\)/i);
      const foundCurrent = state[2].match(exactMatch);
      if (foundCurrent) {
        if (foundCurrent[1] === 'levering') {
          delivery[foundCurrent[2]] = state[1] as number * 1000;
          delivery['total'] += state[1] as number * 1000;
        }
      }
      const exactMatchTotal = new RegExp(/huidige dag KWh (\w+)/i);
      const foundTotal = state[2].match(exactMatchTotal);
      if(foundTotal){
        if (foundTotal[1] === 'geleverd') {
          delivery['day_total'] += state[1] as number * 1000 ;
        }
      }
    }
    return delivery;
  }

  async getGas(status) {
    const ret = { 'day_total': 0, 'total': 0 };
    if(status === undefined) {
      status = await this.status();
    }
    for(const state of status) {
      const exactMatchDay = new RegExp(/M3 GAS huidige dag verbruikt:/i);
      const foundDayTotal = state[2].match(exactMatchDay);
      if(foundDayTotal) {
        ret['day_total'] = state[1] as number;
      }
      const matchTotalConsumption = new RegExp(/M3 GAS verbruikt:/i);
      const foundTotal = state[2].match(matchTotalConsumption);
      if (foundTotal) {
        ret['total'] = state[1] as number;
      }
    }
    return ret;
  }

  async status() {
    const response = await requestPromise({ uri: `http://${this.config.ipAddress}/api/v1/status`, method: 'GET',
      rejectUnauthorized: false, requestCert: false, resolveWithFullResponse: true });
    this.requestAttempts++;

    if (response.statusCode !== 200) {
      this.log.error('P1 Monitor unexpected response: ', response.statusCode);
      await this.sleepAfterTooManyFailedAttempts();
      return await this.status();
    }

    const json = JSON.parse(response.body);
    return json;
  }

  timeout(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms));
  }

  async sleep(fn, ...args) {
    await this.timeout(5000);
    return fn(...args);
  }

  async sleepAfterTooManyFailedAttempts() {
    // wait before trying again
    if(this.requestAttempts > 1) {
      this.log.info('Unable to find p1monitor consider changing the ip-address, sleeping for 5 seconds..');
      await this.sleep(() => {
        // this.log.debug('sleeping...');
      });
    }
  }
}
