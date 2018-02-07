/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

import type { Platform } from '../types';

const spawn = require('child_process').spawn;
const path = require('path');

type ConfigOptions = {
  root: string,
  dev: boolean,
  minify: boolean,
  port: number,
  platform: Platform,
};

type Options = {
  configPath: string,
  configOptions: ConfigOptions,
};

module.exports = function createForkProcess(
  platform: Platform,
  fileOutput: string,
  cwd: string,
  rootDir: string,
  address: string,
  options: Options
) {
  const workerPath = path.resolve(rootDir, 'worker/index.js');
  const child = spawn(
    process.execPath,
    // ['--inspect=127.0.0.1:9225', webpackWorkerPath], // debugging
    [workerPath],
    {
      cwd,
      env: {
        HAUL_PLATFORM: platform,
        HAUL_FILE_OUTPUT: fileOutput,
        HAUL_DIRECTORY: rootDir,
        HAUL_OPTIONS: JSON.stringify(options),
        HAUL_SOCKET_ADDRESS: address,
      },
      stdio: [0, 1, 2, 'ipc', 'pipe'], // @TODO: remove unnecessary comms
    }
  );

  child.on('error', error => {
    throw error;
  });

  return child;
};
