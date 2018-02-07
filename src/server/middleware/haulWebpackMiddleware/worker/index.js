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

// $FlowFixMe
require(path.join(HAUL_DIRECTORY, '../../../babelRegister'));
// $FlowFixMe
require(path.join(HAUL_DIRECTORY, './worker/initWorker'))({
  HAUL_PLATFORM,
  HAUL_FILE_OUTPUT,
  HAUL_OPTIONS,
  HAUL_DIRECTORY,
  HAUL_SOCKET_ADDRESS,
});
