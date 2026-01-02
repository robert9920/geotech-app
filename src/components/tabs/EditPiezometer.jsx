import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Activity, Droplet } from 'lucide-react';
import { db } from '../../db.js';

const EditPiezometer = () => {
  const { projectId, pointId, piezometerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    piezometer_id: '',
    depth: '',
    bottom: '',
    prof_piezo: '',
    graphic: 'Standpipe',
    name: '',
    therm_node_num: '',
    lines: false,
    color: '#4F46E5',
    description: ''
  });

  // --- FUNCIÓN DE NAVEGACIÓN SEGURA ---
  const handleReturn = () => {
    const targetPointId = pointId || formData?.point_id;
    if (targetPointId) {
      const safeId = encodeURIComponent(targetPointId);
      // Asumimos que el tab en el Dashboard se llama 'piezometer' (singular o plural según tu config)
      // Ajusta 'piezometer' si tu tab key es diferente
      navigate(`/point/${safeId}?tab=piezometer`, { 
        state: { activeTab: 'piezometer' },
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
        const data = await db.piezometers.where('piezometer_id').equals(piezometerId).first();
        if (data) {
          setFormData(data);
        } else {
          alert('Piezómetro no encontrado');
          navigate(-1);
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    // Simulamos un ID si no existe para que la preview cargue
    if (piezometerId || true) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezometerId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number' && parseFloat(value) < 0) return;

    // Manejo especial para el select booleano simulado (si usas <select>)
    if (name === 'lines') {
        setFormData({ ...formData, [name]: value === 'true' });
        return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depth = parseFloat(formData.depth);
    const bottom = parseFloat(formData.bottom);
    const profPiezo = parseFloat(formData.prof_piezo);

    // --- VALIDACIONES ---
    if (isNaN(depth) || isNaN(bottom)) {
        alert("Las profundidades (Depth y Bottom) son requeridas.");
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
        await db.piezometers.update(formData.id, {
            ...formData,
            depth: depth,
            bottom: bottom,
            prof_piezo: isNaN(profPiezo) ? 0 : profPiezo,
            therm_node_num: parseInt(formData.therm_node_num) || 0,
            sync_status: 0
        });

        alert('Piezómetro actualizado correctamente');
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
                <h1 className="font-bold text-lg flex items-center gap-2 justify-center text-indigo-700">
                    <Activity size={20}/> Editar Piezómetro
                </h1>
                <p className="text-xs text-gray-400 font-mono">{formData.name || 'Sin Nombre'}</p>
            </div>
            <button type="submit" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-indigo-200">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-indigo-100 space-y-6">
                
                {/* Sección 1: Geometría */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2 flex items-center gap-2">
                        <Droplet size={16}/> Geometría e Instalación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Depth (m)</label>
                            <input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-2 border rounded font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Bottom (m)</label>
                            <input name="bottom" type="number" step="0.01" value={formData.bottom} onChange={handleChange} className="w-full p-2 border rounded font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Prof. Piezo (m)</label>
                            <input name="prof_piezo" type="number" step="0.01" value={formData.prof_piezo} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Sección 2: Identificación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Nombre / ID</label>
                        <input name="name" type="text" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Tipo Gráfico</label>
                        <input name="graphic" type="text" value={formData.graphic} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                {/* Sección 3: Configuración Avanzada */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Therm Node #</label>
                        <input name="therm_node_num" type="number" value={formData.therm_node_num} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Líneas (Lines)</label>
                        <select name="lines" value={formData.lines ? 'true' : 'false'} onChange={handleChange} className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="false">NO</option>
                            <option value="true">YES</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Color Representativo</label>
                        <div className="flex gap-2">
                            <input name="color" type="color" value={formData.color} onChange={handleChange} className="h-10 w-12 p-1 border rounded cursor-pointer"/>
                            <input name="color" type="text" value={formData.color} onChange={handleChange} className="w-full p-2 border rounded text-xs uppercase focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Sección 4: Descripción */}
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Descripción</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded h-24 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Detalles adicionales..."/>
                </div>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditPiezometer;