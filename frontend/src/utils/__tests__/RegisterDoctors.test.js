import React from 'react';
// Importa funciones de Testing Library para renderizar componentes, interactuar con ellos y hacer aserciones.
import { render, screen, fireEvent } from '@testing-library/react';
// Importa el extensor de Jest-DOM para tener aserciones más legibles y específicas del DOM (ej. .toBeInTheDocument()).
import '@testing-library/jest-dom';
// Importa BrowserRouter como Router para envolver el componente que usa react-router-dom en las pruebas.
import { BrowserRouter as Router } from 'react-router-dom';

// Importa el componente RegisterDoctor que vamos a probar.
import RegisterDoctor from '../../components/RegisterDoctor'; // Ajusta la ruta si es necesario

// Crea un mock (simulación) para la función navigate de react-router-dom.
// Esto nos permite verificar si el componente intenta redirigir al usuario (aunque en este set de pruebas no lo verificaremos explícitamente).
const mockNavigate = jest.fn();
// Mockea el módulo 'react-router-dom' para sobrescribir su implementación de 'useNavigate'.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Mantiene las exportaciones reales del módulo
  useNavigate: () => mockNavigate, // Sustituye useNavigate con nuestro mock
}));

// Define un conjunto de pruebas para el componente 'RegisterDoctor'.
describe('RegisterDoctor Component', () => {
  // Función de ayuda para renderizar el componente 'RegisterDoctor'
  const renderRegisterDoctor = () => {
    render(
      <Router>
        <RegisterDoctor />
      </Router>
    );
  };

  // Función de ayuda para rellenar todos los campos del formulario con valores válidos.
  const fillAllValidFields = async () => {
    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'docjuan' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'juan.doc@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'DocPass123!' } });
    fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Número de Cédula/i), { target: { value: '1020304050' } });
    // Para la especialidad, seleccionar un valor real que no sea el placeholder
    fireEvent.change(screen.getByLabelText(/Especialidad/i), { target: { value: 'Cardiología' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '3001234567' } });
    fireEvent.change(screen.getByLabelText(/Número de licencia/i), { target: { value: 'LIC123ABC789' } });
  };

  // --- Pruebas de Renderizado Inicial ---

  // Prueba: Verifica que todos los campos y el botón principal se renderizan correctamente.
  test('debe renderizar todos los campos y el botón', () => {
    renderRegisterDoctor();
    // Aserciones: Comprueba que cada elemento está en el documento.
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Apellidos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Cédula/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Especialidad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de licencia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar Médico/i })).toBeInTheDocument();
  });

  // Prueba: Verifica que no hay mensajes de error o éxito visibles al inicio.
  test('no muestra mensajes de error o éxito inicialmente', () => {
    renderRegisterDoctor();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // --- Pruebas de Validación de Formulario (para datos inválidos) ---

  describe('Validaciones de formulario', () => {

    test('debe mostrar errores de validación para campos vacíos', async () => {
      renderRegisterDoctor();
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));

      // Esperar que los mensajes de error aparezcan
      expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('El número de cédula es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('Seleccione una especialidad.')).toBeInTheDocument();
      expect(screen.getByText('El teléfono es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('El número de licencia es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();
    });

    // Prueba: Valida que un nombre con caracteres inválidos (números) muestra el error correcto.
    test('nombre inválido', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Juan123' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Nombre inválido (máximo dos palabras, solo letras).')).toBeInTheDocument();
    });

    // Prueba: Valida que un apellido con caracteres inválidos (números) muestra el error correcto.
    test('apellido inválido', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Perez123' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Apellido inválido (máximo dos apellidos, solo letras).')).toBeInTheDocument();
    });

    // Prueba: Valida que el número de cédula debe ser numérico y con longitud adecuada.
    test('cédula inválida', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Número de Cédula/i), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Número de cédula inválido (solo números, máximo 15 dígitos).')).toBeInTheDocument();
    });

    // Prueba: Valida que el nombre de usuario no exceda el límite de 10 caracteres.
    test('usuario largo', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'verylongusername' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Usuario inválido (máximo 10 caracteres).')).toBeInTheDocument();
    });

    // Prueba: Valida que el correo electrónico tenga un formato correcto.
    test('correo mal formado', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'bad-email' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    });

    // Prueba: Valida que el correo electrónico no exceda el límite de 30 caracteres.
    test('correo muy largo', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'veryveryveryverylongemail@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos una mayúscula.
    test('contraseña sin mayúscula', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos una minúscula.
    test('contraseña sin minúscula', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'PASSWORD123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos un número.
    test('contraseña sin número', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password!!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos un símbolo especial.
    test('contraseña sin símbolo especial', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña no exceda el límite de 10 caracteres.
    test('contraseña demasiado larga', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password123456789!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la especialidad requiere una selección válida.
    test('especialidad no seleccionada', async () => {
      renderRegisterDoctor();
      // Asegurarse de que el valor inicial sea el placeholder
      fireEvent.change(screen.getByLabelText(/Especialidad/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Seleccione una especialidad.')).toBeInTheDocument();
    });

    // Prueba: Valida que el teléfono debe ser numérico.
    test('teléfono inválido', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText(/Teléfono inválido/)).toBeInTheDocument();
    });

    // Prueba: Valida que el número de licencia solo contenga letras y números.
    test('número de licencia inválido', async () => {
      renderRegisterDoctor();
      fireEvent.change(screen.getByLabelText(/Número de licencia/i), { target: { value: 'LIC#$%^' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Número de licencia inválido (solo letras y números, máximo 20 caracteres).')).toBeInTheDocument();
    });

    // Prueba: Valida que el error de un campo se limpia al cambiar su valor
    test('debe limpiar el error de un campo al cambiar su valor', async () => {
      renderRegisterDoctor();
      // Provoca un error en el nombre de usuario
      fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();

      // Cambia el nombre de usuario a un valor válido
      fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'newuser' } });
      // Verifica que el mensaje de error para el usuario haya desaparecido
      expect(screen.queryByText('El usuario es obligatorio.')).not.toBeInTheDocument();
    });

    // Prueba: Valida que el error de especialidad se limpia al seleccionar una opción válida
    test('debe limpiar el error de especialidad al seleccionar una opción válida', async () => {
      renderRegisterDoctor();
      // Provoca un error en la especialidad
      fireEvent.change(screen.getByLabelText(/Especialidad/i), { target: { value: '' } }); // Seleccionar la opción por defecto
      fireEvent.click(screen.getByRole('button', { name: /Registrar Médico/i }));
      expect(await screen.findByText('Seleccione una especialidad.')).toBeInTheDocument();

      // Selecciona una especialidad válida
      fireEvent.change(screen.getByLabelText(/Especialidad/i), { target: { value: 'Cardiología' } });
      // Verifica que el mensaje de error para la especialidad haya desaparecido
      expect(screen.queryByText('Seleccione una especialidad.')).not.toBeInTheDocument();
    });
  });
});