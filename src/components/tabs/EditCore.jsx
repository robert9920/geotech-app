import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Calculator, AlertTriangle } from 'lucide-react';
import { db } from '../../db.js';

const EditCore = () => {
  const { projectId, pointId, coreId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    depth: '',
    bottom: '',
    tcr_length: '',
    rqd_length: '',
    jn: 0.5,
    run_number: 0,
    core_id: ''
  });

  const jnOptions = [
    { label: 'Masivo', value: 0.5 },
    { label: 'Un solo sistema', value: 2 },
    { label: 'Un sistema + aleatorio', value: 3 },
    { label: 'Dos sistemas', value: 4 },
    { label: 'Dos sistemas + aleatorio', value: 6 },
    { label: 'Tres sistemas', value: 9 },
    { label: 'Tres sistemas + aleatorio', value: 12 },
    { label: 'Cuatro sistemas o más', value: 15 },
    { label: 'Broken Core', value: 20 }
  ];

    // --- FUNCIÓN DE NAVEGACIÓN SEGURA ---
  const handleReturn = () => {
    // 1. Intentamos obtener el ID del punto desde la URL (useParams).
    // 2. Si no está en la URL, intentamos obtenerlo de los datos cargados (formData).
    const targetPointId = pointId || formData?.point_id;

    if (targetPointId) {
      // Usamos encodeURIComponent por seguridad si el nombre tiene espacios
      const safeId = encodeURIComponent(targetPointId);
      
      // Navegamos usando 'discontinuity' (singular) como indicaste que funciona
      navigate(`/point/${safeId}?tab=core`, { 
        state: { activeTab: 'core' },
        replace: true 
      });
    } else {
      navigate(-1);
    }
  };

  // 1. Cargar datos del Core
  useEffect(() => {
    const loadCore = async () => {
      try {
        const data = await db.cores.where('core_id').equals(coreId).first();
        if (data) {
          setFormData(data);
        } else {
          alert('Core no encontrado');
          navigate(-1); // Regresar si no existe
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    loadCore();
  }, [coreId, navigate]);

  // Cálculos visuales (TCR/RQD %) en tiempo real
  const runLength = (parseFloat(formData.bottom) - parseFloat(formData.depth)) || 0;
  
  const calculatePercentage = (length) => {
      if (runLength <= 0) return 0;
      const val = parseFloat(length) || 0;
      return ((val / runLength) * 100).toFixed(0);
  };

  const tcrPct = calculatePercentage(formData.tcr_length);
  const rqdPct = calculatePercentage(formData.rqd_length);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // REGLA: No permitir valores negativos
    if (e.target.type === 'number' && value < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depth = parseFloat(formData.depth);
    const bottom = parseFloat(formData.bottom);
    const tcr = parseFloat(formData.tcr_length) || 0;
    const rqd = parseFloat(formData.rqd_length) || 0;
    const currentRunLength = bottom - depth;

    // --- VALIDACIONES ---
    if (depth < 0 || bottom < 0 || tcr < 0 || rqd < 0) {
        alert("Error: No se permiten valores negativos.");
        return;
    }

    if (bottom <= depth) {
        alert("Error: La profundidad final (Bottom) debe ser mayor que la inicial (Depth).");
        return;
    }

    // Validación lógica de longitudes con tolerancia
    if (tcr > (currentRunLength + 0.001)) {
        alert(`Error Lógico: El TCR (${tcr}m) no puede ser mayor a la longitud del Core (${currentRunLength.toFixed(2)}m).`);
        return;
    }

    if (rqd > (currentRunLength + 0.001)) {
        alert(`Error Lógico: El RQD (${rqd}m) no puede ser mayor a la longitud del Core (${currentRunLength.toFixed(2)}m).`);
        return;
    }

    if (rqd > tcr) {
        alert(`Advertencia: El RQD (${rqd}m) usualmente no debería ser mayor que el TCR (${tcr}m).`);
    }

    try {
        // Actualizar registro
        // Usamos modify para asegurar que solo actualizamos los campos deseados
        await db.cores.where('core_id').equals(coreId).modify({
            depth: depth,
            bottom: bottom,
            tcr_length: tcr,
            rqd_length: rqd,
            jn: parseFloat(formData.jn),
            sync_status: 0 // Marcar como pendiente de sincronización tras editar
        });

        alert('Maniobra actualizada correctamente');

        handleReturn();

        // navigate(-1); // Regresar al historial anterior (Dashboard) para evitar bucles

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
            <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg">Editar Core #{formData.run_number}</h1>
                <p className="text-xs text-gray-400">ID: {formData.core_id}</p>
            </div>
            <button type="submit" className="text-blue-600 font-bold flex items-center gap-1">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-sm">
                
                {/* Fila 1: Profundidades */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depth (m)</label>
                        <input name="depth" type="number" step="0.01" min="0" value={formData.depth} onChange={handleChange} className="w-full p-3 border rounded font-mono font-bold text-lg" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottom (m)</label>
                        <input name="bottom" type="number" step="0.01" min="0" value={formData.bottom} onChange={handleChange} className="w-full p-3 border rounded font-mono font-bold text-lg" required />
                    </div>
                </div>

                {/* Info Visual de Longitud */}
                <div className="bg-blue-50 p-2 rounded mb-4 text-center text-sm text-blue-800 font-medium">
                    Longitud de Maniobra: {runLength.toFixed(2)} m
                </div>

                {/* Fila 2: Longitudes y Métricas */}
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-600">TCR Length (m)</label>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${tcrPct > 100 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {tcrPct}% Recuperación
                            </span>
                        </div>
                        <input name="tcr_length" type="number" step="0.01" min="0" value={formData.tcr_length} onChange={handleChange} className="w-full p-2 border rounded font-bold" />
                    </div>

                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-600">RQD Length (m)</label>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${rqdPct < 25 ? 'bg-red-100 text-red-600' : rqdPct < 50 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {rqdPct}% Calidad
                            </span>
                        </div>
                        <input name="rqd_length" type="number" step="0.01" min="0" value={formData.rqd_length} onChange={handleChange} className="w-full p-2 border rounded font-bold" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jn (Junturas)</label>
                        <select name="jn" value={formData.jn} onChange={handleChange} className="w-full p-3 border rounded bg-white">
                            {jnOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label} ({opt.value})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditCore;