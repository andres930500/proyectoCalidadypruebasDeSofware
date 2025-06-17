import React from 'react';
// Importa funciones de Testing Library para renderizar componentes, interactuar con ellos y hacer aserciones.
import { render, screen, fireEvent } from '@testing-library/react';
// Importa el extensor de Jest-DOM para tener aserciones más legibles y específicas del DOM (ej. .toBeInTheDocument()).
import '@testing-library/jest-dom';
// Importa BrowserRouter como Router para envolver el componente que usa react-router-dom en las pruebas.
import { BrowserRouter as Router } from 'react-router-dom';

// Importa el componente PatientRegisterForm que vamos a probar.
import PatientRegisterForm from '../../components/RegisterPatient';

// Crea un mock (simulación) para la función navigate de react-router-dom.
// Esto nos permite verificar si el componente intenta redirigir al usuario.
const mockNavigate = jest.fn();
// Mockea el módulo 'react-router-dom' para sobrescribir su implementación de 'useNavigate'.
// Esto asegura que nuestras pruebas no intenten una navegación real, sino que llamen a nuestro mock.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Mantiene las exportaciones reales del módulo
  useNavigate: () => mockNavigate, // Sustituye useNavigate con nuestro mock
}));

// Define un conjunto de pruebas para el componente 'PatientRegisterForm'.
// Todas las pruebas relacionadas con este componente se agruparán aquí.
describe('PatientRegisterForm Component', () => {
  // Función de ayuda para renderizar el componente 'PatientRegisterForm'
  // dentro de un <Router>, lo cual es necesario porque el componente usa `useNavigate`.
  const renderPatientRegisterForm = () => {
    render(
      <Router>
        <PatientRegisterForm />
      </Router>
    );
  };

  // Función de ayuda para rellenar todos los campos del formulario con valores válidos.
  // Esto es útil para pruebas donde queremos que la validación inicial pase.
  const fillAllValidFields = async () => {
    fireEvent.change(screen.getByLabelText(/Primer Nombre/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Perez' } });
    fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'cedula' } });
    fireEvent.change(screen.getByLabelText(/Número de documento/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'juanp' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'juan@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText(/Dirección/i), { target: { value: 'Calle Falsa 123' } });
  };

  // --- Pruebas de Renderizado Inicial ---

  // Prueba: Verifica que todos los campos y el botón principal se renderizan correctamente.
  test('debe renderizar todos los campos y botón', () => {
    // Renderiza el componente.
    renderPatientRegisterForm();
    // Aserciones: Comprueba que cada elemento (input, select, button) está en el documento.
    expect(screen.getByLabelText(/Primer Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de documento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de documento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar Paciente/i })).toBeInTheDocument();
  });

  // Prueba: Verifica que no hay mensajes de error o éxito visibles al inicio.
  test('no muestra mensajes de error o éxito inicialmente', () => {
    // Renderiza el componente.
    renderPatientRegisterForm();
    // Aserción: Comprueba que ningún elemento con el rol 'alert' está en el documento.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // --- Pruebas de Validación de Formulario (para datos inválidos) ---

  // Agrupa todas las pruebas de validación para mejor organización.
  describe('Validaciones de formulario', () => {

    // Prueba: Valida que un nombre con caracteres inválidos (números) muestra el error correcto.
    test('nombre inválido', async () => {
      // Renderiza el formulario.
      renderPatientRegisterForm();
      // Simula el cambio en el campo 'Primer Nombre' a un valor inválido.
      fireEvent.change(screen.getByLabelText(/Primer Nombre/i), { target: { value: 'Juan123' } });
      // Simula un clic en el botón de registro para activar la validación.
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      // Aserción: Espera que el mensaje de error específico para nombre inválido aparezca en el documento.
      expect(await screen.findByText('Nombre inválido (máximo dos palabras, solo letras).')).toBeInTheDocument();
    });

    // Prueba: Valida que un apellido con caracteres inválidos (números) muestra el error correcto.
    test('apellido inválido', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Perez123' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Apellido inválido (máximo dos apellidos, solo letras).')).toBeInTheDocument();
    });

    // Prueba: Valida que el campo 'Tipo de documento' requiere una selección.
    test('tipo de documento no seleccionado', async () => {
      renderPatientRegisterForm();
      // Rellena otros campos para que la validación se centre en el tipo de documento.
      fireEvent.change(screen.getByLabelText(/Primer Nombre/i), { target: { value: 'Juan' } });
      fireEvent.change(screen.getByLabelText(/Apellido/i), { target: { value: 'Perez' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Seleccione un tipo de documento.')).toBeInTheDocument();
    });

    // Prueba: Valida que el número de documento debe ser numérico y con longitud adecuada.
    test('documento inválido', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Número de documento/i), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Número de documento inválido (solo números, máximo 15 dígitos).')).toBeInTheDocument();
    });

    // Prueba: Valida que el nombre de usuario no exceda el límite de 10 caracteres.
    test('usuario largo', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: 'verylongusername' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Usuario inválido (máximo 10 caracteres).')).toBeInTheDocument();
    });

    // Prueba: Valida que el correo electrónico tenga un formato correcto.
    test('correo mal formado', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'bad-email' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    });

    // Prueba: Valida que el correo electrónico no exceda el límite de 30 caracteres.
    test('correo muy largo', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'veryveryveryverylongemail@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos una mayúscula.
    test('contraseña sin mayúscula', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos una minúscula.
    test('contraseña sin minúscula', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'PASSWORD123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos un número.
    test('contraseña sin número', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password!!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña debe contener al menos un símbolo especial.
    test('contraseña sin símbolo especial', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que la contraseña no exceda el límite de 10 caracteres.
    test('contraseña demasiado larga', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Password123456789!' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Contraseña inválida/)).toBeInTheDocument();
    });

    // Prueba: Valida que el campo de fecha de nacimiento es obligatorio.
    test('fecha vacía', async () => {
      renderPatientRegisterForm();
      // No se rellena la fecha para probar la validación.
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText('Fecha de nacimiento es obligatoria.')).toBeInTheDocument();
    });

    // Prueba: Valida que el teléfono debe ser numérico.
    test('teléfono inválido', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Teléfono inválido/)).toBeInTheDocument();
    });

    // Prueba: Valida que la dirección no contenga caracteres especiales.
    test('dirección con caracteres especiales', async () => {
      renderPatientRegisterForm();
      fireEvent.change(screen.getByLabelText(/Dirección/i), { target: { value: 'Calle #$%^' } });
      fireEvent.click(screen.getByRole('button', { name: /Registrar Paciente/i }));
      expect(await screen.findByText(/Dirección inválida/)).toBeInTheDocument();
    });
  });
});