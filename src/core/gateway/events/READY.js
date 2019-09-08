module.exports = class READY {
  constructor(client, shard) {
    Object.defineProperty(this, 'client', { value: client });

    this.shard = shard;
  }

  run(packet) {
    this.shard.session_id = packet.d.session_id
    this.client.emit('READY', packet.d);
  }
};