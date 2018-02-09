/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const path = require('path');
const WebSocket = require('ws');
const MemoryFileSystem = require('memory-fs');

const Events = global.requireWithRootDir('../events');
const runWebpackCompiler = global.requireWithRootDir('./runWebpackCompiler');

module.exports = function initWorker({
  platform,
  // fileOutput,
  options,
  socketAddress,
}: {
  [key: string]: string,
}) {
  const fs = new MemoryFileSystem();
  const webSocket = new WebSocket(
    `ws+unix://${socketAddress}:/?platform=${platform}`
  );

  function send(type, payload = {}) {
    webSocket.send(
      JSON.stringify({
        type,
        ...payload,
      })
    );
  }

  const compiler = runWebpackCompiler({
    platform,
    options,
    fs,
  });

  compiler.on(Events.BUILD_START, () => {
    send(Events.BUILD_START);
  });
  compiler.on(Events.BUILD_FINISHED, ({ error, stats }) => {
    send(Events.BUILD_FINISHED, {
      error,
      stats: stats ? stats.toJson() : null,
    });
  });

  webSocket.on('message', data => {
    const { type, ...payload } = JSON.parse(data.toString());

    if (type === Events.REQUEST_FILE) {
      const filename = path.join(process.cwd(), payload.filename);
      if (fs.existsSync(filename)) {
        send(Events.FILE_RECEIVED, {
          taskId: payload.taskId,
          file: fs.readFileSync(filename).toString(),
        });
      }
    } else {
      console.log(`Unknown event ${JSON.stringify(type)}`);
    }
  });
};
