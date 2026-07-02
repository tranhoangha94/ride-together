const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const mobileModules = path.resolve(projectRoot, "node_modules");
const rootModules = path.resolve(monorepoRoot, "node_modules");

const escapeRegExp = (value) => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

// Inlined equivalent of metro-config's internal `defaults/exclusionList` helper
// (not part of its public package exports, so it can't be required directly).
const exclusionList = (patterns) => new RegExp(`(${patterns.map((p) => p.source).join("|")})$`);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [mobileModules, rootModules];
config.resolver.extraNodeModules = {
  react: path.resolve(mobileModules, "react"),
  "react-native": path.resolve(mobileModules, "react-native"),
  expo: path.resolve(mobileModules, "expo")
};
config.resolver.blockList = exclusionList([
  new RegExp(`^${escapeRegExp(path.join(rootModules, "expo"))}[\\\\/].*`),
  new RegExp(`^${escapeRegExp(path.join(rootModules, "react-native"))}[\\\\/].*`),
  new RegExp(`^${escapeRegExp(path.join(rootModules, "react"))}[\\\\/].*`),
  new RegExp(`^${escapeRegExp(path.join(rootModules, "react-dom"))}[\\\\/].*`)
]);

module.exports = config;
