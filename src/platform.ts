import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import request from 'request';
import util from 'util';
const requestPromise = util.promisify(request);

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ElectricityAccessory } from './platformAccessory';

export class HomebridgeP1Monitor implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
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
    // to start discovery of new accessories.
      this.api.on('didFinishLaunching', () => {
        log.debug('Executed didFinishLaunching callback');
        // run the method to discover / register your devices as accessories
        this.discoverDevices();
      });
    }
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  loadElectricityAccessory(type: string, label: string, name: string, value: number): ElectricityAccessory {
    const uuid = this.api.hap.uuid.generate(`p1monitor_${this.config.ipAddress}_${type}_${label}`);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let assessory;
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      this.api.updatePlatformAccessories([existingAccessory]);
      assessory = new ElectricityAccessory(this, existingAccessory);
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      // this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    } else {
      this.log.info('Adding new accessory:', uuid);
      const accessory = new this.api.platformAccessory(name, uuid);
      accessory.context.device = { 'name': name, 'value': value, 'type': type, 'label': label };
      assessory = new ElectricityAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return assessory;
  }

  async discoverDevices() {
    const status = await this.status();
    const assessories: ElectricityAccessory[] = [];

    const consumption = await this.getConsumption(status);
    assessories.push(this.loadElectricityAccessory('consumption', 'total', 'Consumption Total', consumption.total));
    if(consumption.L1 != undefined) {
      assessories.push(this.loadElectricityAccessory('consumption', 'L1', 'Consumption Phase L1', consumption.L1));
    }
    if(consumption.L2 != undefined) {
      assessories.push(this.loadElectricityAccessory('consumption', 'L2', 'Consumption Phase L2', consumption.L2));
    }
    if(consumption.L3 != undefined) {
      assessories.push(this.loadElectricityAccessory('consumption', 'L3', 'Consumption Phase L3', consumption.L3));
    }

    const delivery = await this.getDelivery(status);
    assessories.push(this.loadElectricityAccessory('delivery', 'total', 'Delivery Total', delivery.total));
    if(delivery.L1 != undefined) {
      assessories.push(this.loadElectricityAccessory('delivery', 'L1', 'Delivery Phase L1', delivery.L1));
    }
    if(delivery.L2 != undefined) {
      assessories.push(this.loadElectricityAccessory('delivery', 'L2', 'Delivery Phase L2', delivery.L2));
    }
    if(delivery.L3 != undefined) {
      assessories.push(this.loadElectricityAccessory('delivery', 'L3', 'Delivery Phase L3', delivery.L3));
    }

    this.fetchConsumptionEvery(2000, assessories);
  }

  async fetchConsumptionEvery(timeout: number, assessories) {
    setInterval(async () => {
      const status = await this.status();
      const consumption = await this.getConsumption(status);
      const delivery = await this.getDelivery(status);

      for(const assessory of assessories) {
        assessory.update(consumption, delivery);
      }
    }, timeout);
  }

  async getConsumption(status: any) {
    if(status == undefined) {
      status = await this.status();
    }
    const consumption = { 'total': 0, 'L1': undefined, 'L2': undefined, 'L3': undefined };
    for(const state of status) {
      const exactMatch = new RegExp(/huidige KW (\w+) (L[0-9]) \(\S+\)/i);
      const found = state[2].match(exactMatch);
      if (found) {
        this.log.debug('found: ', found[2], state[1]);
        if (found[1] == 'verbruik') {
          consumption[found[2]] = state[1] as number * 1000;
          consumption['total'] += state[1] as number * 1000 ;
        }
        this.log.debug(' * consumption: ', consumption);
      }
    }
    return consumption;
  }

  async getDelivery(status: any) {
    if(status == undefined) {
      status = await this.status();
    }
    const delivery = { 'total': 0, 'L1': undefined, 'L2': undefined, 'L3': undefined };
    for(const state of status) {
      const exactMatch = new RegExp(/huidige KW (\w+) (L[0-9]) \(\S+\)/i);
      const found = state[2].match(exactMatch);
      if (found) {
        if (found[1] == 'levering') {
          delivery[found[2]] = state[1] as number;
          delivery['total'] += state[1] as number;
        }
      }
    }
    return delivery;
  }

  async status() {
    const response = await requestPromise({ uri: `http://${this.config.ipAddress}/api/v1/status`, method: 'GET',
      rejectUnauthorized: false, requestCert: false, resolveWithFullResponse: true });
    this.requestAttempts++;

    if (response.statusCode != 200) {
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
    await this.timeout(1000);
    return fn(...args);
  }

  async sleepAfterTooManyFailedAttempts() {
    // wait before trying again
    if(this.requestAttempts > 1) {
      this.log.info('Unable to find p1monitor consider changing the ip-address, sleeping for 1 second..');
      await this.sleep(() => {
        this.log.debug('sleeping...');
      });
    }
  }
}
