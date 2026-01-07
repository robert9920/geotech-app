import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Activity } from 'lucide-react';
import { db } from '../../db.js';

const EditSample = () => {
  const { activePointId, sampleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const sampleTypes = ['SPT', 'LPT', 'Shelby', 'CP'];

  useEffect(() => {
    const loadData = async () => {
      try {
        const item = await db.samples.where('sample_id').equals(sampleId).first();
        if (item) setFormData(item);
        else { alert("Muestra no encontrada"); handleReturn(); }
      } catch (error) { console.error(error); handleReturn(); } 
      finally { setLoading(false); }
    };
    if (sampleId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId]);

  const handleReturn = () => {
    const safePointId = activePointId || formData?.point_id;
    if (safePointId) navigate(`/point/${encodeURIComponent(safePointId)}?tab=tests`, { state: { activeTab: 'tests' }, replace: true });
    else navigate(-1);
  };

  const calculateNValue = (v15, v30, v45) => {
    const v15Val = parseInt(v15) || 0;
    const v30Val = parseInt(v30) || 0;
    const v45Val = parseInt(v45) || 0;
    if (v15Val >= 50) return "R";
    if ((v30Val + v45Val) >= 50) return "R";
    return v30Val + v45Val;
  };

  const generateSoilDescription = (number, depth, bottom, nValue) => {
    return `SPT N°${number}: (${parseFloat(depth).toFixed(2)} m - ${parseFloat(bottom).toFixed(2)} m)\nNSPT = ${nValue}`;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depthVal = parseFloat(formData.depth);
    const bottomVal = parseFloat(formData.bottom);

    // Validaciones
    if (depthVal === '' || bottomVal === '') { alert("Profundidad requerida"); return; }
    if (bottomVal < depthVal) { alert("Bottom debe ser mayor a Depth"); return; }


    //if (!formData.depth || !formData.bottom) { alert("Profundidad requerida"); return; }
    //if (parseFloat(formData.bottom) <= parseFloat(formData.depth)) { alert("Bottom debe ser mayor a Depth"); return; }

    try {
      await db.transaction('rw', [db.samples, db.soil_profiles], async () => {
          // 1. Actualizar Sample
          
          await db.samples.update(formData.id, {
            ...formData,
            depth: depthVal,
            bottom: bottomVal,
            v_15: parseInt(formData.v_15) || 0,
            v_30: parseInt(formData.v_30) || 0,
            v_45: parseInt(formData.v_45) || 0,
            sync_status: 0
          });

          // 3. Actualizar Soil Profile vinculado
          const linkedProf = await db.soil_profiles.where('linked_sample_id').equals(formData.sample_id).first();
          if(linkedProf) {
            const nVal = calculateNValue(formData.v_15, formData.v_30, formData.v_45);
            const newDesc = generateSoilDescription(formData.number, depthVal, bottomVal, nVal);
            await db.soil_profiles.where('linked_sample_id').equals(formData.sample_id).modify({
              depth: (depthVal + bottomVal)/2,
              description: newDesc,
              sync_status: 0
            })

          // 2. Reordenar y Actualizar numeración (si cambió profundidad)
          //const allSamples = await db.samples.where('point_id').equals(pointId).toArray();
          //allSamples.sort((a, b) => a.depth - b.depth);

          //for(let i=0; i<allSamples.length; i++) {
          //    const s = allSamples[i];
          //    const newNumber = i + 1;
              
              // Actualizar sample si cambió número o es el actual editado
          //    if(s.number !== newNumber || s.sample_id === formData.sample_id) {
          //       await db.samples.update(s.sample_id, { number: newNumber });
                 
                 // 3. Actualizar Soil Profile vinculado
          //       const linkedProf = await db.soil_profiles.where('linked_sample_id').equals(s.sample_id).first();
          //       if(linkedProf) {
          //          const nVal = calculateNValue(s.v_15, s.v_30, s.v_45);
          //          const newDesc = generateSoilDescription(newNumber, s.depth, s.bottom, nVal);
                    
                    // Solo si es el sample que estamos editando actualmente, actualizamos también Depth/Bottom
          //          const updateData = { description: newDesc, sync_status: 0 };
          //          if (s.sample_id === formData.sample_id) {
          //              updateData.depth = (depthVal + bottomVal) / 2;
          //              updateData.bottom = bottomVal;
          //          }

          //          await db.soil_profiles.update(linkedProf.soil_id, updateData);
          //       }
          //    }
          }
      });

      alert('Actualizado correctamente');
      handleReturn();
    } catch (error) { console.error(error); alert('Error al actualizar'); }
  };

  if (loading || !formData) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white p-4 shadow-sm flex justify-between border-b sticky top-0 z-20">
        <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"><X size={24}/> Cancelar</button>
        <h1 className="font-bold text-xl flex items-center gap-2 text-orange-600"><Activity size={24}/> Editar Muestra</h1>
        <button onClick={handleSubmit} className="text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"><Save size={20}/> Actualizar</button>
      </header>
      <div className="p-4 md:p-6 flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-orange-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label className="text-sm font-bold text-gray-500 block mb-1">Depth (m)</label><input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-3 border rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none" required/></div>
                <div><label className="text-sm font-bold text-gray-500 block mb-1">Bottom (m)</label><input name="bottom" type="number" step="0.01" value={formData.bottom} onChange={handleChange} className="w-full p-3 border rounded-lg font-bold focus:ring-2 focus:ring-orange-500 outline-none" required/></div>
            </div>
            <div className="mb-6"><label className="text-sm font-bold text-gray-500 block mb-1">Type</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">{sampleTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                <h4 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">Registro de Golpes</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 block mb-1 text-center">V. 15</label><input name="v_15" type="number" value={formData.v_15} onChange={handleChange} className="w-full p-3 border rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 outline-none"/></div>
                    <div><label className="text-xs font-bold text-gray-500 block mb-1 text-center">V. 30</label><input name="v_30" type="number" value={formData.v_30} onChange={handleChange} className="w-full p-3 border rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 outline-none"/></div>
                    <div><label className="text-xs font-bold text-gray-500 block mb-1 text-center">V. 45</label><input name="v_45" type="number" value={formData.v_45} onChange={handleChange} className="w-full p-3 border rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 outline-none"/></div>
                </div>
            </div>
            <div><label className="text-sm font-bold text-gray-500 block mb-1">Blows Limit</label><input name="blows_limit_depth" type="text" value={formData.blows_limit_depth} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"/></div>
        </form>
      </div>
    </div>
  );
};

export default EditSample;