const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Run in-process with main thread (0 workers) so it inherits the full 4GB heap
config.maxWorkers = 0;

module.exports = config;

