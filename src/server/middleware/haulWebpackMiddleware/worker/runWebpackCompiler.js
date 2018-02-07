/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

const webpack = require('webpack');
const MemoryFileSystem = require('memory-fs');
const path = require('path');
const clear = require('clear');

const getConfig = global.requireWithRootDir('../utils/getConfig');

let compiler;
let webpackStats = null;
let isBuildInProgress = false;
let callbacks = [];
const fs = new MemoryFileSystem();

module.exports = function runWebpackCompiler(
  { platform, fileOutput, options }: { [key: string]: string },
  { onError, onLiveReload, onBuilt }: { [key: string]: Function }
) {
  function getBundle() {
    return fs.readFileSync(path.join(process.cwd(), fileOutput)).toString();
  }

  // If compiler was created but it hasn't finished the build yet,
  // enqueue onBuilt callback and immediately return, if build is not in progress
  // and compiler was created it means that the bundle is ready - exec onBuild and return;
  if (compiler && isBuildInProgress) {
    callbacks.push(onBuilt);
    return;
  } else if (compiler && !isBuildInProgress) {
    onBuilt(getBundle(), webpackStats);
    return;
  } else if (!compiler) {
    callbacks.push(onBuilt);
  }

  const { configPath, configOptions } = JSON.parse(options);
  const config = getConfig(configPath, configOptions, platform);

  compiler = webpack(config);
  // Set compiler options, set fs to Memory
  compiler.outputFileSystem = fs;

  compiler.plugin('done', stats => {
    isBuildInProgress = false;
    webpackStats = stats;

    clear();

    process.nextTick(() => {
      if (isBuildInProgress) return;
      callbacks.forEach(callback => callback(getBundle(), webpackStats));
      callbacks = [];
      if (typeof onLiveReload === 'function') {
        onLiveReload();
      }
    });
  });

  function compilerInvalid(...args) {
    isBuildInProgress = true;
    webpackStats = null;
    // resolve async
    if (args.length === 2 && typeof args[1] === 'function') {
      const callback = args[1];
      callback();
    }
  }

  compiler.plugin('invalid', compilerInvalid);
  compiler.plugin('watch-run', compilerInvalid);
  compiler.plugin('run', compilerInvalid);

  compiler.watch({}, error => {
    if (error) {
      onError(error);
    }
  });
};
