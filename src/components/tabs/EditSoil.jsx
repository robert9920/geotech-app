import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Layers, AlertTriangle } from 'lucide-react';
import { db } from '../../db.js';

const EditSoil = () => {
  const { projectId, pointId, soilId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    depth: '',
    bottom: '',
    graphic: '',
    description: '',
    unit_summary: '',
    soil_id: ''
  });

  const graphicOptions = [
    'GW', 'GP', 'GM', 'GC', 
    'SW', 'SP', 'SM', 'SC', 
    'ML', 'CL', 'OL', 'MH', 'CH', 'OH', 'PT', 'Rock'
  ];

  // --- FUNCIÓN DE NAVEGACIÓN SEGURA ---
  const handleReturn = () => {
    const targetPointId = pointId || formData?.point_id;
    if (targetPointId) {
      const safeId = encodeURIComponent(targetPointId);
      navigate(`/point/${safeId}?tab=soil`, { 
        state: { activeTab: 'soil' },
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
        const data = await db.soil_profiles.where('soil_id').equals(soilId).first();
        if (data) {
          // Bloqueo de seguridad: Si es un registro linkeado, no debería editarse aquí
          if (data.linked_sample_id) {
             alert("Este registro está vinculado a un ensayo y no se puede editar manualmente.");
             handleReturn();
             return;
          }
        setFormData(data);
        } else {
          alert('Estrato no encontrado');
          navigate(-1);
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soilId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Para campos numéricos, evitar negativos
    if (e.target.type === 'number' && value < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depth = parseFloat(formData.depth);
    const bottom = parseFloat(formData.bottom);

    // --- VALIDACIONES ---
    if (isNaN(depth) || isNaN(bottom)) {
        alert("Profundidades inválidas.");
        return;
    }

    if (depth < 0 || bottom < 0) {
        alert("Error: No se permiten valores negativos.");
        return;
    }

    if (bottom <= depth) {
        alert("Error: La profundidad final (Bottom) debe ser mayor que la inicial (Depth).");
        return;
    }

    try {
        await db.soil_profiles.where('soil_id').equals(soilId).modify({
            depth: depth,
            bottom: bottom,
            graphic: formData.graphic,
            description: formData.description,
            unit_summary: formData.unit_summary,
            sync_status: 0
        });

        alert('Estrato actualizado correctamente');
        handleReturn();

    } catch (error) {
        console.error("Error update:", error);
        alert("Error al actualizar.");
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg flex items-center gap-2 justify-center text-green-700">
                    <Layers size={20}/> Editar Estrato
                </h1>
            </div>
            <button type="submit" className="text-green-600 hover:text-green-800 font-bold flex items-center gap-1 bg-green-50 px-3 py-2 rounded-lg transition-colors border border-green-200">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-green-100">
                
                {/* Fila 1: Profundidades */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depth (m)*</label>
                        <input name="depth" type="number" step="0.01" min="0" value={formData.depth} onChange={handleChange} className="w-full p-3 border rounded font-mono font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottom (m)*</label>
                        <input name="bottom" type="number" step="0.01" min="0" value={formData.bottom} onChange={handleChange} className="w-full p-3 border rounded font-mono font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Graphic (USCS)</label>
                        <select name="graphic" value={formData.graphic} onChange={handleChange} className="w-full p-3 border rounded bg-white focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700">
                            {graphicOptions.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit Summary</label>
                        <input name="unit_summary" type="text" value={formData.unit_summary} onChange={handleChange} className="w-full p-3 border rounded focus:ring-2 focus:ring-green-500 outline-none" placeholder="Resumen corto..."/>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción Detallada</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-3 border rounded h-32 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none" placeholder="Descripción litológica completa..."/>
                    </div>
                </div>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditSoil;