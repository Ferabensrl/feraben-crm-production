// src/pages/inventario/index.tsx
// Página principal del sistema de inventario Feraben

import React from 'react';
import { Package } from 'lucide-react';
import DashboardInventario from '../../components/inventario/DashboardInventario';

/**
 * 📦 PÁGINA PRINCIPAL DEL INVENTARIO FERABEN
 * 
 * Esta es la página independiente que contiene todo el sistema de inventario.
 * Accesible desde: http://localhost:3000/inventario
 */

const InventarioPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔝 HEADER DE LA PÁGINA */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <Package className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Inventario - Feraben CRM
              </h1>
              <p className="text-gray-600 text-sm">
                Gestión completa de productos, stock y facturación
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 DASHBOARD PRINCIPAL */}
      <main className="max-w-7xl mx-auto">
        <DashboardInventario />
      </main>

      {/* 📱 PIE DE PÁGINA */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              © 2025 Feraben SRL - Sistema de Inventario
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Versión 2.0</span>
              <span>•</span>
              <span>Códigos de Barras</span>
              <span>•</span>
              <span>Excel Automático</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InventarioPage;