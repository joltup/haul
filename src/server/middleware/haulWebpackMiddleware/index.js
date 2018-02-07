/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */
/* eslint-disable consistent-return */

import type { Platform } from './types';

const createWebSocketServer = require('./createWebSocketServer');
const Fork = require('./fork/Fork');
const getRequestDataFromPath = require('./utils/getRequestDataFromPath');
const runAdbReverse = require('./utils/runAdbReverse');
const logger = require('../../../logger');

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

type Response = {
  writeHead: Function,
  end: Function,
  type: Function,
  status: Function,
};

module.exports = function createHaulWebpackMiddleware(
  options: MiddlewareOptions
) {
  return function haulWebpackMiddleware(
    req: Request,
    res: Response,
    next: Function
  ) {
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
    });

    fork.onError(error => {
      logger.error(`${platform}:\n`, error);
      res.type('text/javascript');
      res.status(500);
      res.end(error);
    });

    fork.onBuilt(bundle => {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(bundle);
    });

    fork.onLiveReload(() => {
      expressContext.liveReload();
    });

    fork.requestBundle();
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
