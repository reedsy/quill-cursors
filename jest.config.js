module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.base.json',
    },
  },
};
