import React, { useState, useEffect } from 'react';
import { Save, Trash2, Activity, AlertCircle, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, generateId } from '../../db.js';

const DiscontinuityTab = ({ pointId, projectId }) => {
  const [list, setList] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const navigate = useNavigate();

  // --- DEFINICIÓN DE OPCIONES (DROPDOWNS) ---
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
    { val: 10, label: 'Superficies con estrías de fricción o Gouge < 5mm de espesor. O Sep. = 1-5 mm. Fract. Continuas' },
    { val: 20, label: 'Superficies ligeramente rugosas, separación < 1mm, superficies altamente alteradas' },
    { val: 25, label: 'Superficies ligeramente rugosas, separación < 1mm, superficies ligeramente alteradas' },
    { val: 30, label: 'Superficies muy rugosas, fracturas no continuas, sin separación, inalteradas' }
  ];

  const conditionOptions = [
    { val: 0, label: 'Blando, > 5mm' },
    { val: 2, label: 'Blando, < 5mm o Duro, > 5mm' },
    //{ val: 2, label: 'Duro, > 5mm' }, // Ojo: valor repetido intencional
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
    //{ val: 4, label: 'Arena / Roca triturada - Con Relleno' }, // Valor repetido intencional
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

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    discontinuity_id: generateId('DISC'),
    depth: '',
    type: 'JN',
    dip: '',
    shape: 'PL',
    aperture: 0,
    roughness_rating: 0,
    weathering_rating: 0,
    jcr: 0,
    condition_discon: 0,
    jr_roughness: 0.5,
    ja_alteration: 0.75,
  });

  const loadData = async () => {
    if (!pointId) return;
    if (!currentProjectId) {
        const pt = await db.points.where('point_id').equals(pointId).first();
        if (pt) setCurrentProjectId(pt.project_id);
    }
    const items = await db.discontinuities.where('point_id').equals(pointId).toArray();
    setList(items.sort((a, b) => a.depth - b.depth));
  };

  useEffect(() => {
    loadData();
  }, [pointId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // Si es number/select numérico, parseamos
    if (type === 'number' && parseFloat(value) < 0) return;
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.depth) { alert('Ingrese profundidad'); return; }

    try {
        let finalId = formData.discontinuity_id;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const count = await db.discontinuities.where('discontinuity_id').equals(finalId).count();
            if (count === 0) isUnique = true;
            else {
                finalId = generateId('DISC');
                attempts++;
            }
        }

        if (!isUnique) { alert("Error de ID. Intente de nuevo."); return; }

        await db.discontinuities.add({
            ...formData,
            discontinuity_id: finalId,
            point_id: pointId,
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

        await loadData();
        
        // Reset (mantiene última profundidad para facilitar ingreso secuencial)
        setFormData({
            ...formData,
            discontinuity_id: generateId('DISC'),
            depth: '', // Opcional: mantener formData.depth si son muy seguidas
            dip: ''
        });

    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    }
  };

  const handleDelete = async (id) => {
      if(!confirm("¿Eliminar registro?")) return;
      await db.discontinuities.delete(id);
      loadData();
  };

  return (
    // FIX DE DISEÑO: Quitamos 'h-full', agregamos 'gap-4 pb-10' para scroll natural
    <div className="flex flex-col gap-4 pb-10">
      
      {/* FORMULARIO */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-600">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Activity size={18} className="text-purple-600"/> Nueva Discontinuidad
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fila 1: Básicos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs font-bold text-gray-500">Depth (m)*</label><input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-2 border rounded font-bold" required/></div>
                <div><label className="text-xs font-bold text-gray-500">Dip (°)*</label><input name="dip" type="number" value={formData.dip} onChange={handleChange} className="w-full p-2 border rounded" required/></div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded bg-white">{typeOptions.map(o=><option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}</select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Shape</label>
                    <select name="shape" value={formData.shape} onChange={handleChange} className="w-full p-2 border rounded bg-white">{shapeOptions.map(o=><option key={o.code} value={o.code}>{o.code} - {o.label}</option>)}</select>
                </div>
            </div>

            {/* Fila 2: RMR Parte 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-2 rounded">
                <div>
                    <label className="text-xs font-bold text-gray-500">Aperture</label>
                    <select name="aperture" value={formData.aperture} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{apertureOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Roughness Rating</label>
                    <select name="roughness_rating" value={formData.roughness_rating} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{roughnessOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Weathering Rating</label>
                    <select name="weathering_rating" value={formData.weathering_rating} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{weatheringRatingOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
            </div>

            {/* Fila 3: RMR Parte 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-gray-500">JCR (Relleno)</label>
                    <select name="jcr" value={formData.jcr} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{jcrOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Condition Discon</label>
                    <select name="condition_discon" value={formData.condition_discon} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{conditionOptions.map((o, i)=><option key={i} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
            </div>

            {/* Fila 4: Q-Barton (Jr, Ja, Jn) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-purple-50 p-2 rounded">
                <div>
                    <label className="text-xs font-bold text-purple-700">Jr (Roughness)</label>
                    <select name="jr_roughness" value={formData.jr_roughness} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{jrOptions.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
                <div>
                    <label className="text-xs font-bold text-purple-700">Ja (Alteration)</label>
                    <select name="ja_alteration" value={formData.ja_alteration} onChange={handleChange} className="w-full p-2 border rounded bg-white text-xs">{jaOptions.map((o, i)=><option key={i} value={o.val}>{o.label} ({o.val})</option>)}</select>
                </div>
            </div>

            <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded font-bold hover:bg-purple-700 shadow-md">
                <Save size={18} className="inline mr-2"/> Guardar Discontinuidad
            </button>
        </form>
      </div>

      {/* LISTA: Eliminado flex-1 y overflow-hidden del padre para permitir crecimiento */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
         <div className="bg-gray-100 p-2 border-b"><h4 className="font-bold text-xs text-gray-600">Registros ({list.length})</h4></div>
         
         {/* Solo overflow-x-auto para scroll horizontal si es necesario */}
         <div className="overflow-x-auto">
             <table className="w-full text-xs text-left">
                <thead className="text-gray-500 bg-gray-50 sticky top-0">
                    <tr>
                        <th className="p-2">Prof</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Dip</th>
                        <th className="p-2">Jr</th>
                        <th className="p-2">Ja</th>
                        <th className="p-2 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {list.map(item => (
                        <tr key={item.id} className="hover:bg-purple-50">
                            <td className="p-2 font-bold">{item.depth.toFixed(2)}</td>
                            <td className="p-2"><span className="bg-purple-100 px-1 rounded">{item.type}</span></td>
                            <td className="p-2">{item.dip}°</td>
                            <td className="p-2">{item.jr_roughness}</td>
                            <td className="p-2">{item.ja_alteration}</td>
                            <td className="p-2 text-right flex justify-end gap-2">
                                <button onClick={() => navigate(`/edit-discontinuity/${currentProjectId}/${pointId}/${item.discontinuity_id}`)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Pencil size={14}/></button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {list.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-gray-400">Sin datos.</td></tr>}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default DiscontinuityTab;