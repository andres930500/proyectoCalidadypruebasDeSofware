// frontend/src/setupTests.js

// Los polyfills de 'util' (TextEncoder/Decoder) y 'web-streams-polyfill' (TransformStream)
// ya no son estrictamente necesarios para MSW v1.x.x en la mayoría de los entornos modernos de Jest.
// Puedes eliminarlos o dejarlos si no causan problemas.
// Para este ejercicio, los eliminaremos para simplificar, pero si vuelven a aparecer errores de polyfill,
// podrías necesitar reinstalarlos.
// import { TransformStream } from 'web-streams-polyfill'; // Comentar o eliminar
// import { TextEncoder, TextDecoder } from 'util'; // Comentar o eliminar

import '@testing-library/jest-dom';
import { server } from './mocks/server';

// // Polyfill TransformStream (para MSW) - Puedes eliminar esto si no es necesario
// if (typeof global.TransformStream === 'undefined') {
//   global.TransformStream = TransformStream;
// }

// // Polyfill TextEncoder y TextDecoder si no existen - Puedes eliminar esto si no es necesario
// if (typeof global.TextEncoder === 'undefined') {
//   global.TextEncoder = TextEncoder;
// }
// if (typeof global.TextDecoder === 'undefined') {
//   global.TextDecoder = TextDecoder;
// }


// --- ¡AÑADE ESTO PARA MOCKEAR AXIOS! ---
// Colócalo aquí, antes de la configuración de MSW y los tests
// Esto le dice a Jest que, cuando cualquier archivo intente importar 'axios',
// le dé este objeto mockeado en su lugar.
jest.mock('axios', () => ({
  // Mockea los métodos que tu aplicación utiliza de axios.
  // Para un registro de paciente, 'post' es crucial.
  // Asegúrate de que devuelvan una promesa para evitar errores.
  post: jest.fn(() => Promise.resolve({ data: {} })), // Mockea post
  get: jest.fn(() => Promise.resolve({ data: {} })),  // Mockea get
  put: jest.fn(() => Promise.resolve({ data: {} })),  // Mockea put
  delete: jest.fn(() => Promise.resolve({ data: {} })), // Mockea delete
  // Si tu aplicación usa axios.create(), también necesitas mockearlo:
  create: jest.fn(() => ({
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    // También mockear interceptores si tu código los usa y falla
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
  // Si tu código accede a axios.default o a axios como una función directa:
  default: jest.fn(() => Promise.resolve({ data: {} })),
}));
// --- FIN DE MOCK DE AXIOS ---


// Configura el ciclo de vida de MSW para tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock simple para localStorage y sessionStorage (opcional)
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });