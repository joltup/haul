/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * @flow
 */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-expressions */

// $FlowFixMe
import { Platform } from 'react-native';

export default function resetRedBox() {
  if (Platform.OS === 'ios') {
    // $FlowFixMe
    const RCTRedBox = require('NativeModules').RedBox;
    RCTRedBox && RCTRedBox.dismiss && RCTRedBox.dismiss();
  } else {
    // $FlowFixMe
    const RCTExceptionsManager = require('NativeModules').ExceptionsManager;
    RCTExceptionsManager &&
      RCTExceptionsManager.dismissRedbox &&
      RCTExceptionsManager.dismissRedbox();
  }
}
