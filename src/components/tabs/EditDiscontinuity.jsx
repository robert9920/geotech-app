import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { db } from '../../db.js';

const EditDiscontinuity = () => {
  const { pointId, discontinuityId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);

  // --- OPCIONES ---
  const typeOptions = [
    { code: 'JN', label: 'Junta' }, 
    { code: 'FLT', label: 'Falla' }, 
    { code: 'SH', label: 'Cizalla' }, 
    { code: 'VN', label: 'Vena' }, 
    { code: 'SZ', label: 'Shear Zone' }, 
    { code: 'BC', label: 'Broken Core' }, 
    { code: 'BD', label: 'Estratificación' }, 
    { code: 'FL', label: 'Foliación' }, 
    { code: 'CT', label: 'Contacto' }, 
    { code: 'DK', label: 'Dike' }, 
    { code: 'SL', label: 'Sill' }
  ];
  
  const shapeOptions = [
    { code: 'PL', label: 'Plano' }, 
    { code: 'CU', label: 'Curvo' }, 
    { code: 'IR', label: 'Irregularidad' }, 
    { code: 'ON', label: 'Ondulado' }, 
    { code: 'ES', label: 'Escalonado' }
  ];
  
  const apertureOptions = [
    { val: 0, label: '> 5 mm' }, 
    { val: 1, label: '1 - 5 mm' }, 
    { val: 3, label: '0.1 - 1.0 mm' }, 
    { val: 5, label: '< 0.1 mm' }, 
    { val: 6, label: 'Ninguna' }
  ];
  
  const roughnessOptions = [
    { val: 0, label: 'Suave (pulido, estrías)' }, 
    { val: 1, label: 'Ondulada - O' }, 
    { val: 3, label: 'Ligeramente Rugosa - LR' }, 
    { val: 5, label: 'Rugosa - RU' }, 
    { val: 6, label: 'Muy Rugosa - MR' }
  ];
  
  const weatheringRatingOptions = [
    { val: 0, label: 'Descompuesta' }, 
    { val: 1, label: 'Muy Alterada' }, 
    { val: 3, label: 'Moderadamente Alterada' }, 
    { val: 5, label: 'Ligeramente Alterada' }, 
    { val: 6, label: 'Inalterada' }
  ];
  
  const jcrOptions = [
    { val: 0, label: 'Gouge suave > 5mm espesor o separación > 5mm. Fracturas continuas.' }, 
    { val: 10, label: 'Superficies con estrías de fricción o Gouge < 5mm de espesor. O Sep. = 1-5 mm. Fract. Continuas.' }, 
    { val: 20, label: 'Superficies ligeramente rugosas, separación < 1mm, superficies altamente alteradas.' }, 
    { val: 25, label: 'Superficies ligeramente rugosas, separación < 1mm, superficies ligeramente alteradas.' }, 
    { val: 30, label: 'Superficies muy rugosas, fracturas no continuas, sin separación, inalteradas.' }
  ];
  
  const conditionOptions = [
    { val: 0, label: 'Blando, > 5mm' }, 
    { val: 2, label: 'Blando, < 5mm o Duro, > 5mm' }, 
    { val: 4, label: 'Duro, < 5mm' }, 
    { val: 6, label: 'Ninguna' }
  ];
  
  const jrOptions = [
    { val: 0.5, label: 'Estrías de fricción' }, 
    { val: 1, label: 'Plano / liso / rellenado' }, 
    { val: 1.5, label: 'Plano y Rugoso' }, 
    { val: 2, label: 'Ondulado y Liso' }, 
    { val: 3, label: 'Ondulado y Rugoso' }
  ];
  
  const jaOptions = [
    { val: 0.75, label: 'Fracturas cerradas - Sin Relleno' }, 
    { val: 1, label: 'Solo Oxidación - Sin Relleno' }, 
    { val: 2, label: 'Lig. Alteradas - Sin Relleno' }, 
    { val: 3, label: 'Películas de Limo/arena - Sin Relleno' }, 
    { val: 4, label: 'Película de arcilla - Sin Relleno o Arena / Roca triturada - Con Relleno' }, 
    { val: 6, label: 'Arcilla Dura < 5mm - Con Relleno' }, 
    { val: 8, label: 'Arcilla Suave < 5mm - Con Relleno' }, 
    { val: 10, label: 'Arcilla Dura > 5mm - Con Relleno' }, 
    { val: 12, label: 'Arcilla Expansiva < 5mm - Con Relleno' }, 
    { val: 15, label: 'Arcilla Suave > 5mm - Con Relleno' }, 
    { val: 20, label: 'Arcilla Expansiva > 5mm - Con Relleno' }
  ];
  
  const jnSetOptions = [
    { val: 0.5, label: 'Masivo' }, 
    { val: 2, label: 'Un solo sistema' }, 
    { val: 3, label: 'Un sistema + aleatorio' }, 
    { val: 4, label: 'Dos sistemas' }, 
    { val: 6, label: 'Dos sistemas + aleatorio' }, 
    { val: 12, label: 'Tres sistemas + aleatorio' }, 
    { val: 15, label: 'Cuatro sistemas o más' }, 
    { val: 20, label: 'Broken Core' }
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
      navigate(`/point/${safeId}?tab=discontinuity`, { 
        state: { activeTab: 'discontinuity' },
        replace: true 
      });
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            const item = await db.discontinuities.where('discontinuity_id').equals(discontinuityId).first();
            if(item) {
                setFormData(item);
            } else {
                console.warn("Discontinuidad no encontrada, regresando...");
                // Intentamos volver, aunque sin datos cargados dependemos 100% de la URL
                if (pointId) {
                   const safeId = encodeURIComponent(pointId);
                   navigate(`/point/${safeId}?tab=discontinuity`, { replace: true });
                } else {
                   navigate(-1);
                }
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
            // En caso de error, intentamos volver
            if (pointId) navigate(`/point/${encodeURIComponent(pointId)}?tab=discontinuity`);
        } finally {
            setLoading(false);
        }
    };
    if (discontinuityId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discontinuityId]); 

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.depth) { alert('Profundidad requerida'); return; }

    try {
        await db.discontinuities.update(formData.id, {
            ...formData,
            depth: parseFloat(formData.depth),
            dip: parseInt(formData.dip) || 0,
            aperture: parseInt(formData.aperture),
            roughness_rating: parseInt(formData.roughness_rating),
            weathering_rating: parseInt(formData.weathering_rating),
            jcr: parseInt(formData.jcr),
            condition_discon: parseInt(formData.condition_discon),
            jr_roughness: parseFloat(formData.jr_roughness),
            ja_alteration: parseFloat(formData.ja_alteration),
            sync_status: 0
        });
        
        // --- AQUÍ ESTÁ EL MENSAJE DE CONFIRMACIÓN ---
        alert('Discontinuidad actualizada correctamente');
        
        handleReturn();
    } catch (error) {
        console.error(error);
        alert('Error al actualizar');
    }
  };

  if (loading || !formData) return <div className="p-10 text-center text-gray-500">Cargando datos...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white p-4 shadow-sm flex justify-between border-b sticky top-0 z-20">
        <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
            <X size={24}/> <span className="text-lg">Cancelar</span>
        </button>
        <h1 className="font-bold text-xl flex items-center">Editar Discontinuidad</h1>
        <button onClick={handleSubmit} className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Save size={20}/> Actualizar
        </button>
      </header>

      <div className="p-4 md:p-6 flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-10">
            
            {/* Datos Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Depth (m)</label>
                    <input 
                        name="depth" 
                        type="number" 
                        step="0.01" 
                        value={formData.depth} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-gray-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base" 
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Dip (°)</label>
                    <input 
                        name="dip" 
                        type="number" 
                        value={formData.dip} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    />
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Type</label>
                    <select 
                        name="type" 
                        value={formData.type} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    >
                        {typeOptions.map(o=><option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Shape</label>
                    <select 
                        name="shape" 
                        value={formData.shape} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    >
                        {shapeOptions.map(o=><option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* RMR Characterization */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-5">
                <h4 className="text-base font-bold text-gray-800 border-b pb-2">Caracterización RMR / Q</h4>
                
                {/* 1 Columna para asegurar que el texto largo se lea completo */}
                <div className="grid grid-cols-1 gap-5">
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Aperture</label>
                        <select name="aperture" value={formData.aperture} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {apertureOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Roughness Rating</label>
                        <select name="roughness_rating" value={formData.roughness_rating} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {roughnessOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Weathering Rating</label>
                        <select name="weathering_rating" value={formData.weathering_rating} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {weatheringRatingOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">JCR (Joint Condition Rating)</label>
                        <select name="jcr" value={formData.jcr} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {jcrOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Condition</label>
                        <select name="condition_discon" value={formData.condition_discon} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {conditionOptions.map((o,i)=><option key={i} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                </div>
                
                {/* Q-Barton Params */}
                <div className="grid grid-cols-1 gap-5 pt-4 border-t border-gray-200 mt-2">
                    <div>
                        <label className="text-sm font-bold text-purple-700 block mb-1">Jr (Roughness)</label>
                        <select name="jr_roughness" value={formData.jr_roughness} onChange={handleChange} className="w-full p-3 border border-purple-200 bg-purple-50 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                            {jrOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-purple-700 block mb-1">Ja (Alteration)</label>
                        <select name="ja_alteration" value={formData.ja_alteration} onChange={handleChange} className="w-full p-3 border border-purple-200 bg-purple-50 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                            {jaOptions.map((o,i)=><option key={i} value={o.val}>{o.label} ({o.val})</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EditDiscontinuity;