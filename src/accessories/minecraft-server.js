const REFRESH_INTERVAL = 60 * 1000;
const API_BASE_URL = 'https://api.mcsrvstat.us';
const API_VERSION = '3';

/**
 * An Accessory providing visibility into the status of a minecraft server.
 */
class MinecraftServer {
    constructor (log, config, api) {
        // System references:
        this.api = api;
        this.log = log;

        // Configuration values, consistent throughout the life of the Accessory:
        this.name = config.name;
        this.host = config.host;
        this.port = config.port;
        this.type = config.type;
        this.updateInterval = Math.max(REFRESH_INTERVAL, config.updateInterval);

        // "Occupancy Sensor" Service:
        this.statusService = new this.api.hap.Service.OccupancySensor(this.name);
        this.statusService.getCharacteristic(this.api.hap.Characteristic.Name)
            .setValue('Minecraft Server Status');

        // Configure the occupancy detection characteristic:
        this.occupancyCharacteristic = this.statusService.getCharacteristic(this.api.hap.Characteristic.OccupancyDetected);

        this.occupancyCharacteristic
            .on(this.api.hap.CharacteristicEventTypes.GET, (callback) => {
                const val = this.occupancyCharacteristic.value;

                this.log.debug(`Yielding server “${this.name}” occupancy: [${this.getOccupancyDescription(val)}]`);

                callback(undefined, val);
            })
            .on(this.api.hap.CharacteristicEventTypes.CHANGE, (change) => {
                const oldDescription = this.getOccupancyDescription(change.oldValue);
                const newDescription = this.getOccupancyDescription(change.newValue);

                this.log.debug(`Occupancy of “${this.name}” changed from ${oldDescription} to ${newDescription} in response to a “${change.reason}” event.`);
            });

        // Fault detection:
        this.faultCharacteristic = this.statusService.getCharacteristic(this.api.hap.Characteristic.StatusFault);

        this.faultCharacteristic
            .on(this.api.hap.CharacteristicEventTypes.GET, (callback) => {
                const val = this.faultCharacteristic.value;

                this.log.debug(`Yielding server “${this.name}” status: [${this.getServerStatusDescription(val)}]`);

                callback(undefined, val);
            })
            .on(this.api.hap.CharacteristicEventTypes.CHANGE, (change) => {
                const oldDescription = this.getServerStatusDescription(change.oldValue);
                const newDescription = this.getServerStatusDescription(change.newValue);

                this.log.debug(`Server “${this.name}” went from ${oldDescription} to ${newDescription} in response to a "${change.reason}" event.`);
            });


        // Information Service + Make/Model Characteristics:
        this.informationService = new this.api.hap.Service.AccessoryInformation();

        this.informationService
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'oof. Studio, LLC')
            .setCharacteristic(this.api.hap.Characteristic.Model, 'OOF-MCSERVER')
            .setCharacteristic(this.api.hap.Characteristic.SoftwareRevision, '1.0.0');

        // Start the status check loop...
        setInterval(() => {
            this.updateServerStatus();
        }, this.updateInterval);

        // ...and perform an initial lookup(s):
        this.updateServerStatus();
    }

    /*
     * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
     * Typically, this only ever happens at the pairing process.
     */
    identify () {
        this.log('Minecraft Server Status!');
    }

    /*
     * This method is called directly after creation of this instance.
     * It should return all services which should be added to the accessory.
     */
    getServices () {
        return [
            this.statusService,
            this.informationService,
        ];
    }

    /**
     * Queries the Minecraft Server Status API and updates characteristic values.
     */
    updateServerStatus () {
        this.log.debug(`Updating status of Minecraft server “${this.name}”...`);

        this.getServerStatus(`${this.host}:${this.port}`)
            .then((data) => {
                if (data.online) {
                    // Server is up, report player count:
                    this.faultCharacteristic.updateValue(this.api.hap.Characteristic.StatusFault.NO_FAULT);
                    this.occupancyCharacteristic.updateValue(data.players.online > 0 ? this.api.hap.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : this.api.hap.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                } else {
                    // Uh oh, it's down... just set the fault code:
                    this.faultCharacteristic.updateValue(this.api.hap.Characteristic.StatusFault.GENERAL_FAULT);
                }
            });
    }

    /**
     * Returns whether a fault characteristic code represents a fault or nominal operation.
     * 
     * Any code other than zero is considered a fault, a la UNIX exit codes.
     * 
     * @see https://developers.homebridge.io/#/characteristic/StatusFault
     */
    getIsFaultCode (code) {
        return code > this.api.hap.Characteristic.StatusFault.NO_FAULT;
    }

    /**
     * Performs an API request for the given server host name.
     */
    getServerStatus (host) {
        // Build the path from an array of dynamic segments:
        const path = [];

        // Add in the prefix for Bedrock servers:
        if (this.type === 'bedrock') {
            path.push('bedrock');
        }

        // The API version comes next:
        path.push(API_VERSION);

        // Then the server/host we want to query for:
        path.push(host);

        this.log.debug(`Making API request to: ${path.join('/')}`);

        // Combine those and issue the request:
        return this.makeApiRequest(path.join('/'));
    }

    /**
     * Generic API request factory.
     */
    makeApiRequest (path) {
        return fetch(`${API_BASE_URL}/${path}`)
            .then(r => r.json())
            .catch(err => this.log.error);
    }

    /**
     * Returns a human-readable label for an occupancy state.
     */
    getOccupancyDescription (code) {
        if (code === this.api.hap.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED) {
            return 'occupied';
        }

        if (code === this.api.hap.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED) {
            return 'not occupied';
        }

        return 'unknown';
    }

    /**
     * Returns a human-readable label for the server's status.
     */
    getServerStatusDescription (code) {
        if (code === this.api.hap.Characteristic.StatusFault.NO_FAULT) {
            return 'up';
        }

        if (code === this.api.hap.Characteristic.StatusFault.GENERAL_FAULT) {
            return 'down';
        }

        return 'unknown'
    }
}

module.exports = MinecraftServer;
