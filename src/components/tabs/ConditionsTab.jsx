import React, { useState, useEffect } from 'react';
import { Save, Trash2, Layers, AlertTriangle } from 'lucide-react';
import { db, generateId } from '../../db.js';

const ConditionsTab = ({ pointId }) => {
  const activePointId = pointId;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- OPCIONES ---
  const typeOptions = [
    'Broken Core',
    'Lost Core',
    'Fault Core'
  ];

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    core_condition_id: generateId('COND'),
    depth: '',
    bottom: '',
    type: 'Broken Core'
  });

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    try {
      const items = await db.core_conditions.where('point_id').equals(activePointId).toArray();
      // Ordenar por profundidad
      setList(items ? items.sort((a, b) => a.depth - b.depth) : []);
    } catch (error) {
      console.error("Error cargando condiciones:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePointId]);

  // --- MANEJADORES ---
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number' && parseFloat(value) < 0) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depthVal = parseFloat(formData.depth);
    const bottomVal = parseFloat(formData.bottom);

    // Validaciones básicas
    if (isNaN(depthVal) || isNaN(bottomVal)) {
      alert("Ingrese valores numéricos válidos para Depth y Bottom.");
      return;
    }
    if (bottomVal <= depthVal) {
      alert("El valor 'Bottom' debe ser mayor que 'Depth'.");
      return;
    }

    setLoading(true);

    try {
        // --- LÓGICA DE UNICIDAD DE ID ---
        let finalId = formData.core_condition_id;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const count = await db.core_conditions.where('core_condition_id').equals(finalId).count();
            if (count === 0) isUnique = true;
            else {
                finalId = generateId('COND');
                attempts++;
            }
        }

        if (!isUnique) { 
            alert("Error generando ID único. Por favor intente de nuevo."); 
            setLoading(false);
            return; 
        }

        // --- GUARDADO ---
        const newCondition = {
            core_condition_id: finalId,
            point_id: activePointId,
            depth: depthVal,
            bottom: bottomVal,
            type: formData.type,
            sync_status: 0
        };

        await db.core_conditions.add(newCondition);
        
        await loadData(); // Recargar lista

        // --- RESET FORMULARIO ---
        // Sugerencia UX: El nuevo 'depth' inicia donde terminó el 'bottom' anterior
        setFormData({
            core_condition_id: generateId('COND'),
            depth: bottomVal, 
            bottom: '',
            type: formData.type // Mantiene el último tipo seleccionado
        });

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar el registro.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Usamos window.confirm para asegurar compatibilidad en todos los navegadores
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro?")) return;
    
    try {
        await db.core_conditions.delete(id);
        await loadData(); // Es importante esperar a que recargue
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar el registro.");
    }
  };

  return (
    // FIX DE DISEÑO: Quitamos 'h-full', agregamos 'gap-4 pb-10' para scroll natural
    <div className="flex flex-col gap-4 pb-10">
      
      {/* --- FORMULARIO --- */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-600">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Layers size={18} className="text-teal-600"/> Nueva Condición
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Depth (m)</label>
                    <input 
                        name="depth"
                        type="number" 
                        step="0.01" 
                        value={formData.depth}
                        onChange={handleChange}
                        className="w-full p-2 border rounded font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                        required
                        placeholder="Desde"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Bottom (m)</label>
                    <input 
                        name="bottom"
                        type="number" 
                        step="0.01" 
                        value={formData.bottom}
                        onChange={handleChange}
                        className="w-full p-2 border rounded font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                        required
                        placeholder="Hasta"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Tipo</label>
                    <select 
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        {typeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded font-bold hover:bg-teal-700 shadow-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
                <Save size={18}/> {loading ? 'Guardando...' : 'Guardar Condición'}
            </button>
        </form>
      </div>

      {/* --- LISTA --- */}
      {/* Eliminado flex-1 y overflow-hidden del padre para permitir crecimiento */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
         <div className="bg-gray-100 p-2 border-b flex justify-between items-center">
            <h4 className="font-bold text-xs text-gray-600">Registros ({list.length})</h4>
         </div>
         
         {/* Solo overflow-x-auto para scroll horizontal si es necesario */}
         <div className="overflow-x-auto">
             {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                    <AlertTriangle size={32} className="mb-2 opacity-30"/>
                    <span className="text-xs">No hay condiciones registradas</span>
                </div>
             ) : (
                 <table className="w-full text-xs text-left">
                    <thead className="text-gray-500 bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-3">Prof. (m)</th>
                            <th className="p-3">Bottom (m)</th>
                            <th className="p-3">Longitud</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {list.map(item => (
                            <tr key={item.core_condition_id} className="hover:bg-teal-50">
                                <td className="p-3 font-bold text-gray-700">{item.depth.toFixed(2)}</td>
                                <td className="p-3 font-bold text-gray-700">{item.bottom.toFixed(2)}</td>
                                <td className="p-3 font-mono text-gray-500">
                                    {(item.bottom - item.depth).toFixed(2)} m
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${item.type === 'Lost Core' ? 'bg-red-100 text-red-700' : 
                                          item.type === 'Broken Core' ? 'bg-orange-100 text-orange-700' : 
                                          'bg-indigo-100 text-indigo-700'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <button 
                                        onClick={() => handleDelete(item.core_condition_id)} 
                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
         </div>
      </div>
    </div>
  );
};

export default ConditionsTab;