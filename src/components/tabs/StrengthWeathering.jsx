import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Hammer } from 'lucide-react';
import { db, generateId } from '../../db.js';

const StrengthWeathering = () => {
  const { projectId, pointId, coreId } = useParams();
  const navigate = useNavigate();
  
  // Valores posibles para Strength (R0-R6)
  const strengthOptions = [
    { label: 'R0 - Extremadamente débil', val: 0 },
    { label: 'R1 - Muy débil', val: 1 },
    { label: 'R2 - Débil', val: 2 },
    { label: 'R3 - Media', val: 3 },
    { label: 'R4 - Fuerte', val: 4 },
    { label: 'R5 - Muy fuerte', val: 5 },
    { label: 'R6 - Extremadamente fuerte', val: 6 }
  ];

  // Valores posibles para Weathering (W0-W6)
  // CAMBIO 2: Se añade W0
  const weatheringOptions = [
    { label: 'W0 - Sana / Sin meteorización', val: 0 }, // Nueva opción
    { label: 'W1 - Fresca', val: 1 },
    { label: 'W2 - Ligeramente meteorizada', val: 2 },
    { label: 'W3 - Moderadamente meteorizada', val: 3 },
    { label: 'W4 - Altamente meteorizada', val: 4 },
    { label: 'W5 - Completamente meteorizada', val: 5 },
    { label: 'W6 - Suelo residual', val: 6 }
  ];

  const [formData, setFormData] = useState({
    strength_id: generateId('STR'),
    core_id: coreId,
    strength_v1: '',
    strength_v2: '',
    weathering_v1: '',
    weathering_v2: '',
    strength_index: 0,
    weathering_index: 0
  });

  const [coreInfo, setCoreInfo] = useState(null);

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

  // 1. Cargar datos
  useEffect(() => {
    const init = async () => {
      const core = await db.cores.where('core_id').equals(coreId).first();
      setCoreInfo(core);

      const existing = await db.strength_weathering.where('core_id').equals(coreId).first();
      if (existing) {
        setFormData(prev => ({...prev, ...existing}));
      }
    };
    init();
  }, [coreId]);

  const getVal = (str, options) => options.find(o => o.label === str)?.val;

  // 2. Calcular índices
  useEffect(() => {
    const s1 = getVal(formData.strength_v1, strengthOptions);
    const s2 = getVal(formData.strength_v2, strengthOptions);
    const sIdx = (s1 !== undefined && s2 !== undefined) ? (s1 + s2) / 2 : 0;

    const w1 = getVal(formData.weathering_v1, weatheringOptions);
    const w2 = getVal(formData.weathering_v2, weatheringOptions);
    const wIdx = (w1 !== undefined && w2 !== undefined) ? (w1 + w2) / 2 : 0;
    
    setFormData(prev => ({
      ...prev,
      strength_index: sIdx,
      weathering_index: wIdx
    }));
  }, [formData.strength_v1, formData.strength_v2, formData.weathering_v1, formData.weathering_v2]);

  const getFilteredOptions = (v1Value, allOptions) => {
    if (!v1Value) return allOptions;
    const v1Num = allOptions.find(o => o.label === v1Value)?.val;
    if (v1Num === undefined) return allOptions;

    return allOptions.filter(o => Math.abs(o.val - v1Num) <= 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'strength_v1') {
        setFormData(prev => ({ ...prev, [name]: value, strength_v2: '' }));
    } else if (name === 'weathering_v1') {
        setFormData(prev => ({ ...prev, [name]: value, weathering_v2: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { strength_index, weathering_index, ...dataToSave } = formData;

      await db.strength_weathering.put({
        ...dataToSave,
        sync_status: 0
      });
      alert('Datos guardados correctamente.');
      handleReturn();
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    }
  };

  if (!coreInfo) return <div className="p-10">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center gap-3 border-b sticky top-0 z-10">
        <button onClick={handleReturn} className="text-gray-600"><ArrowLeft/></button>
        <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
                <Hammer size={20} className="text-blue-600"/> Resistencia & Meteorización
            </h1>
            <p className="text-xs text-gray-500">Core: {coreInfo.depth} - {coreInfo.bottom}m (ID: {coreInfo.core_id})</p>
        </div>
      </header>

      <div className="p-4 flex-1 overflow-auto">
        {/* CAMBIO 1: max-w-4xl para hacer el formulario más ancho */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            
            {/* CARD RESISTENCIA */}
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Resistencia (Strength)</h3>
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg font-bold border border-orange-200 text-lg">
                        Index: {formData.strength_index}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Rango 1 (V1)</label>
                        <select name="strength_v1" value={formData.strength_v1} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white text-gray-700 text-base" required>
                            <option value="">Seleccione...</option>
                            {strengthOptions.map(o => <option key={o.val} value={o.label}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Rango 2 (V2) [V1 ± 1]</label>
                        <select name="strength_v2" value={formData.strength_v2} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white text-gray-700 text-base" required disabled={!formData.strength_v1}>
                            <option value="">Seleccione...</option>
                            {getFilteredOptions(formData.strength_v1, strengthOptions).map(o => (
                                <option key={o.val} value={o.label}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* CARD METEORIZACIÓN */}
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Meteorización (Weathering)</h3>
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold border border-green-200 text-lg">
                        Index: {formData.weathering_index}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Rango 1 (V1)</label>
                        <select name="weathering_v1" value={formData.weathering_v1} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white text-gray-700 text-base" required>
                            <option value="">Seleccione...</option>
                            {weatheringOptions.map(o => <option key={o.val} value={o.label}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Rango 2 (V2) [V1 ± 1]</label>
                        <select name="weathering_v2" value={formData.weathering_v2} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white text-gray-700 text-base" required disabled={!formData.weathering_v1}>
                            <option value="">Seleccione...</option>
                            {getFilteredOptions(formData.weathering_v1, weatheringOptions).map(o => (
                                <option key={o.val} value={o.label}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 shadow-md flex justify-center items-center gap-2 text-xl transition-transform active:scale-95">
                <Save size={24}/> Guardar Datos
            </button>

        </form>
      </div>
    </div>
  );
};

export default StrengthWeathering;