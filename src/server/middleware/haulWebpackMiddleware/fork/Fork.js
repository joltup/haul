/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

import type { Platform } from '../types';

const createForkProcess = require('./createForkProcess');

const {
  REQUEST_BUILD,
  BUILD_FINISHED,
  LIVE_RELOAD,
  BUILD_FAILED,
} = require('../events.js');

type ForkConstructorArgs = {
  platform: Platform,
  server: any,
  rootDir: string,
  options: *,
};

const forksCache = {};

module.exports = class Fork {
  static getFork(forkConstructorArgs: ForkConstructorArgs) {
    if (!forksCache[forkConstructorArgs.platform]) {
      forksCache[forkConstructorArgs.platform] = new Fork(forkConstructorArgs);
    }

    return forksCache[forkConstructorArgs.platform];
  }

  static killAll() {
    Object.keys(forksCache).forEach(platform => {
      forksCache[platform].kill();
    });
  }

  static setSocket(platform: Platform, socket: WebSocket) {
    const fork = forksCache[platform];

    if (!fork) {
      throw new Error(`Fork for platform ${platform} was not created`);
    }

    fork.initSocket(socket);
  }

  process: any;
  socket: WebSocket;
  listeners: { type: string, callback: Function }[];
  awaitingConnection: boolean;

  constructor({ platform, server, rootDir, options }: ForkConstructorArgs) {
    this.listeners = [];
    this.awaitingConnection = false;
    this.process = createForkProcess(
      platform,
      `index.${platform}.bundle`,
      process.cwd(),
      rootDir,
      server.options.server.address(),
      options
    );
  }

  kill() {
    this.process.kill();
    if (this.socket) {
      this.socket.close();
    }
  }

  initSocket(socket: WebSocket) {
    this.socket = socket;

    this.socket.addEventListener('message', evt => {
      const { type, payload } = JSON.parse(evt.data.toString());

      this.listeners
        .filter(listener => listener.type === type)
        .forEach(listener => listener.callback(payload));
      this.listeners = this.listeners.filter(
        listener => listener.type !== type
      );
    });

    if (this.awaitingConnection) {
      this.awaitingConnection = false;
      this.requestBundle();
    }
  }

  requestBundle() {
    if (!this.socket) {
      this.awaitingConnection = true;
      return;
    }

    this.socket.send(JSON.stringify({ type: REQUEST_BUILD }));
  }

  onError(listener: Function) {
    this.listeners.push({ type: BUILD_FAILED, callback: listener });
  }

  onBuilt(listener: Function) {
    this.listeners.push({ type: BUILD_FINISHED, callback: listener });
  }

  onLiveReload(listener: Function) {
    this.listeners.push({ type: LIVE_RELOAD, callback: listener });
  }
};
