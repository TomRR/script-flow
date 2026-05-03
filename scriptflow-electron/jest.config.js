/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest',
    testEnvironment: '@happy-dom/jest-environment',
    testPathIgnorePatterns: [
        '/node_modules/',
        '[/\\\\]\\._[^/\\\\]+$'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/renderer/$1'
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    esModuleInterop: true,
                    module: 'commonjs',
                    moduleResolution: 'node',
                    target: 'ES2023',
                    strict: true,
                    skipLibCheck: true,
                    jsx: 'react-jsx',
                    baseUrl: '.',
                    paths: {
                        '@/*': ['./src/renderer/*']
                    }
                }
            }
        ]
    }
};
