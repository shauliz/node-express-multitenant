/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "^app/(.*)$": "<rootDir>/src/app/$1",
  },
  // Tests share a single SQLite file via the Prisma test client.
  maxWorkers: 1,
};
