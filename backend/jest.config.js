/** Configuración de Jest: pruebas en TypeScript con ts-jest. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/pruebas'],
  testMatch: ['**/*.prueba.ts'],
  collectCoverageFrom: ['src/dominio/**/*.ts', 'src/aplicacion/**/*.ts'],
  testTimeout: 20000,
};
