const nextJest = require('next/jest')

const createJestConfig = async () => {
  const nextConfig = await nextJest({
    dir: './',
  })

  return nextConfig({
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverageFrom: [
      'app/**/*.{js,jsx,ts,tsx}',
      '!app/**/*.d.ts',
      '!app/**/*.stories.{js,jsx,ts,tsx}',
      '!app/**/__tests__/**',
      '!app/**/__mocks__/**',
    ],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/.next/',
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    ],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
  })
}

module.exports = createJestConfig()
