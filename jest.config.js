export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts$': ['ts-jest', {tsconfig: 'tsconfig.base.json'}],
  },
  // Source uses node16-style `./x.js` specifiers; jest resolves the .ts files.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/jest.setup.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
