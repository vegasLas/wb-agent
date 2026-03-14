import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/apps/api/jest.config.ts',
    '<rootDir>/libs/shared/jest.config.ts',
  ],
};

export default config;
