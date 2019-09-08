const YAML = require('yaml');
const config = YAML.parse(require('fs').readFileSync(`${__dirname}/config.yaml`, 'utf-8'));
const Core = require('./src/core/client');

const client = new Core(config);

client.on('debug', (data) => console.log(`Shard #${data.shard} | ${data.msg}`));

client.on('READY', (packet) => {
})