const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;

module.exports = config;
