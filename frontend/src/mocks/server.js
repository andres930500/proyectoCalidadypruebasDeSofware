// frontend/src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers'; // <-- Asegúrate de que la importación sea nombrada { handlers }

export const server = setupServer(...handlers); // <-- Y que se use como un spread operator en un array iterable