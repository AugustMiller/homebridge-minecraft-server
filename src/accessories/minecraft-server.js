const REFRESH_INTERVAL = 60 * 1000;
const API_BASE_URL = 'https://api.mcsrvstat.us/2';

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

                this.log(`Yielding server occupancy: [${this.getOccupancyDescription(val)}]`);

                callback(undefined, val);
            })
            .on(this.api.hap.CharacteristicEventTypes.CHANGE, (change) => {
                const oldDescription = this.getOccupancyDescription(change.oldValue);
                const newDescription = this.getOccupancyDescription(change.newValue);

                this.log(`Occupancy changed from ${oldDescription} to ${newDescription} in response to a “${change.reason}” event.`);
            });

        // Fault detection:
        this.faultCharacteristic = this.statusService.getCharacteristic(this.api.hap.Characteristic.StatusFault);

        this.faultCharacteristic
            .on(this.api.hap.CharacteristicEventTypes.GET, (callback) => {
                const val = this.faultCharacteristic.value;

                this.log(`Yielding server status: [${this.getServerStatusDescription(val)}]`);

                callback(undefined, val);
            })
            .on(this.api.hap.CharacteristicEventTypes.CHANGE, (change) => {
                const oldDescription = this.getServerStatusDescription(change.oldValue);
                const newDescription = this.getServerStatusDescription(change.newValue);

                this.log(`Server whent from ${oldDescription} to ${newDescription} in response to a "${change.reason}" event.`);
            });


        // Information Service + Make/Model Characteristics:
        this.informationService = new this.api.hap.Service.AccessoryInformation();

        this.informationService
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Carpet City')
            .setCharacteristic(this.api.hap.Characteristic.Model, 'CC-MCSERVER')
            .setCharacteristic(this.api.hap.Characteristic.SoftwareRevision, '0.0.1');

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
     * 
     * @see https://api.mcsrvstat.us/
     */
    updateServerStatus () {
        this.log(`Updating Minecraft server status...`);

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
     * Performs an API request for the given host name.
     */
    getServerStatus (host) {
        return this.makeApiRequest(host);
    }

    /**
     * Generic API request factory.
     */
    makeApiRequest (path) {
        return fetch(`${API_BASE_URL}/${path}`)
            .then(r => r.json());
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
