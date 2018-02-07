/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const path = require('path');

/**
 * Get env vars
 */
const {
  HAUL_PLATFORM,
  HAUL_FILE_OUTPUT,
  HAUL_OPTIONS,
  HAUL_DIRECTORY,
  HAUL_SOCKET_ADDRESS,
} = process.env;

if (
  !HAUL_PLATFORM ||
  !HAUL_FILE_OUTPUT ||
  !HAUL_OPTIONS ||
  !HAUL_DIRECTORY ||
  !HAUL_SOCKET_ADDRESS
) {
  throw new Error('Unable to create worker due to missing env variables');
}

global.requireWithRootDir = function requireWithRootDir(moduleId) {
  // $FlowFixMe
  return require(path.resolve(HAUL_DIRECTORY, 'worker', moduleId));
};

// $FlowFixMe
global.requireWithRootDir(path.join(HAUL_DIRECTORY, '../../../babelRegister'));
// $FlowFixMe
global.requireWithRootDir(path.join(HAUL_DIRECTORY, './worker/initWorker'))({
  platform: HAUL_PLATFORM,
  fileOutput: HAUL_FILE_OUTPUT,
  options: HAUL_OPTIONS,
  socketAddress: HAUL_SOCKET_ADDRESS,
});
