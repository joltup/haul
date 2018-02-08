/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const path = require('path');
const WebSocket = require('ws');
const MemoryFileSystem = require('memory-fs');

const {
  REQUEST_BUILD,
  REQUEST_FILE,
  FILE_RECEIVED,
  BUILD_START,
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
  const fs = new MemoryFileSystem();
  const webSocket = new WebSocket(
    `ws+unix://${socketAddress}:/?platform=${platform}`
  );

  function onError(error: Error) {
    webSocket.send(JSON.stringify({ type: BUILD_FAILED, payload: error }));
  }

  function onCompile() {
    webSocket.send(
      JSON.stringify({
        type: BUILD_START,
        payload: null,
      })
    );
  }

  function onBuilt(bundle: string, stats: Object) {
    console.log('onBuilt');
    webSocket.send(
      JSON.stringify({
        type: BUILD_FINISHED,
        payload: { bundle, stats: stats.toJson() },
      })
    );
  }

  function onLiveReload() {
    webSocket.send(JSON.stringify({ type: LIVE_RELOAD, payload: null }));
  }

  webSocket.on('message', data => {
    const { type, ...payload } = JSON.parse(data.toString());

    if (type === REQUEST_BUILD) {
      runWebpackCompiler(
        {
          platform,
          fileOutput,
          options,
          fs,
        },
        {
          onError,
          onCompile,
          onBuilt,
          onLiveReload,
        }
      );
    } else if (type === REQUEST_FILE) {
      const filename = path.join(process.cwd(), payload.url);
      if (fs.existsSync(filename)) {
        webSocket.send(
          JSON.stringify({
            type: FILE_RECEIVED,
            payload: fs.readFileSync(filename).toString(),
          })
        );
      }
    } else {
      console.log(`Unknown event ${type}`);
    }
  });
};
