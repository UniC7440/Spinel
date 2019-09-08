const Shard = require('./gateway/shard');
const { EventEmitter } = require('events');

module.exports = class Client extends EventEmitter {
  constructor(config) {
    super();
    Object.defineProperty(this, 'config', { value: config });
    Object.defineProperty(this, 'gatewayUrl', { value: null, writable: true });
    Object.defineProperty(this, 'token', { value: this.config.core.token });

    this.rest = require('./rest/wrapper');
    this.init()
  }

  async init() {
    this.gatewayUrl = (await this.rest('get', '/gateway/bot', {
      baseUrl: `https://discordapp.com/api/v${this.config.core.api.version}`,
      headers: {
        Authorization: `Bot ${this.config.core.token}`
      }
    })).url;

    this.initiate_shards();
  }

  initiate_shards() {
    if (Array.isArray(this.config.core.shard.shardArray) && this.config.core.shard.shardArray.length > 0) {
      for (let shard of this.config.core.shard.shardArray) {
        setTimeout(() => {
          new Shard(this, shard);
        }, this.config.core.shard.interval * this.config.core.shard.shardArray.indexOf(shard));
      };
    } else {
      // if its not an array or length is less than 1, use the count property

      for (let i = 0; i < this.config.core.shard.count; i++) {
        setTimeout(() => {
          new Shard(this, i);
        }, this.config.core.shard.interval * i);
      }
    };
  }
};