import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Layers } from 'lucide-react';
import { db } from '../../db.js';

const EditConditions = () => {
  const { projectId, pointId, conditionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    core_condition_id: '',
    depth: '',
    bottom: '',
    type: 'Broken Core'
  });

  const typeOptions = [
    'Broken Core',
    'Lost Core',
    'Fault Core'
  ];

  // --- FUNCIÓN DE NAVEGACIÓN SEGURA ---
  const handleReturn = () => {
    const targetPointId = pointId || formData?.point_id;
    if (targetPointId) {
      const safeId = encodeURIComponent(targetPointId);
      navigate(`/point/${safeId}?tab=conditions`, { 
        state: { activeTab: 'conditions' },
        replace: true 
      });
    } else {
      navigate(-1);
    }
  };

  // 1. Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await db.core_conditions.where('core_condition_id').equals(conditionId).first();
        if (data) {
          setFormData(data);
        } else {
          alert('Registro no encontrado');
          navigate(-1);
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    // Simulamos ID si no existe para preview
    if (conditionId || true) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depthVal = parseFloat(formData.depth);
    const bottomVal = parseFloat(formData.bottom);

    // --- VALIDACIONES ---
    if (isNaN(depthVal) || isNaN(bottomVal)) {
        alert("Ingrese valores numéricos válidos.");
        return;
    }

    if (bottomVal <= depthVal) {
        alert("El valor 'Bottom' debe ser mayor que 'Depth'.");
        return;
    }

    try {
        await db.core_conditions.update(formData.id, {
            depth: depthVal,
            bottom: bottomVal,
            type: formData.type,
            sync_status: 0
        });

        alert('Condición actualizada correctamente');
        handleReturn();

    } catch (error) {
        console.error("Error update:", error);
        alert("Error al actualizar.");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg flex items-center gap-2 justify-center text-teal-700">
                    <Layers size={20}/> Editar Condición
                </h1>
            </div>
            <button type="submit" className="text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1 bg-teal-50 px-3 py-2 rounded-lg transition-colors border border-teal-200">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-teal-100">
                
                {/* Campos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depth (m)*</label>
                        <input 
                            name="depth" 
                            type="number" 
                            step="0.01" 
                            value={formData.depth} 
                            onChange={handleChange} 
                            className="w-full p-3 border rounded font-mono font-bold text-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottom (m)*</label>
                        <input 
                            name="bottom" 
                            type="number" 
                            step="0.01" 
                            value={formData.bottom} 
                            onChange={handleChange} 
                            className="w-full p-3 border rounded font-mono font-bold text-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                            required 
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Condición</label>
                    <select 
                        name="type" 
                        value={formData.type} 
                        onChange={handleChange} 
                        className="w-full p-3 border rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold text-gray-700"
                    >
                        {typeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {/* Info visual */}
                <div className="bg-teal-50 p-3 rounded border border-teal-100 text-teal-800 text-sm flex items-center gap-2 mt-6">
                    <Layers size={16}/>
                    <span>Longitud del tramo: <strong>{(parseFloat(formData.bottom) - parseFloat(formData.depth) || 0).toFixed(2)} m</strong></span>
                </div>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditConditions;