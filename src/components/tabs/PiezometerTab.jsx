import React, { useState, useEffect } from 'react';
import { Save, Trash2, Activity, Ruler, Hash, PenTool, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { db, generateId } from '../../db.js';

const PiezometerTab = ({ pointId, projectId }) => {
  const activePointId = pointId; // Fallback para preview
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    piezometer_id: generateId('PIEZO'),
    depth: '',
    bottom: '',
    prof_piezo: '',
    graphic: 'Standpipe',
    name: '',
    therm_node_num: '',
    lines: false, // false = NO, true = YES
    color: '#4F46E5', // Un indigo por defecto
    description: ''
  });

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    
    // Obtener ProjectID si no viene en props (necesario para la ruta de edición)
    if (!currentProjectId) {
        const pt = await db.points.where('point_id').equals(activePointId).first();
        if (pt) setCurrentProjectId(pt.project_id);
    }

    try {
      const items = await db.piezometers.where('point_id').equals(activePointId).toArray();
      // Ordenar por profundidad
      setList(items ? items.sort((a, b) => a.depth - b.depth) : []);
    } catch (error) {
      console.error("Error cargando piezómetros:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePointId]);

  // --- MANEJADORES ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'number' && parseFloat(value) < 0) return;
    
    // Manejo especial para el select booleano simulado
    if (name === 'lines') {
        setFormData({ ...formData, [name]: value === 'true' });
        return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depthVal = parseFloat(formData.depth);
    const bottomVal = parseFloat(formData.bottom);
    const profPiezoVal = parseFloat(formData.prof_piezo);

    if (isNaN(depthVal) || isNaN(bottomVal)) {
        alert("Las profundidades (Depth y Bottom) son requeridas.");
        return;
    }
    if (bottomVal <= depthVal) {
        alert("El valor 'Bottom' debe ser mayor que 'Depth'.");
        return;
    }

    setLoading(true);
    try {
        await db.piezometers.add({
            ...formData,
            point_id: activePointId,
            depth: depthVal,
            bottom: bottomVal,
            prof_piezo: isNaN(profPiezoVal) ? 0 : profPiezoVal,
            therm_node_num: parseInt(formData.therm_node_num) || 0,
            sync_status: 0
        });

        await loadData();

        // Reset del formulario (manteniendo algunos valores por comodidad)
        setFormData({
            piezometer_id: generateId('PIEZO'),
            depth: formData.bottom, // Sugerencia UX: Continuar desde el anterior
            bottom: '',
            prof_piezo: '',
            graphic: formData.graphic,
            name: '',
            therm_node_num: '',
            lines: formData.lines,
            color: formData.color,
            description: ''
        });

    } catch (error) {
        console.error("Error guardando:", error);
        alert("Error al guardar el piezómetro.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este piezómetro?")) return;
    try {
        await db.piezometers.delete(id);
        loadData();
    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar.");
    }
  };

  const handleEdit = (item) => {
    navigate(`/edit-piezometer/${currentProjectId}/${activePointId}/${item.piezometer_id}`);
  };

  return (
    // FIX DE DISEÑO: Quitamos 'h-full', usamos 'gap-4 pb-10' para permitir scroll natural de la página
    <div className="flex flex-col gap-4 pb-10">
      
      {/* --- FORMULARIO --- */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-600">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Activity size={18} className="text-indigo-600"/> Nuevo Piezómetro
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Fila 1: Geometría */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Depth (m)</label>
                    <input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-2 border rounded font-bold text-gray-800" required placeholder="0.00"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Bottom (m)</label>
                    <input name="bottom" type="number" step="0.01" value={formData.bottom} onChange={handleChange} className="w-full p-2 border rounded font-bold text-gray-800" required placeholder="0.00"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Prof. Piezo (m)</label>
                    <input name="prof_piezo" type="number" step="0.01" value={formData.prof_piezo} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Nivel..."/>
                </div>
            </div>

            {/* Fila 2: Identificación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Nombre / ID</label>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Ej: PZ-01"/>
                </div>
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Tipo Gráfico</label>
                    <input name="graphic" type="text" value={formData.graphic} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Standpipe..."/>
                </div>
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Therm Node #</label>
                    <input name="therm_node_num" type="number" value={formData.therm_node_num} onChange={handleChange} className="w-full p-2 border rounded" placeholder="0"/>
                </div>
            </div>

            {/* Fila 3: Configuración Visual */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Líneas (Lines)</label>
                    <select name="lines" value={formData.lines} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        <option value="false">NO</option>
                        <option value="true">YES</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Color</label>
                    <div className="flex gap-2">
                        <input name="color" type="color" value={formData.color} onChange={handleChange} className="h-10 w-12 p-1 border rounded cursor-pointer"/>
                        <input name="color" type="text" value={formData.color} onChange={handleChange} className="w-full p-2 border rounded text-xs uppercase" placeholder="#HEX"/>
                    </div>
                </div>
            </div>

            {/* Fila 4: Descripción */}
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Descripción</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded h-16 text-sm" placeholder="Detalles de la instalación..."/>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 shadow-sm flex justify-center gap-2">
                <Save size={18}/> Guardar Piezómetro
            </button>
        </form>
      </div>

      {/* --- LISTA --- */}
      {/* Eliminado 'flex-1' y 'overflow-hidden' del padre para evitar doble scroll */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
         <div className="bg-indigo-50 p-2 border-b border-indigo-100"><h4 className="font-bold text-xs text-indigo-800">Registros ({list.length})</h4></div>
         
         {/* 'overflow-x-auto' solo para desplazamiento horizontal de la tabla si es necesario */}
         <div className="overflow-x-auto">
             <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                        <th className="p-3">Rango (m)</th>
                        <th className="p-3">Nombre</th>
                        <th className="p-3 text-center">Tipo</th>
                        <th className="p-3 text-center">Prof. P.</th>
                        <th className="p-3 text-center">Color</th>
                        <th className="p-3 text-center">Lines</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-right">Acción</th>
                    </tr>
                </thead> 
                <tbody className="divide-y">
                    {list.map(item => (
                        <tr key={item.piezometer_id} className="hover:bg-indigo-50">
                            <td className="p-3 font-bold whitespace-nowrap text-gray-700">
                                {item.depth.toFixed(2)} - {item.bottom.toFixed(2)}
                            </td>
                            <td className="p-3 font-bold text-indigo-700">
                                {item.name || '-'} <span className="text-gray-400 font-normal text-[10px] ml-1">Node: {item.therm_node_num}</span>
                            </td>
                            <td className="p-3 text-center">{item.graphic}</td>
                            <td className="p-3 text-center font-mono">{item.prof_piezo.toFixed(2)}</td>
                            <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <div className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-[10px] text-gray-500 uppercase">{item.color}</span>
                                </div>
                            </td>
                            <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.lines ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {item.lines ? 'YES' : 'NO'}
                                </span>
                            </td>
                            <td className="p-3 text-gray-600 italic truncate max-w-xs">{item.description}</td>
                            <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-1 rounded transition-colors" title="Editar">
                                        <Pencil size={16}/>
                                    </button>
                                    <button onClick={() => handleDelete(item.piezometer_id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {list.length === 0 && <tr><td colSpan="8" className="p-10 text-center text-gray-400">No hay piezómetros registrados.</td></tr>}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default PiezometerTab;