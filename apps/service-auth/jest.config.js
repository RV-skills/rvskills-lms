const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset({
}).transform;

module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFiles: ["./jest.setup.ts"]
};
