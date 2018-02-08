/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

import type { Platform } from '../types';

const EventEmitter = require('events');
const createForkProcess = require('./createForkProcess');

const {
  REQUEST_BUILD,
  BUILD_FINISHED,
  LIVE_RELOAD,
  BUILD_FAILED,
  REQUEST_FILE,
  FILE_RECEIVED,
} = require('../events.js');

type ForkConstructorArgs = {
  platform: Platform,
  server: any,
  rootDir: string,
  options: *,
  compilerEventsTransport: EventEmitter,
};

const forksCache = {};

module.exports = class Fork {
  /**
   * Get fork instance from cache or create a new one.
   */
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

  /**
   * Set WebSocket associated with specific fork.
   * This function needs to be called externally, since the connection
   * will be initialized after fork is created, so the socket will be available
   * later.
   */
  static setSocket(platform: Platform, socket: WebSocket) {
    const fork = forksCache[platform];

    if (!fork) {
      throw new Error(`Fork for platform ${platform} was not created`);
    }

    fork.initSocket(socket);
  }

  static requestFile(url: string, callback: Function) {
    Object.keys(forksCache).forEach(platform => {
      forksCache[platform].onFileReceived(callback);
      forksCache[platform].requestFile(url);
    });
  }

  process: any;
  socket: WebSocket;
  listeners: { type: string, callback: Function }[];
  awaitingConnection: boolean;
  compilerEventsTransport: EventEmitter;
  platform: string;

  constructor({
    platform,
    server,
    rootDir,
    options,
    compilerEventsTransport,
  }: ForkConstructorArgs) {
    this.platform = platform;
    this.compilerEventsTransport = compilerEventsTransport;
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

    // $FlowFixMe
    this.socket.addEventListener('message', ({ data }) => {
      const { type, payload } = JSON.parse(data.toString());

      this.compilerEventsTransport.emit(type, {
        platform: this.platform,
        payload,
      });

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

  requestFile(url: string) {
    this.socket.send(JSON.stringify({ type: REQUEST_FILE, url }));
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

  onFileReceived(listener: Function) {
    this.listeners.push({
      type: FILE_RECEIVED,
      callback: listener,
    });
  }
};
