const MinecraftServer = require('./src/accessories/minecraft-server');

module.exports = function (api) {
    api.registerAccessory('homebridge-minecraft-server', 'MinecraftServer', MinecraftServer);
}
