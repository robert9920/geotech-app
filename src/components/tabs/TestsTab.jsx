import React, { useState, useEffect } from 'react';
import { Save, Trash2, Activity, Droplets, Pencil, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, generateId } from '../../db.js'; 

const TestsTab = ({ pointId, projectId }) => {
  const activePointId = pointId;
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
    K: '',
    check: false
  });

  const sampleTypes = ['SPT', 'LPT', 'Shelby', 'CP'];

  // --- CARGAR DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    try {
      // Cargar Samples y ordenar por profundidad
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

  const generateSoilDescription = (number, depth, bottom, nValue) => {
    return `SPT N°${number}: (${parseFloat(depth).toFixed(2)} m - ${parseFloat(bottom).toFixed(2)} m)\nNSPT = ${nValue}`;
  };

  const generateHydraulicDescription = (number, depth, bottom, kValue, isChecked) => {
    const d = parseFloat(depth).toFixed(2);
    const b = parseFloat(bottom).toFixed(2);
    const numPad = String(number).padStart(2, '0');
    
    let kText = '';
    if (isChecked) {
        kText = 'MUY PERMEABLE';
    } else {
        const sci = kValue.toExponential(2);
        kText = `${sci.replace('e', 'x10')}cm/s`;
    }

    return `Ensayo de Permeabilidad N°${number}\nLFCC-${numPad}: (${d} m - ${b} m)\nK=${kText}`;
  };

  // --- MANEJADORES DE FORMULARIOS ---
  const handleSampleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setSampleForm({ ...sampleForm, [name]: value });
  };

  const handleHydraulicChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
        setHydraulicForm({ ...hydraulicForm, [name]: checked });
    } else {
        if (type === 'number' && parseFloat(value) < 0) return;
        setHydraulicForm({ ...hydraulicForm, [name]: value });
    }
  };

  // --- GUARDAR SAMPLE ---
  const handleSaveSample = async (e) => {
    e.preventDefault();
    if (!sampleForm.depth || !sampleForm.bottom) { alert("Profundidad requerida"); return; }
    if (parseFloat(sampleForm.bottom) <= parseFloat(sampleForm.depth)) { alert("Bottom debe ser mayor a Depth"); return; }

    setLoading(true);
    try {
        const nextNumber = samplesList.length + 1;
        const depthVal = parseFloat(sampleForm.depth);
        const bottomVal = parseFloat(sampleForm.bottom);
        const v15 = parseInt(sampleForm.v_15) || 0;
        const v30 = parseInt(sampleForm.v_30) || 0;
        const v45 = parseInt(sampleForm.v_45) || 0;

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

        const nValue = calculateNValue(v15, v30, v45);
        const midDepth = (depthVal + bottomVal) / 2;
        const soilDescription = generateSoilDescription(nextNumber, depthVal, bottomVal, nValue);

        await db.soil_profiles.add({
            soil_id: generateId('SOIL'),
            point_id: activePointId,
            depth: midDepth,
            //bottom: bottomVal,
            //graphic: 'CL', 
            description: soilDescription,
            //unit_summary: '',
            linked_sample_id: sampleForm.sample_id,
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
    if (!hydraulicForm.depth || !hydraulicForm.bottom) { alert("Profundidades requeridas"); return; }

    setLoading(true);
    try {
        const nextNumber = hydraulicList.length + 1;
        const depthVal = parseFloat(hydraulicForm.depth);
        const bottomVal = parseFloat(hydraulicForm.bottom);
        const kVal = hydraulicForm.K ? parseFloat(hydraulicForm.K) : 0; 
        const isChecked = hydraulicForm.check;

        await db.hydraulic_cond.add({
            ...hydraulicForm,
            point_id: activePointId,
            depth: depthVal,
            bottom: bottomVal,
            K: kVal,
            check: isChecked, 
            number: nextNumber,
            sync_status: 0
        });

        const midDepth = (depthVal + bottomVal) / 2;
        const soilDescription = generateHydraulicDescription(nextNumber, depthVal, bottomVal, kVal, isChecked);

        await db.soil_profiles.add({
            soil_id: generateId('SOIL'),
            point_id: activePointId,
            depth: midDepth,
            //bottom: bottomVal,
            //graphic: 'CL', 
            description: soilDescription,
            //unit_summary: '',
            linked_hydraulic_id: hydraulicForm.hydraulic_id,
            sync_status: 0
        });

        await loadData();

        setHydraulicForm({
            hydraulic_id: generateId('HYD'),
            depth: hydraulicForm.bottom,
            bottom: '',
            K: '',
            check: false
        });
    } catch (error) {
        console.error(error);
        alert("Error al guardar permeabilidad");
    } finally {
        setLoading(false);
    }
  };

  // --- ELIMINAR SAMPLE ---
  const handleDeleteSample = async (id, sample_id, deletedNumber) => {
    if(!confirm("¿Eliminar muestra?")) return;
    
    try {
        await db.transaction('rw', [db.samples, db.soil_profiles], async () => {
            await db.samples.delete(id);
            const linkedSoil = await db.soil_profiles.where('linked_sample_id').equals(sample_id).first();
            if (linkedSoil) await db.soil_profiles.delete(linkedSoil.id);

            const subsequentSamples = await db.samples.where('point_id').equals(activePointId).filter(c => c.number > deletedNumber).toArray();

            for (const sample of subsequentSamples){
                const newNumber = sample.number - 1;
                await db.samples.update(sample.id, {number: newNumber, sync_status : 0});

                const linkedProf = await db.soil_profiles.where('linked_sample_id').equals(sample.sample_id).first();
                if (linkedProf) {
                    const nVal = calculateNValue(sample.v_15, sample.v_30, sample.v_45);
                    const newDesc = generateSoilDescription(newNumber, sample.depth, sample.bottom, nVal);
                    await db.soil_profiles.update(linkedProf.id, {description: newDesc, sync_status: 0 });
                }
            }
        });
        await loadData();
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
  };

  // --- ELIMINAR HYDRAULIC ---
  const handleDeleteHydraulic = async (id, hydraulic_id, deletedNumber) => {
    if(!confirm("¿Eliminar ensayo hidráulico?")) return;
    
    try {
        await db.transaction('rw', [db.hydraulic_cond, db.soil_profiles], async () => {
            await db.hydraulic_cond.delete(id);
            const linkedSoil = await db.soil_profiles.where('linked_hydraulic_id').equals(hydraulic_id).first();
            if (linkedSoil) await db.soil_profiles.delete(linkedSoil.id);

            const subsequentItems = await db.hydraulic_cond.where('point_id').equals(activePointId).filter(c => c.number > deletedNumber).toArray();

            for (const item of subsequentItems) {
                const newNumber = item.number - 1;
                await db.hydraulic_cond.update(item.id, {number: newNumber, sync_status: 0});

                const linkedProf = await db.soil_profiles.where('linked_hydraulic_id').equals(item.hydraulic_id).first();
                if (linkedProf) {
                    const newDesc = generateHydraulicDescription(newNumber, item.depth, item.bottom, item.K, item.check);
                    await db.soil_profiles.update(linkedProf.id, {description: newDesc, sync_status: 0});
                }
            }
        });
        await loadData();
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
  };

  const handleEditSample = (sampleId) => {
    navigate(`/edit-sample/${currentProjectId}/${activePointId}/${sampleId}`);
  };

  // NUEVA FUNCIÓN DE NAVEGACIÓN
  const handleEditHydraulic = (hydraulicId) => {
    navigate(`/edit-hydraulic/${currentProjectId}/${activePointId}/${hydraulicId}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* ================= SECCIÓN 1: SAMPLES (Naranja) ================= */}
      <div className="flex flex-col gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                <Activity size={18} className="text-orange-500"/> Ensayo de Resistencia (SPT/LPT)
            </h3>
            <form onSubmit={handleSaveSample} className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">Depth (m)*</label><input name="depth" type="number" step="0.01" value={sampleForm.depth} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs font-bold" placeholder="m" required/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">Bottom (m)*</label><input name="bottom" type="number" step="0.01" value={sampleForm.bottom} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs font-bold" placeholder="m" required/></div>
                    <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-bold text-gray-500">Type</label>
                        <select name="type" value={sampleForm.type} onChange={handleSampleChange} className="w-full p-2 border rounded text-xs bg-white">
                            {sampleTypes.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
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
                    <div><label className="text-[10px] font-bold text-gray-500">Depth (m)*</label><input name="depth" type="number" step="0.01" value={hydraulicForm.depth} onChange={handleHydraulicChange} className="w-full p-2 border rounded text-xs font-bold" required/></div>
                    <div><label className="text-[10px] font-bold text-gray-500">Bottom (m)*</label><input name="bottom" type="number" step="0.01" value={hydraulicForm.bottom} onChange={handleHydraulicChange} className="w-full p-2 border rounded text-xs font-bold" required/></div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 flex justify-between items-center mb-1">
                            <span>K (Permeabilidad)</span>
                            <div className="flex items-center gap-1">
                                <input 
                                    name="check" 
                                    type="checkbox" 
                                    checked={hydraulicForm.check} 
                                    onChange={handleHydraulicChange} 
                                    className="w-3 h-3 cursor-pointer"
                                />
                                <span className="text-[9px] text-cyan-600 font-bold">Muy Permeable?</span>
                            </div>
                        </label>
                        <input 
                            name="K" 
                            type="number" 
                            step="0.00000001" 
                            value={hydraulicForm.K} 
                            onChange={handleHydraulicChange} 
                            className="w-full p-2 border rounded text-xs transition-colors"
                            placeholder="e.g. 1.2e-5" 
                        />
                    </div>

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
                            <th className="p-2">#</th>
                            <th className="p-2">Depth</th>
                            <th className="p-2">Bottom</th>
                            <th className="p-2">Valor K</th>
                            <th className="p-2 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {hydraulicList.map((item) => (
                            <tr key={item.hydraulic_id} className="hover:bg-gray-50">
                                <td className="p-2 font-bold text-gray-400">#{item.number}</td>
                                <td className="p-2 font-bold text-gray-700">{item.depth.toFixed(2)}</td>
                                <td className="p-2 font-bold text-gray-700">{item.bottom.toFixed(2)}</td>
                                <td className="p-2 font-mono text-cyan-700">
                                    {item.check ? 
                                        <div className="flex flex-col items-start">
                                            <span className="bg-cyan-100 px-1 rounded text-[9px] font-bold mb-0.5">MUY PERMEABLE</span>
                                            <span className="text-[10px] text-gray-400">{item.K.toExponential(2)}</span>
                                        </div>
                                        : item.K.toExponential(2)
                                    }
                                </td>
                                <td className="p-2 text-right flex justify-end gap-2">
                                    {/* BOTÓN EDITAR AGREGADO */}
                                    <button onClick={() => handleEditHydraulic(item.hydraulic_id)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar"><Pencil size={14}/></button>
                                    <button onClick={() => handleDeleteHydraulic(item.id, item.hydraulic_id, item.number)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Eliminar"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TestsTab;