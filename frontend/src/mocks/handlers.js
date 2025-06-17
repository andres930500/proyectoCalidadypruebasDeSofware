// src/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  // Handler para el registro de pacientes
  rest.post('http://localhost:5000/api/patient/register', async (req, res, ctx) => {
    const body = await req.json();

    if (body.email === 'error@example.com') {
      return res(
        ctx.status(409),
        ctx.json({ message: 'El correo ya está registrado.' })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({ message: 'Paciente registrado con éxito.' })
    );
  }),

  // Puedes agregar más endpoints aquí...
];
