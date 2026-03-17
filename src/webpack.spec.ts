import * as path from 'path';

describe('webpack config', () => {
  let configs: any[];

  beforeAll(() => {
    configs = require('../webpack.config');
  });

  it('should export an array of two configurations', () => {
    expect(Array.isArray(configs)).toBe(true);
    expect(configs).toHaveLength(2);
  });

  it('should produce dist/quill-cursors.core.js', () => {
    const coreConfig = configs.find(
      (c: any) => c.entry && c.entry['quill-cursors.core'],
    );
    expect(coreConfig).toBeDefined();
    expect(coreConfig.entry['quill-cursors.core']).toBe('./src/index.core.ts');
    expect(coreConfig.output.filename).toBe('[name].js');
    expect(coreConfig.output.path).toBe(path.resolve(__dirname, '..', 'dist'));
  });

  it('should not include SCSS rules in core config', () => {
    const coreConfig = configs.find(
      (c: any) => c.entry && c.entry['quill-cursors.core'],
    );
    const scssRule = coreConfig.module.rules.find(
      (r: any) => r.test && r.test.toString().includes('scss'),
    );
    expect(scssRule).toBeUndefined();
  });

  it('should disable devtool in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const prodConfigs = require('../webpack.config');
      const coreConfig = prodConfigs.find(
        (c: any) => c.entry && c.entry['quill-cursors.core'],
      );
      expect(coreConfig.devtool).toBe(false);
    } finally {
      process.env.NODE_ENV = originalEnv;
      jest.resetModules();
    }
  });

  it('should default to development mode when NODE_ENV is unset', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      delete process.env.NODE_ENV;
      jest.resetModules();
      const devConfigs = require('../webpack.config');
      expect(devConfigs[0].mode).toBe('development');
    } finally {
      process.env.NODE_ENV = originalEnv;
      jest.resetModules();
    }
  });
});
