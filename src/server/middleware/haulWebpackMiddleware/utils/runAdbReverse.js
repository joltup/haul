/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const { exec } = require('child_process');
const clear = require('clear');

const logger = require('../../../../logger');
const messages = require('../../../../messages');

module.exports = function runAdbReverse(port: number) {
  const command = `adb reverse tcp:${port} tcp:${port}`;

  clear();
  exec(command, error => {
    if (error) {
      // Get just the error message
      const message = error.message.split('error:')[1];

      logger.warn(
        messages.commandFailed({
          command,
          error: new Error(message),
        })
      );
      return;
    }
    logger.info(
      messages.commandSuccess({
        command,
      })
    );
  });
};
