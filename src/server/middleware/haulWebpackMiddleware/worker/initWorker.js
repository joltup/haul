/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const path = require('path');
const WebSocket = require('ws');

module.exports = function initWorker({
  HAUL_PLATFORM,
  HAUL_FILE_OUTPUT,
  HAUL_OPTIONS,
  HAUL_DIRECTORY,
  HAUL_SOCKET_ADDRESS,
}: {
  [key: string]: string,
}) {
  function requireModule(moduleId: string) {
    // $FlowFixMe
    return require(path.resolve(HAUL_DIRECTORY, 'worker', moduleId));
  }

  const EVENTS = requireModule('../events');
  const runWebpackCompiler = require('./runWebpackCompiler');

  const webSocket = new WebSocket(
    `ws+unix://${HAUL_SOCKET_ADDRESS}:/?platform=${HAUL_PLATFORM}`
  );

  webSocket.on('message', data => {
    const { type } = JSON.parse(data.toString());

    switch (type) {
      case EVENTS.REQUEST_BUILD: {
        runWebpackCompiler(
          requireModule,
          {
            HAUL_PLATFORM,
            HAUL_FILE_OUTPUT,
            HAUL_OPTIONS,
          },
          {
            onError(error) {
              webSocket.send(
                JSON.stringify({ type: EVENTS.BUILD_FAILED, payload: error })
              );
            },
            onBuilt(bundle) {
              webSocket.send(
                JSON.stringify({
                  type: EVENTS.BUILD_FINISHED,
                  payload: bundle,
                })
              );
            },
            onLiveReload() {
              webSocket.send(
                JSON.stringify({ type: EVENTS.LIVE_RELOAD, payload: null })
              );
            },
          }
        );
        break;
      }
      default: {
        console.log(`Unknown event ${type}`);
        break;
      }
    }
  });
};
