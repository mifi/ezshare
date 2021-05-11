'use strict';

const { getAuthStatus } = require('node-mac-permissions');
const { askForAccessibilityAccess } = require('node-mac-permissions');
var robot = require('robotjs');

// TODO yarn add node-mac-permissions robotjs

// Prevent blocking
robot.setMouseDelay(0);

function set() {
  const status = getAuthStatus('accessibility')
  if (status !== 'authorized') {
    askForAccessibilityAccess();
  }

  var twoPI = Math.PI * 2.0;
  var screenSize = robot.getScreenSize();
  var height = (screenSize.height / 2) - 10;
  var width = screenSize.width;

  let y = 0;

  for (var x = 0; x < width; x++)
  {
    y = height * Math.sin((twoPI * x) / width) + height;
    robot.moveMouse(x, y);
  }
}

module.exports = {
  set,
};
