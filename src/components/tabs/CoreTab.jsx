import React, { useState, useEffect } from 'react';
import { Save, Trash2, Calculator, AlertCircle, Pencil, Hammer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, generateId } from '../../db.js';

const CoreTab = ({ pointId, projectId }) => {
  const [cores, setCores] = useState([]);
  const [nextRun, setNextRun] = useState(1);
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    core_id: generateId('CORE'),
    depth: '',
    bottom: '',
    tcr_length: '',
    rqd_length: '',
    jn: 0.5 
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

  // Función auxiliar para extraer el valor numérico de las etiquetas (ej: "R3 - Media" -> 3)
  const extractValue = (str) => {
      if (!str) return null;
      // Busca R o W seguido de un número al inicio
      const match = str.match(/^[RW](\d+)/);
      return match ? parseInt(match[1], 10) : null;
  };

  const loadData = async () => {
    if (!pointId) return;
    
    if (!currentProjectId) {
        const pt = await db.points.where('point_id').equals(pointId).first();
        if (pt) setCurrentProjectId(pt.project_id);
    }

    const items = await db.cores.where('point_id').equals(pointId).toArray();
    const sortedItems = items.sort((a, b) => a.depth - b.depth);

    // --- NUEVO: ENRIQUECER CORES CON DATOS DE STRENGTH/WEATHERING ---
    const enrichedCores = await Promise.all(sortedItems.map(async (core) => {
        // Buscar datos relacionados
        const sw = await db.strength_weathering.where('core_id').equals(core.core_id).first();
        
        let strIdx = '-';
        let weaIdx = '-';

        if (sw) {
            // Calcular índices en caliente
            const s1 = extractValue(sw.strength_v1);
            const s2 = extractValue(sw.strength_v2);
            if (s1 !== null && s2 !== null) strIdx = (s1 + s2) / 2;

            const w1 = extractValue(sw.weathering_v1);
            const w2 = extractValue(sw.weathering_v2);
            if (w1 !== null && w2 !== null) weaIdx = (w1 + w2) / 2;
        }

        return { ...core, strIdx, weaIdx };
    }));

    setCores(enrichedCores);
    
    const maxRun = sortedItems.reduce((max, item) => (item.run_number > max ? item.run_number : max), 0);
    setNextRun(maxRun + 1);

    if (sortedItems.length > 0 && formData.bottom === '') {
        const lastCore = sortedItems[sortedItems.length - 1];
        setFormData(prev => ({
            ...prev,
            depth: lastCore.bottom,
            bottom: ''
        }));
    }
  };

  useEffect(() => {
    loadData();
  }, [pointId]);

  // Cálculos visuales
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
    if (e.target.type === 'number' && parseFloat(value) < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depth = parseFloat(formData.depth);
    const bottom = parseFloat(formData.bottom);
    const tcr = parseFloat(formData.tcr_length) || 0;
    const rqd = parseFloat(formData.rqd_length) || 0;
    const currentRunLength = bottom - depth;

    if (depth < 0 || bottom < 0 || tcr < 0 || rqd < 0) {
        alert("Error: No se permiten valores negativos.");
        return;
    }

    if (bottom <= depth) {
        alert("Error: La profundidad final debe ser mayor que la inicial.");
        return;
    }

    if (tcr > (currentRunLength + 0.001)) {
        alert(`Error Lógico: El TCR (${tcr}m) no puede ser mayor a la longitud del Core (${currentRunLength.toFixed(2)}m).`);
        return;
    }
    
    if (rqd > (currentRunLength + 0.001)) {
        alert(`Error Lógico: El RQD (${rqd}m) no puede ser mayor a la longitud del Core (${currentRunLength.toFixed(2)}m).`);
        return;
    }

    if (rqd > tcr) {
        alert(`Advertencia: El RQD usualmente no es mayor que el TCR.`);
    }

    try {
        let finalCoreId = formData.core_id;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const count = await db.cores.where('core_id').equals(finalCoreId).count();
            if (count === 0) {
                isUnique = true;
            } else {
                finalCoreId = generateId('CORE'); 
                attempts++;
            }
        }

        if (!isUnique) {
            alert("Error crítico de ID.");
            return;
        }

        const newCore = {
            core_id: finalCoreId,
            point_id: pointId,
            depth: depth,
            bottom: bottom,
            run_number: nextRun,
            tcr_length: tcr,
            rqd_length: rqd,
            jn: parseFloat(formData.jn),
            fracture_index: 0,
            sync_status: 0
        };

        await db.cores.add(newCore);
        await loadData();
        
        setFormData({
            core_id: generateId('CORE'),
            depth: bottom, 
            bottom: '',
            tcr_length: '',
            rqd_length: '',
            jn: 0.5
        });

    } catch (error) {
        console.error("Error al guardar core:", error);
        alert("Error al guardar.");
    }
  };

  const handleDelete = async (id, deletedRunNumber) => {
      if(!confirm("¿Eliminar esta corrida? Se reordenarán las siguientes.")) return;

      try {
          await db.transaction('rw', db.cores, async () => {
              await db.cores.delete(id);
              const subsequentCores = await db.cores
                  .where('point_id').equals(pointId)
                  .filter(c => c.run_number > deletedRunNumber)
                  .toArray();

              for (const core of subsequentCores) {
                  await db.cores.update(core.id, { run_number: core.run_number - 1 });
              }
          });
          await loadData();
      } catch (error) {
          console.error(error);
          alert("Error al eliminar.");
      }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Calculator size={18} className="text-blue-600"/> 
                Registrar Maniobra #{nextRun}
            </h3>
            <div className="flex flex-col items-end opacity-50">
                <span className="text-[10px] text-gray-400 uppercase">ID Interno</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{formData.core_id}</span>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Depth (m)</label>
                    <input name="depth" type="number" step="0.01" min="0" value={formData.depth} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded font-bold" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottom (m)</label>
                    <input name="bottom" type="number" step="0.01" min="0" value={formData.bottom} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded font-bold" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-2 rounded border border-gray-200 relative">
                    <label className="block text-xs text-gray-500 mb-1 font-bold">TCR Length</label>
                    <input name="tcr_length" type="number" step="0.01" min="0" value={formData.tcr_length} onChange={handleChange} className="w-full p-1 border rounded text-center font-bold" />
                    <div className="absolute top-2 right-2"><span className={`text-[10px] font-bold ${tcrPct > 100 ? 'text-red-500' : 'text-green-600'}`}>{tcrPct}%</span></div>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 relative">
                    <label className="block text-xs text-gray-500 mb-1 font-bold">RQD Length</label>
                    <input name="rqd_length" type="number" step="0.01" min="0" value={formData.rqd_length} onChange={handleChange} className="w-full p-1 border rounded text-center font-bold" />
                    <div className="absolute top-2 right-2"><span className={`text-[10px] font-bold ${rqdPct < 25 ? 'text-red-500' : 'text-blue-600'}`}>{rqdPct}%</span></div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1 font-bold">Jn</label>
                    <select name="jn" value={formData.jn} onChange={handleChange} className="w-full p-2 border rounded bg-white text-sm">
                        {jnOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-md">
                <Save size={18}/> GUARDAR CORRIDA
            </button>
        </form>
      </div>

      {/* TABLA HISTORIAL */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
         <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
             <h4 className="font-bold text-gray-600 text-sm">Historial de Corridas</h4>
             <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500">{cores.length} registros</span>
         </div>
         <div className="overflow-auto flex-1">
             <table className="w-full text-xs text-left">
                <thead className="text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-2 py-3 text-center w-10">#</th>
                        <th className="px-2 py-3">Prof (m)</th>
                        <th className="px-2 py-3 text-center">Core Len</th>
                        <th className="px-2 py-3 text-center">TCR</th>
                        <th className="px-2 py-3 text-center">RQD</th>
                        <th className="px-2 py-3 text-center">Str. Idx</th> {/* NUEVA COLUMNA */}
                        <th className="px-2 py-3 text-center">Weath. Idx</th> {/* NUEVA COLUMNA */}
                        <th className="px-2 py-3 text-center">Jn</th>
                        <th className="px-2 py-3 text-center">Frac.</th>
                        <th className="px-2 py-3 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {cores.map((core) => {
                        const len = core.bottom - core.depth;
                        const rec = len > 0 ? ((core.tcr_length / len) * 100).toFixed(0) : 0;
                        const rqd = len > 0 ? ((core.rqd_length / len) * 100).toFixed(0) : 0;
                        return (
                            <tr key={core.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-2 py-3 text-center font-bold text-gray-500">{core.run_number}</td>
                                <td className="px-2 py-3 font-mono font-bold text-gray-700 whitespace-nowrap">{core.depth.toFixed(2)} - {core.bottom.toFixed(2)}</td>
                                <td className="px-2 py-3 text-center font-bold text-gray-600 bg-gray-50">{len.toFixed(2)}</td>
                                
                                <td className="px-2 py-3 text-center"><span className="font-bold">{core.tcr_length}</span> <span className="text-[9px] text-green-600">({rec}%)</span></td>
                                <td className="px-2 py-3 text-center"><span className="font-bold">{core.rqd_length}</span> <span className="text-[9px] text-blue-600">({rqd}%)</span></td>
                                
                                {/* NUEVAS CELDAS DE ÍNDICES */}
                                <td className="px-2 py-3 text-center font-bold text-orange-600">{core.strIdx}</td>
                                <td className="px-2 py-3 text-center font-bold text-green-600">{core.weaIdx}</td>

                                <td className="px-2 py-3 text-center"><span className="bg-gray-100 px-2 py-1 rounded font-bold">{core.jn}</span></td>
                                <td className="px-2 py-3 text-center font-mono text-gray-400">{core.fracture_index}</td>
                                
                                <td className="px-2 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => navigate(`/strength-weathering/${currentProjectId}/${pointId}/${core.core_id}`)} 
                                            className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded" 
                                            title="Resistencia & Meteorización"
                                        >
                                            <Hammer size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/edit-core/${currentProjectId}/${pointId}/${core.core_id}`)} 
                                            className="text-blue-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded" 
                                            title="Editar"
                                        >
                                            <Pencil size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(core.id, core.run_number)} 
                                            className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" 
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {cores.length === 0 && <tr><td colSpan="10" className="p-8 text-center text-gray-400 italic">No hay corridas.</td></tr>}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default CoreTab;