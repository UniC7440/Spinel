const Websocket = require('ws');
let erlpack;

try {
  erlpack = require('erlpack');
} catch(err) {
  erlpack = undefined;
}

module.exports = class Shard {
  constructor(client, shard) {
    Object.defineProperty(this, 'client', { value: client });
    this.shard = Array.isArray(shard) ? shard : [shard, this.client.config.core.shard.count];

    this.ws = new Websocket(`${this.client.gatewayUrl}/?v=${this.client.config.core.gateway.version}&encoding=${this.client.config.core.gateway.encoding}`);

    this.listen_ws();

    // props
    this.seq = null;
    this.session_id = null;
    this.heartbeats_received = 0;
    this.heartbeats_sent = 0;
  }

  listen_ws() {
    this.ws.on('message', (data) => {
      let packet;

      if (this.client.config.core.gateway.encoding === 'etf')
        packet = erlpack.unpack(data);
      else
        packet = JSON.parse(data);

      this.handle_op(packet);
    });
  }

  handle_op(packet) {
    this.seq = packet.s;

    switch(packet.op) {
      case 10: {
        this.start_heartbeating(packet.d.heartbeat_interval);
        break;
      }

      case 11: {
        this.heartbeats_received++;
        this.client.emit('debug', { shard: this.shard[0], msg: `Received heartbeat ack #${this.heartbeats_received}` });

        break;
      }

      case 0: {
        this.handle_events(packet);

        break;
      }

      default: {
        this.client.emit('debug', { shard: this.shard[0], msg: `Found not handled packet: ${packet.op}` });
        break;
      }
    }
  }

  handle_events(packet) {
    try {
      (new (require(`./events/${packet.t}`))(this.client, this)).run(packet);
    } catch(e) {
      switch(e.code) {
        case 'MODULE_NOT_FOUND': {
          break;
        }

        default: {
          console.log(e);
          break;
        }
      }
    };

    return undefined;
  }

  start_heartbeating(interval) {
    this.send({ op: 1, d: this.seq });
    this.heartbeats_sent++;
    this.client.emit('debug', { shard: this.shard[0], msg: `Sent heartbeat #${this.heartbeats_sent}` });
    this.identify();

    setInterval(() => {
      if (this.heartbeats_sent > this.heartbeats_received || this.heartbeats_sent !== this.heartbeats_received) {
        this.client.emit('debug', { shard: this.shard[0], msg: `Missing a heartbeat ack!` });
      }

      this.send({ op: 1, d: this.seq });
      this.heartbeats_sent++;
      this.client.emit('debug', { shard: this.shard[0], msg: `Sent heartbeat #${this.heartbeats_sent}` });
    }, interval);
  }

  identify() {
    this.send({
      op: 2,
      d: {
        token: this.client.token,
        shard: this.shard,
        properties: {
          $os: 'a',
          $browser: 'a',
          $device: 'a'
        }
      }
    })
  }

  send(data) {
    if (this.client.config.core.gateway.encoding === 'etf')
      data = erlpack.pack(data);

    this.ws.send(typeof data === 'object' && !Array.isArray(data) ? JSON.stringify(data) : data);

    return data;
  }
};