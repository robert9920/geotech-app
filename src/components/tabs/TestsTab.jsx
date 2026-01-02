import React, { useState, useEffect } from 'react';
import { Save, Trash2, Activity, Droplets, Pencil, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, generateId } from '../../db.js'; 

const TestsTab = ({ pointId, projectId }) => {
  const activePointId = pointId; // Fallback para preview
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const navigate = useNavigate();
  
  // --- ESTADOS ---
  const [samplesList, setSamplesList] = useState([]);
  const [hydraulicList, setHydraulicList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formulario Samples
  const [sampleForm, setSampleForm] = useState({
    sample_id: generateId('SAMP'),
    depth: '',
    bottom: '',
    type: 'SPT',
    v_15: '',
    v_30: '',
    v_45: '',
    blows_limit_depth: ''
  });

  // Formulario Hydraulic
  const [hydraulicForm, setHydraulicForm] = useState({
    hydraulic_id: generateId('HYD'),
    depth: '',
    bottom: '',
    K: ''
  });

  const sampleTypes = ['SPT', 'LPT', 'Shelby', 'Cuchara'];

  // --- CARGAR DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    try {
      // Cargar Samples y ordenar por profundidad para asegurar consistencia visual
      const sItems = await db.samples.where('point_id').equals(activePointId).toArray();
      setSamplesList(sItems ? sItems.sort((a, b) => a.depth - b.depth) : []);

      // Cargar Hydraulic
      const hItems = await db.hydraulic_cond.where('point_id').equals(activePointId).toArray();
      setHydraulicList(hItems ? hItems.sort((a, b) => a.depth - b.depth) : []);

    } catch (error) {
      console.error("Error cargando ensayos:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePointId]);

  // --- LÓGICA DE CÁLCULO (MÉTRICAS) ---
  const calculateNValue = (v15, v30, v45) => {
    const v15Val = parseInt(v15) || 0;
    const v30Val = parseInt(v30) || 0;
    const v45Val = parseInt(v45) || 0;

    if (v15Val >= 50) return "R";
    if ((v30Val + v45Val) >= 50) return "R";
    return v30Val + v45Val;
  };

  const calculateRecovery = (depth, bottom) => {
    const d = parseFloat(depth) || 0;
    const b = parseFloat(bottom) || 0;
    return ((d + b) / 2).toFixed(3);
  };

  // Helper para generar descripción de suelo automáticamente
  const generateSoilDescription = (number, depth, bottom, nValue) => {
    return `SPT N°${number}: (${parseFloat(depth).toFixed(2)} m - ${parseFloat(bottom).toFixed(2)} m)\nNSPT = ${nValue}`;
  };

  // --- MANEJADORES DE FORMULARIOS ---
  const handleSampleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setSampleForm({ ...sampleForm, [name]: value });
  };

  const handleHydraulicChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setHydraulicForm({ ...hydraulicForm, [name]: value });
  };

  // --- GUARDAR SAMPLE ---
  const handleSaveSample = async (e) => {
    e.preventDefault();
    if (!sampleForm.depth || !sampleForm.bottom) { alert("Profundidad requerida"); return; }
    if (parseFloat(sampleForm.bottom) <= parseFloat(sampleForm.depth)) { alert("Bottom debe ser mayor a Depth"); return; }

    setLoading(true);
    try {
        // Obtenemos el siguiente número lógicamente basado en la cantidad actual
        const nextNumber = samplesList.length + 1;
        const depthVal = parseFloat(sampleForm.depth);
        const bottomVal = parseFloat(sampleForm.bottom);
        const v15 = parseInt(sampleForm.v_15) || 0;
        const v30 = parseInt(sampleForm.v_30) || 0;
        const v45 = parseInt(sampleForm.v_45) || 0;

        // 1. Guardar en tabla 'samples'
        await db.samples.add({
            ...sampleForm,
            point_id: activePointId,
            depth: depthVal,
            bottom: bottomVal,
            number: nextNumber,
            v_15: v15,
            v_30: v30,
            v_45: v45,
            sync_status: 0
        });

        // 2. Crear registro automático en 'soil_profiles'
        const nValue = calculateNValue(v15, v30, v45);
        const midDepth = (depthVal + bottomVal) / 2;
        const soilDescription = generateSoilDescription(nextNumber, depthVal, bottomVal, nValue);

        await db.soil_profiles.add({
            soil_id: generateId('SOIL'),
            point_id: activePointId,
            depth: midDepth,
            //bottom: bottomVal,
            //graphic: 'CL', // Valor por defecto
            description: soilDescription,
            //unit_summary: '',
            linked_sample_id: sampleForm.sample_id, // Vinculación clave
            sync_status: 0
        });

        await loadData();
        
        setSampleForm({
            sample_id: generateId('SAMP'),
            depth: sampleForm.bottom,
            bottom: '',
            type: sampleForm.type,
            v_15: '', v_30: '', v_45: '',
            blows_limit_depth: ''
        });

    } catch (error) {
        console.error(error);
        alert("Error al guardar muestra");
    } finally {
        setLoading(false);
    }
  };

  // --- GUARDAR HYDRAULIC ---
  const handleSaveHydraulic = async (e) => {
    e.preventDefault();
    if (!hydraulicForm.depth || !hydraulicForm.bottom || !hydraulicForm.K) { alert("Campos incompletos"); return; }
    
    setLoading(true);
    try {
        await db.hydraulic_cond.add({
            ...hydraulicForm,
            point_id: activePointId,
            depth: parseFloat(hydraulicForm.depth),
            bottom: parseFloat(hydraulicForm.bottom),
            K: parseFloat(hydraulicForm.K),
            sync_status: 0
        });

        await loadData();

        setHydraulicForm({
            hydraulic_id: generateId('HYD'),
            depth: hydraulicForm.bottom,
            bottom: '',
            K: ''
        });
    } catch (error) {
        console.error(error);
        alert("Error al guardar permeabilidad");
    } finally {
        setLoading(false);
    }
  };

  // --- ELIMINAR SAMPLE CON TRANSACCIÓN Y SINCRONIZACIÓN DE SUELOS ---
  const handleDeleteSample = async (id, sample_id, deletedNumber) => {
    if(!confirm("¿Eliminar muestra? Se borrará el perfil de suelo asociado y se reordenarán las numeraciones.")) return;
    
    try {
        // Usamos transacción sobre samples y soil_profiles
        await db.transaction('rw', [db.samples, db.soil_profiles], async () => {
            
            // 1. Eliminar el registro de Sample
            await db.samples.delete(id);

            // 2. Eliminar el registro de Soil Profile vinculado (si existe)
            const linkedSoil = await db.soil_profiles.where('linked_sample_id').equals(sample_id).first();
            if (linkedSoil) {
                await db.soil_profiles.delete(linkedSoil.id);
            }

            // 3. Obtener los registros con mayor valor en el campo number
            const subsequentSamples = await db.samples.where('point_id').equals(activePointId).filter(c => c.number > deletedNumber).toArray();

            // 4. Iterando sobre cada sample
                for (const sample of subsequentSamples){
                    await db.samples.update(sample.id, {number: sample.number - 1, sync_status : 0});

                    // Actualizar descripción en Soil Profile vinculado
                    const linkedProf = await db.soil_profiles.where('linked_sample_id').equals(sample.sample_id).first();
                    if (linkedProf) {
                        const nVal = calculateNValue(sample.v_15, sample.v_30, sample.v_45);
                        const newDesc = generateSoilDescription(sample.number-1, sample.depth, sample.bottom, nVal);
                        await db.soil_profiles.update(linkedProf.id, {description: newDesc, sync_status: 0 });
                    }
                }
        });

        // 5. Recargar la interfaz
        await loadData();

    } catch (error) {
        console.error("Error al eliminar/reordenar:", error);
        alert("Ocurrió un error al procesar la eliminación.");
    }
  };

  const handleDeleteHydraulic = async (id) => {
    if(confirm("¿Eliminar ensayo hidráulico?")) {
        await db.hydraulic_cond.delete(id);
        loadData();
    }
  };

  const handleEditSample = (sampleId) => {
    navigate(`/edit-sample/${currentProjectId}/${activePointId}/${sampleId}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* ================= SECCIÓN 1: SAMPLES (Naranja) ================= */}
      <div className="flex flex-col gap-4">
        
        {/* Formulario Samples */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                <Activity size={18} className="text-orange-500"/> Ensayo de Resistencia (SPT/LPT)
            </h3>
            <form onSubmit={handleSaveSample} className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">Depth</label><input name="depth" type="number" step="0.01" value={sampleForm.depth} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs font-bold" placeholder="m" required/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">Bottom</label><input name="bottom" type="number" step="0.01" value={sampleForm.bottom} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs font-bold" placeholder="m" required/></div>
                    <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-500">Type</label>
                        <select name="type" value={sampleForm.type} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs bg-white">
                            {sampleTypes.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {/* Golpes */}
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">V. 15</label><input name="v_15" type="number" value={sampleForm.v_15} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs text-center" placeholder="#"/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">V. 30</label><input name="v_30" type="number" value={sampleForm.v_30} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs text-center" placeholder="#"/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">V. 45</label><input name="v_45" type="number" value={sampleForm.v_45} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs text-center" placeholder="#"/></div>
                    <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-500">Blows Limit</label><input name="blows_limit_depth" type="text" value={sampleForm.blows_limit_depth} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs" placeholder="Opcional"/></div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-2 rounded text-sm font-bold hover:bg-orange-600 shadow-sm flex justify-center gap-2">
                    <Save size={16}/> Guardar Muestra
                </button>
            </form>
        </div>

        {/* Tabla Samples */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="bg-orange-50 p-2 border-b border-orange-100 flex justify-between"><h4 className="font-bold text-xs text-orange-800">Registros ({samplesList.length})</h4></div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Depth</th>
                            <th className="p-2">Bottom</th>
                            <th className="p-2">Recovery (Mid)</th>
                            <th className="p-2 text-center">N Value</th>
                            <th className="p-2">Type</th>
                            <th className="p-2 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {samplesList.map((item) => (
                            <tr key={item.sample_id} className="hover:bg-gray-50">
                                <td className="p-2 font-bold text-gray-400">#{item.number}</td>
                                <td className="p-2 font-medium">{item.depth.toFixed(2)}</td>
                                <td className="p-2 font-medium">{item.bottom.toFixed(2)}</td>
                                <td className="p-2 font-mono text-blue-600 font-bold">{calculateRecovery(item.depth, item.bottom)}</td>
                                <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${calculateNValue(item.v_15, item.v_30, item.v_45) === "R" ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {calculateNValue(item.v_15, item.v_30, item.v_45)}
                                    </span>
                                </td>
                                <td className="p-2">{item.type}</td>
                                <td className="p-2 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEditSample(item.sample_id)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar"><Pencil size={14}/></button>
                                    <button onClick={() => handleDeleteSample(item.id, item.sample_id, item.number)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Eliminar"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                        {samplesList.length === 0 && <tr><td colSpan="7" className="p-4 text-center text-gray-400">Sin registros</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* ================= SECCIÓN 2: HYDRAULIC (Cyan) ================= */}
      <div className="flex flex-col gap-4">
        
        {/* Formulario Hydraulic */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-cyan-500">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                <Droplets size={18} className="text-cyan-500"/> Ensayo de Permeabilidad (Hydraulic)
            </h3>
            <form onSubmit={handleSaveHydraulic} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="text-[10px] font-bold text-gray-500">Depth (m)</label><input name="depth" type="number" step="0.01" value={hydraulicForm.depth} onChange={handleHydraulicChange} className="w-full p-2 border rounded text-xs font-bold" required/></div>
                    <div><label className="text-[10px] font-bold text-gray-500">Bottom (m)</label><input name="bottom" type="number" step="0.01" value={hydraulicForm.bottom} onChange={handleHydraulicChange} className="w-full p-2 border rounded text-xs font-bold" required/></div>
                    <div><label className="text-[10px] font-bold text-gray-500">K (Permeabilidad)</label><input name="K" type="number" step="0.00000001" value={hydraulicForm.K} onChange={handleHydraulicChange} className="w-full p-2 border rounded text-xs" placeholder="e.g. 1.2e-5" required/></div>
                    <button type="submit" disabled={loading} className="bg-cyan-500 text-white py-2 px-4 rounded text-sm font-bold hover:bg-cyan-600 shadow-sm flex items-center justify-center gap-2 h-9">
                        <Save size={16}/> Guardar
                    </button>
                </div>
            </form>
        </div>

        {/* Tabla Hydraulic */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="bg-cyan-50 p-2 border-b border-cyan-100 flex justify-between"><h4 className="font-bold text-xs text-cyan-800">Registros ({hydraulicList.length})</h4></div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-2">Depth</th>
                            <th className="p-2">Bottom</th>
                            <th className="p-2">Longitud</th>
                            <th className="p-2">Valor K</th>
                            <th className="p-2 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {hydraulicList.map((item) => (
                            <tr key={item.hydraulic_id} className="hover:bg-gray-50">
                                <td className="p-2 font-bold text-gray-700">{item.depth.toFixed(2)}</td>
                                <td className="p-2 font-bold text-gray-700">{item.bottom.toFixed(2)}</td>
                                <td className="p-2 text-gray-500">{(item.bottom - item.depth).toFixed(2)} m</td>
                                <td className="p-2 font-mono text-cyan-700">{item.K.toExponential(2)}</td>
                                <td className="p-2 text-right">
                                    <button onClick={() => handleDeleteHydraulic(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                        {hydraulicList.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-400">Sin registros</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TestsTab;