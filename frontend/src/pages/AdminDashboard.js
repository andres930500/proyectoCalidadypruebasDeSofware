// frontend/src/pages/AdminDashboard.js

import React, { useState } from 'react';
import AdminUsersManagement from '../components/AdminUsersManagement';
import AdminGlobalAppointments from '../components/AdminGlobalAppointments';
// import 'bootstrap/dist/css/bootstrap.min.css'; // Ya importado en index.js o App.js

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users'); // 'users' o 'appointments'

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Panel de Administración</h2>

            {/* Navegación por pestañas (Tabs) */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Gestión de Usuarios
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('appointments')}
                    >
                        Agenda Global
                    </button>
                </li>
            </ul>

            {/* Contenido de las pestañas */}
            <div className="tab-content">
                <div className={`tab-pane fade ${activeTab === 'users' ? 'show active' : ''}`}>
                    <AdminUsersManagement />
                </div>
                <div className={`tab-pane fade ${activeTab === 'appointments' ? 'show active' : ''}`}>
                    <AdminGlobalAppointments />
                </div>
            </div>
        </div>
    );
}