// frontend/src/__tests__/Login.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../../pages/Login';// Mock de la función updateAuthInfo, aunque no la usaremos en estas pruebas específicas
const mockUpdateAuthInfo = jest.fn();

describe('Login Component - Pruebas de Renderizado y Validación de Campos', () => {
  // Configuración antes de cada prueba
  beforeEach(() => {
    // Limpia los mocks si se usaran en el futuro, por ahora no es estrictamente necesario para estas pruebas
    mockUpdateAuthInfo.mockClear();
    // Limpia localStorage, buena práctica aunque no impacte directamente estas pruebas
    localStorage.clear();
  });

  // Helper para renderizar el componente con las props necesarias
  const renderLoginComponent = () => {
    render(<Login updateAuthInfo={mockUpdateAuthInfo} />);
  };

  
  test('debe renderizar el formulario de login correctamente', () => {
    renderLoginComponent();

    // **Verifica que los elementos principales están en el documento**
    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    
    // Campos del formulario
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Iniciar como/i)).toBeInTheDocument();
    
    // Botón de envío
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
    
    // Enlace de registro
    expect(screen.getByText(/¿No tienes una cuenta\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Regístrate aquí/i })).toBeInTheDocument();

    // **Asegúrate de que los mensajes de error o carga no están presentes al inicio**
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });



  test('debe mostrar un mensaje de error si el correo electrónico está vacío', async () => {
    renderLoginComponent();

    // No ingresamos email, solo una contraseña para aislar el error del email
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { name: 'password', value: 'Password123!' } });
    
    // Simula el envío del formulario
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    // **Verifica que el mensaje de error específico del campo aparece**
    expect(await screen.findByText('El correo electrónico es obligatorio.')).toBeInTheDocument();
    // **Verifica que el mensaje de error general también aparece**
    expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();
  });

  test('debe mostrar un mensaje de error si el correo electrónico tiene un formato inválido', async () => {
    renderLoginComponent();

    // Ingresa un email con formato incorrecto
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { name: 'email', value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { name: 'password', value: 'Password123!' } });
    
    // Simula el envío del formulario
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    // **Verifica el mensaje de error de formato inválido**
    expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();
  });

  test('debe mostrar un mensaje de error si la contraseña está vacía', async () => {
    renderLoginComponent();

    // No ingresamos contraseña, solo un email para aislar el error de la contraseña
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { name: 'email', value: 'test@example.com' } });
    
    // Simula el envío del formulario
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    // **Verifica el mensaje de error de contraseña vacía**
    expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();
  });

  test('debe mostrar un mensaje de error si la contraseña no cumple con la regex', async () => {
    renderLoginComponent();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { name: 'email', value: 'test@example.com' } });
    // Ingresa una contraseña que no cumple con la regex (ej. sin mayúscula, número, símbolo)
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { name: 'password', value: 'contraseña' } }); 
    
    // Simula el envío del formulario
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    // **Verifica el mensaje de error de formato de contraseña**
    expect(await screen.findByText(/Contraseña inválida \(debe contener mayúscula, minúscula, número y símbolo especial, máximo 10 caracteres\)./i)).toBeInTheDocument();
    expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();
  });

  test('debe limpiar los errores específicos y generales al modificar un campo', async () => {
    renderLoginComponent();

    // Provoca un error inicialmente (ej. email inválido)
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { name: 'email', value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    // Espera que los mensajes de error aparezcan
    expect(await screen.findByText('Correo inválido (máximo 30 caracteres, formato correcto).')).toBeInTheDocument();
    expect(screen.getByText('Por favor, corrige los errores en el formulario.')).toBeInTheDocument();

    // Ahora, modifica el campo de email a un valor válido
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { name: 'email', value: 'valid@example.com' } });

    // **Verifica que los mensajes de error desaparecen**
    expect(screen.queryByText('Correo inválido (máximo 30 caracteres, formato correcto).')).not.toBeInTheDocument();
    expect(screen.queryByText('Por favor, corrige los errores en el formulario.')).not.toBeInTheDocument();
  });
});