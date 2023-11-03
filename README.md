# Homebridge Minecraft Plugin

This plugin creates an [`OccupancySensor`](https://developers.homebridge.io/#/service/OccupancySensor) accessory that derives its value from the result of the [Minecraft Server Status API](https://api.mcsrvstat.us/).

Failures in the API connection also set a "fault" state on the accessory.

## Services

### Status

Based on the [`OccupancySensor`](https://developers.homebridge.io/#/service/OccupancySensor) service definition, and includes two Characteristics:

- [`OccupancyDetected`](https://developers.homebridge.io/#/characteristic/OccupancyDetected): Set to `OCCUPANCY_DETECTED` (`1`) when there is at least one player is online, or `OCCUPANCY_NOT_DETECTED` (`0`) when there are none.
- [`StatusFault`](https://developers.homebridge.io/#/characteristic/StatusFault): Set to `GENERAL_FAULT` (`0`) when an API request fails or the server is offline, or `NO_FAULT` (`1`) when operating normally.

### Information

Declares some static information that will appear in the Home app when inspecting the accessory.

## Configuration

The plugin is set up to be configured via the Homebridge GUI, but you can also add an object to the `accessories` array of your config file:

```json
{
    "accessories": [
        {
            "name": "Minecraft Server",
            "host": "1.2.3.4",
            "port": 25565,
            "type": "java",
            "updateInterval": 60000,
            "accessory": "MinecraftServer"
        }
    ]
}
```

The `accessory` property _must_ be `MinecraftServer`, but the other values are up to you. Provide `updateInterval` in milliseconds; only values greater than one minute will be honored, so that the Minecraft Server Status API is not overwhelmed.
