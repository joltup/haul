/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const WebSocket = require('ws');

const {
  REQUEST_BUILD,
  BUILD_FAILED,
  BUILD_FINISHED,
  LIVE_RELOAD,
} = global.requireWithRootDir('../events');
const runWebpackCompiler = global.requireWithRootDir('./runWebpackCompiler');

module.exports = function initWorker({
  platform,
  fileOutput,
  options,
  socketAddress,
}: {
  [key: string]: string,
}) {
  const webSocket = new WebSocket(
    `ws+unix://${socketAddress}:/?platform=${platform}`
  );

  function onError(error: Error) {
    webSocket.send(JSON.stringify({ type: BUILD_FAILED, payload: error }));
  }

  function onBuilt(bundle: string) {
    webSocket.send(
      JSON.stringify({
        type: BUILD_FINISHED,
        payload: bundle,
      })
    );
  }

  function onLiveReload() {
    webSocket.send(JSON.stringify({ type: LIVE_RELOAD, payload: null }));
  }

  webSocket.on('message', data => {
    const { type } = JSON.parse(data.toString());

    if (type === REQUEST_BUILD) {
      runWebpackCompiler(
        {
          platform,
          fileOutput,
          options,
        },
        {
          onError,
          onBuilt,
          onLiveReload,
        }
      );
    } else {
      console.log(`Unknown event ${type}`);
    }
  });
};
