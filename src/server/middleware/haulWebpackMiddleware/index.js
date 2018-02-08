/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */
/* eslint-disable consistent-return */

import type { $Response } from 'express';
import type { Platform } from './types';

const EventEmitter = require('events');
const createWebSocketServer = require('./createWebSocketServer');
const Fork = require('./fork/Fork');
const getRequestDataFromPath = require('./utils/getRequestDataFromPath');
const runAdbReverse = require('./utils/runAdbReverse');
const logger = require('../../../logger');
const events = require('./events');

type ConfigOptionsType = {
  root: string,
  dev: boolean,
  minify: boolean,
  port: number,
  platform: Platform,
};

type MiddlewareOptions = {
  configPath: string,
  configOptions: ConfigOptionsType,
  expressContext: { liveReload: () => void },
};

type Request = {
  path: string,
};

const compilerEventsTransport = new EventEmitter();
// $FlowFixMe
compilerEventsTransport.events = events;

module.exports = function createHaulWebpackMiddleware(
  options: MiddlewareOptions
) {
  function haulWebpackMiddleware(req: Request, res: $Response, next: Function) {
    if (req.path.includes('hot-update')) {
      Fork.requestFile(req.path, file => {
        res.send(file);
      });
    } else {
      const { expressContext, ...forkOptions } = options;
      const { filename, platform } = getRequestDataFromPath(req.path);

      if (!platform || !filename) {
        return next();
      }

      if (platform === 'android') {
        const { port } = options && options.configOptions;
        runAdbReverse(port);
      }

      const server = createWebSocketServer();
      server.on('connection', socket => {
        const platformMatch = socket.upgradeReq.url.match(
          /platform=(ios|android)/
        );

        if (!platformMatch) {
          throw new Error('Incorrect platform');
        }

        Fork.setSocket(platformMatch[1], socket);
      });

      const fork = Fork.getFork({
        platform,
        server,
        rootDir: __dirname,
        options: forkOptions,
        compilerEventsTransport,
      });

      fork.onError(error => {
        logger.error(`${platform}:\n`, error);
        res.type('text/javascript');
        res.status(500);
        res.end(error);
      });

      fork.onBuilt(({ bundle }) => {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(bundle);
      });

      fork.onLiveReload(() => {
        expressContext.liveReload();
      });

      fork.requestBundle();
    }
  }

  return {
    middleware: haulWebpackMiddleware,
    compiler: compilerEventsTransport,
  };
};

function killAndExit(error?: Error) {
  logger.info('Shutting down Haul.');

  error && logger.error(error.message);

  Fork.killAll();
  process.exit(error ? 1 : 0);
}

process.on('uncaughtException', err => {
  killAndExit(err);
});

process.on('SIGINT', () => {
  killAndExit();
});

process.on('SIGTERM', () => {
  killAndExit();
});
