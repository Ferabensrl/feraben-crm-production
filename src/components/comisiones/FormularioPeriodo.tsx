import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  AlertCircle,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vendedor {
  id: number;
  nombre: string;
}

interface FormularioPeriodoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { id: number; nombre: string; rol: string };
}

export const FormularioPeriodo: React.FC<FormularioPeriodoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedores, setSelectedVendedores] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🆕 NUEVOS CAMPOS PARA ADELANTOS Y DESCUENTOS
  const [adelantos, setAdelantos] = useState<Record<number, number>>({});
  const [pagosMano, setPagosMano] = useState<Record<number, number>>({});
  const [otrosDescuentos, setOtrosDescuentos] = useState<
    Record<number, number>
  >({});
  const [conceptosDescuentos, setConceptosDescuentos] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    if (isOpen) {
      const loadVendedores = async () => {
        const { data } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .eq('activo', true)
          .gt('comision_porcentaje', 0)
          .order('nombre');
        setVendedores(data || []);
      };
      loadVendedores();

      // Reset form
      setSelectedVendedores([]);
      setFechaInicio('');
      setFechaFin('');
      setObservaciones('');
      setAdelantos({});
      setPagosMano({});
      setOtrosDescuentos({});
      setConceptosDescuentos({});
    }
  }, [isOpen]);

  const handleSelectVendedor = (id: number) => {
    setSelectedVendedores((prev) => {
      if (prev.includes(id)) {
        // Remover vendedor y limpiar sus montos
        const newSelected = prev.filter((vId) => vId !== id);
        setAdelantos((prevAd) => {
          const newAd = { ...prevAd };
          delete newAd[id];
          return newAd;
        });
        setPagosMano((prevPM) => {
          const newPM = { ...prevPM };
          delete newPM[id];
          return newPM;
        });
        setOtrosDescuentos((prevOD) => {
          const newOD = { ...prevOD };
          delete newOD[id];
          return newOD;
        });
        setConceptosDescuentos((prevCD) => {
          const newCD = { ...prevCD };
          delete newCD[id];
          return newCD;
        });
        return newSelected;
      } else {
        return [...prev, id];
      }
    });
  };

  const actualizarMonto = (
    vendedorId: number,
    tipo: 'adelantos' | 'pagosMano' | 'otrosDescuentos',
    valor: number
  ) => {
    if (tipo === 'adelantos') {
      setAdelantos((prev) => ({ ...prev, [vendedorId]: valor }));
    } else if (tipo === 'pagosMano') {
      setPagosMano((prev) => ({ ...prev, [vendedorId]: valor }));
    } else if (tipo === 'otrosDescuentos') {
      setOtrosDescuentos((prev) => ({ ...prev, [vendedorId]: valor }));
    }
  };

  const actualizarConcepto = (vendedorId: number, concepto: string) => {
    setConceptosDescuentos((prev) => ({ ...prev, [vendedorId]: concepto }));
  };

  const calcularTotalDescuentos = (vendedorId: number): number => {
    const adelanto = adelantos[vendedorId] || 0;
    const pagoMano = pagosMano[vendedorId] || 0;
    const otroDesc = otrosDescuentos[vendedorId] || 0;
    return adelanto + pagoMano + otroDesc;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendedores.length === 0 || !fechaInicio || !fechaFin) {
      setError('Debes seleccionar al menos un vendedor y ambas fechas.');
      return;
    }
    setError('');
    setLoading(true);

    const nuevosPeriodos = selectedVendedores.map((vendedorId) => ({
      vendedor_id: vendedorId,
      periodo_inicio: fechaInicio,
      periodo_fin: fechaFin,
      estado: 'pendiente' as const,
      created_by: currentUser.id,
      observaciones: observaciones,
      // 🆕 INCLUIR ADELANTOS Y DESCUENTOS
      total_adelantos: adelantos[vendedorId] || 0,
      total_pagos_mano: pagosMano[vendedorId] || 0,
      otros_descuentos: otrosDescuentos[vendedorId] || 0,
      concepto_descuentos: conceptosDescuentos[vendedorId] || null,
    }));

    try {
      const { error: insertError } = await supabase
        .from('periodos_comision')
        .insert(nuevosPeriodos);
      if (insertError) throw insertError;

      const totalPeriodos = nuevosPeriodos.length;
      const totalAdelantos = nuevosPeriodos.reduce(
        (sum, p) => sum + (p.total_adelantos || 0),
        0
      );
      const totalPagosMano = nuevosPeriodos.reduce(
        (sum, p) => sum + (p.total_pagos_mano || 0),
        0
      );
      const totalOtrosDesc = nuevosPeriodos.reduce(
        (sum, p) => sum + (p.otros_descuentos || 0),
        0
      );

      let mensaje = `✅ ${totalPeriodos} período(s) creado(s) exitosamente.`;
      if (totalAdelantos > 0)
        mensaje += `\n💰 Adelantos: $${totalAdelantos.toFixed(2)}`;
      if (totalPagosMano > 0)
        mensaje += `\n💵 Pagos en mano: $${totalPagosMano.toFixed(2)}`;
      if (totalOtrosDesc > 0)
        mensaje += `\n📝 Otros descuentos: $${totalOtrosDesc.toFixed(2)}`;

      alert(mensaje);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(`Error creando períodos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold">
            Crear Nuevo Período de Comisión
          </h3>
          <button onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de vendedores */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendedores a liquidar
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
              {vendedores.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedVendedores.includes(v.id)
                      ? 'bg-primary/20'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedVendedores.includes(v.id)}
                    onChange={() => handleSelectVendedor(v.id)}
                    className="form-checkbox h-4 w-4 text-primary rounded"
                  />
                  <span className="text-sm">{v.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fechas del período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fechaInicio"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Calendar size={16} className="inline mr-1" />
                Fecha de Inicio
              </label>
              <input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="fechaFin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Calendar size={16} className="inline mr-1" />
                Fecha de Fin
              </label>
              <input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* 🆕 SECCIÓN DE ADELANTOS Y DESCUENTOS */}
          {selectedVendedores.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign size={20} className="mr-2 text-green-600" />
                Adelantos y Descuentos por Vendedor
              </h4>
              <div className="space-y-4">
                {selectedVendedores.map((vendedorId) => {
                  const vendedor = vendedores.find((v) => v.id === vendedorId);
                  const totalDescuentos = calcularTotalDescuentos(vendedorId);

                  return (
                    <div
                      key={vendedorId}
                      className="bg-gray-50 p-4 rounded-lg border"
                    >
                      <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                        <User size={16} className="mr-2" />
                        {vendedor?.nombre}
                        {totalDescuentos > 0 && (
                          <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Total descuentos: ${totalDescuentos.toFixed(2)}
                          </span>
                        )}
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Adelantos */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            💰 Adelantos de Comisión
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={adelantos[vendedorId] || ''}
                            onChange={(e) =>
                              actualizarMonto(
                                vendedorId,
                                'adelantos',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Adelantos ya entregados
                          </p>
                        </div>

                        {/* Pagos en mano */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            💵 Pagos en Mano de Clientes
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={pagosMano[vendedorId] || ''}
                            onChange={(e) =>
                              actualizarMonto(
                                vendedorId,
                                'pagosMano',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Dinero de clientes que tiene en mano
                          </p>
                        </div>

                        {/* Otros descuentos */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            📝 Otros Descuentos
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={otrosDescuentos[vendedorId] || ''}
                            onChange={(e) =>
                              actualizarMonto(
                                vendedorId,
                                'otrosDescuentos',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Mercadería, gastos, etc.
                          </p>
                        </div>
                      </div>

                      {/* Concepto de descuentos */}
                      {otrosDescuentos[vendedorId] > 0 && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Concepto de Otros Descuentos
                          </label>
                          <input
                            type="text"
                            value={conceptosDescuentos[vendedorId] || ''}
                            onChange={(e) =>
                              actualizarConcepto(vendedorId, e.target.value)
                            }
                            placeholder="Ej: Mercadería llevada por el vendedor"
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observaciones generales */}
          <div>
            <label
              htmlFor="observaciones"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Observaciones generales (opcional)
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
              placeholder="Comentarios adicionales sobre este período..."
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark disabled:bg-gray-400 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <CreditCard size={16} className="mr-2" />
                  Crear Períodos
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
