import React from 'react';
// FIX: No necesitamos 'act' explícitamente si usamos findBy/waitFor correctamente, pero es bueno saber que existen.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminUsersManagement from '../../components/AdminUsersManagement';
import api from '../api';

jest.mock('../api', () => ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
}));

describe('AdminUsersManagement Component Tests', () => {

    beforeEach(() => {
        api.get.mockClear();
        api.post.mockClear();
        api.delete.mockClear();

        api.get.mockImplementation((url) => {
            if (url === '/admin/doctors' || url === '/admin/patients') {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error(`URL de API no mockeada: ${url}`));
        });
    });

    describe('Renderizado Inicial y de Roles', () => {
        test('debe renderizar la estructura inicial correctamente', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que un elemento post-carga aparezca. Esto resuelve los warnings de 'act' y los errores de 'element not found'.
            expect(await screen.findByRole('heading', { name: /Gestión de Usuarios - Panel Administrativo/i })).toBeInTheDocument();

            // Ahora que la carga terminó, estas aserciones son seguras.
            expect(screen.getByRole('combobox', { name: /Tipo de Usuario/i })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Médico' }).selected).toBe(true);
            expect(screen.getByText('No hay médicos registrados.')).toBeInTheDocument();
            expect(screen.getByText('No hay pacientes registrados.')).toBeInTheDocument();
        });

        test('debe cambiar y mostrar los campos de "Paciente" al seleccionar el rol', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que la carga inicial termine antes de interactuar.
            await screen.findByLabelText(/Número de Licencia/i);

            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient' } });
            
            // Esperar a que el nuevo campo aparezca después del cambio de estado.
            await screen.findByLabelText(/Número de Documento/i);
            
            expect(screen.queryByLabelText(/Especialidad/i)).not.toBeInTheDocument();
            expect(screen.getByLabelText(/Apellidos \(Paciente\)/i)).toBeInTheDocument();
        });
    });

    describe('Ingreso de Datos en Inputs', () => {
        test('debe permitir ingresar datos en los campos de Doctor', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que el componente esté listo.
            await screen.findByLabelText(/Nombre de Usuario/i);
            
            const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
            fireEvent.change(usernameInput, { target: { value: 'dr.test' } });
            expect(usernameInput.value).toBe('dr.test');
        });

        test('debe permitir ingresar datos en los campos de Paciente', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que el componente esté listo ANTES de intentar interactuar.
            await screen.findByRole('combobox');
            
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient' } });
            await screen.findByLabelText(/Número de Documento/i);

            const docInput = screen.getByLabelText(/Número de Documento/i);
            fireEvent.change(docInput, { target: { value: '123456789' } });
            expect(docInput.value).toBe('123456789');
        });
    });

    describe('Validaciones de Formato Inválido', () => {

        const testInvalidFormat = async (label, invalidValue, errorMessage) => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que los campos estén listos.
            await screen.findByLabelText(label);

            const input = screen.getByLabelText(label);
            fireEvent.change(input, { target: { value: invalidValue } });
            fireEvent.blur(input);

            const error = await screen.findByText(errorMessage);
            expect(error).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Registrar Usuario/i })).toBeDisabled();
        };

        test('debe mostrar error para un email con formato incorrecto', async () => { // FIX: La función de ayuda es async, así que la prueba también.
            await testInvalidFormat(/Email/i, 'email-invalido', /Correo inválido/);
        });

        test('debe mostrar error para una contraseña que no cumple los requisitos', async () => { // FIX: Async
            await testInvalidFormat(/Contraseña/i, 'corta', /Contraseña inválida/);
        });
        
        test('debe mostrar error para un nombre de usuario con caracteres inválidos', async () => { // FIX: Async
            await testInvalidFormat(/Nombre de Usuario/i, 'user-!', /Usuario inválido/);
        });

        test('debe mostrar error para un teléfono con letras', async () => { // FIX: Async
            await testInvalidFormat(/Teléfono/i, '123abcde', /Teléfono inválido/);
        });

        test('debe mostrar error para una licencia de médico con formato inválido', async () => { // FIX: Async
            await testInvalidFormat(/Número de Licencia/i, '!!!', /Número de licencia inválido/);
        });

        test('debe mostrar error para una fecha de nacimiento futura (Paciente)', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que el componente esté listo.
            await screen.findByRole('combobox');
            
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'patient' } });
            
            const dateInput = await screen.findByLabelText(/Fecha de Nacimiento/i);
            
            fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
            fireEvent.blur(dateInput);

            expect(await screen.findByText('La fecha de nacimiento no puede ser en el futuro.')).toBeInTheDocument();
        });

        test('debe limpiar un error cuando se corrige el formato', async () => {
            render(<AdminUsersManagement />);
            // FIX: Esperar a que el componente esté listo.
            const emailInput = await screen.findByLabelText(/Email/i);

            fireEvent.change(emailInput, { target: { value: 'correo-malo' } });
            fireEvent.blur(emailInput);
            expect(await screen.findByText(/Correo inválido/)).toBeInTheDocument();

            fireEvent.change(emailInput, { target: { value: 'correo.bueno@dominio.com' } });
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.queryByText(/Correo inválido/)).not.toBeInTheDocument();
            });
        });
    });

       // --- Pruebas de Ingreso de Datos (Inputs) ---

    test('debe permitir ingresar datos en los campos comunes y de Doctor', async () => {
        render(<AdminUsersManagement />);
        await screen.findByRole('heading', { name: /Gestión de Usuarios/i });

        // Probamos los campos comunes
        const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
        fireEvent.change(usernameInput, { target: { value: 'dr.test' } });
        expect(usernameInput.value).toBe('dr.test');

        const emailInput = screen.getByLabelText(/Email/i);
        fireEvent.change(emailInput, { target: { value: 'dr.test@hospital.com' } });
        expect(emailInput.value).toBe('dr.test@hospital.com');

        // Probamos los campos específicos de Doctor
        const specialtyInput = screen.getByLabelText(/Especialidad/i);
        fireEvent.change(specialtyInput, { target: { value: 'Inmunología' } });
        expect(specialtyInput.value).toBe('Inmunología');
        
        const licenseInput = screen.getByLabelText(/Número de Licencia/i);
        fireEvent.change(licenseInput, { target: { value: 'LIC12345' } });
        expect(licenseInput.value).toBe('LIC12345');
    });
    
    test('debe permitir ingresar datos en los campos comunes y de Paciente', async () => {
        render(<AdminUsersManagement />);
        await screen.findByRole('heading', { name: /Gestión de Usuarios/i });

        // Cambiamos a rol Paciente
        fireEvent.change(screen.getByRole('combobox', { name: /Tipo de Usuario/i }), { target: { value: 'patient' } });
        await screen.findByLabelText(/Número de Documento/i); // Esperamos a que los campos cambien

        // Probamos los campos comunes (de nuevo, en el contexto de Paciente)
        const usernameInput = screen.getByLabelText(/Nombre de Usuario/i);
        fireEvent.change(usernameInput, { target: { value: 'paciente.test' } });
        expect(usernameInput.value).toBe('paciente.test');
        
        // Probamos los campos específicos de Paciente
        const patientLastNameInput = screen.getByLabelText(/Apellidos \(Paciente\)/i);
        fireEvent.change(patientLastNameInput, { target: { value: 'González' } });
        expect(patientLastNameInput.value).toBe('González');
        
        const documentNumberInput = screen.getByLabelText(/Número de Documento/i);
        fireEvent.change(documentNumberInput, { target: { value: '1020304050' } });
        expect(documentNumberInput.value).toBe('1020304050');

        const birthDateInput = screen.getByLabelText(/Fecha de Nacimiento/);
        fireEvent.change(birthDateInput, { target: { value: '1995-05-10' } });
        expect(birthDateInput.value).toBe('1995-05-10');
    });
});
