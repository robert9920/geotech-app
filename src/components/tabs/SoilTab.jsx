import React, { useState, useEffect } from 'react';
import { Save, Trash2, Layers, AlertTriangle, FileText, Lock, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, generateId } from '../../db.js';

const SoilTab = ({ pointId, projectId }) => {
  const activePointId = pointId;
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(projectId);

  const [formData, setFormData] = useState({
    soil_id: generateId('SOIL'),
    depth: '',
    bottom: '',
    graphic: 'CL',
    description: '',
    unit_summary: ''
  });

  const graphicOptions = [
    'GW', 'GP', 'GM', 'GC', 
    'SW', 'SP', 'SM', 'SC', 
    'ML', 'CL', 'OL', 'MH', 'CH', 'OH', 'PT', 'Rock'
  ];

  const loadData = async () => {
    if (!activePointId) return;
    
    // Obtener ProjectID si no viene en props (necesario para la navegación a Edit)
    if (!currentProjectId) {
        const pt = await db.points.where('point_id').equals(activePointId).first();
        if (pt) setCurrentProjectId(pt.project_id);
    }

    try {
      const items = await db.soil_profiles.where('point_id').equals(activePointId).toArray();
      setList(items ? items.sort((a, b) => a.depth - b.depth) : []);
    } catch (error) {
      console.error("Error cargando perfiles:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePointId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.depth || !formData.bottom) { alert("Profundidades requeridas"); return; }
    
    setLoading(true);
    try {
      await db.soil_profiles.add({
        ...formData,
        point_id: activePointId,
        depth: parseFloat(formData.depth),
        bottom: parseFloat(formData.bottom),
        sync_status: 0,
        linked_sample_id: null // Explícitamente null para manuales
      });
      
      await loadData();
      
      // Reset
      setFormData({
        soil_id: generateId('SOIL'),
        depth: formData.bottom,
        bottom: '',
        graphic: 'CL',
        description: '',
        unit_summary: ''
      });
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    // PROTECCIÓN: No borrar si está vinculado
    if (item.linked_sample_id) {
        alert("Este registro se generó automáticamente desde Ensayos y no se puede eliminar aquí. Bórrelo desde la pestaña Tests.");
        return;
    }

    if(!confirm("¿Eliminar este estrato manual?")) return;
    try {
      await db.soil_profiles.delete(item.id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (item) => {
      // PROTECCIÓN: No editar si está vinculado
      if (item.linked_sample_id) {
          alert("Este registro se generó automáticamente. Edite la muestra correspondiente en la pestaña Tests.");
          return;
      }
      navigate(`/edit-soil/${currentProjectId}/${activePointId}/${item.soil_id}`);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Formulario */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
         <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Layers size={18} className="text-green-600"/> Perfil Estratigráfico (Manual)
         </h3>
         <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs font-bold text-gray-500">Depth</label><input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-2 border rounded font-bold" required/></div>
                <div><label className="text-xs font-bold text-gray-500">Bottom</label><input name="bottom" type="number" step="0.01" value={formData.bottom} onChange={handleChange} className="w-full p-2 border rounded font-bold" required/></div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Graphic (USCS)</label>
                    <select name="graphic" value={formData.graphic} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        {graphicOptions.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold text-gray-500">Unit Summary</label><input name="unit_summary" type="text" value={formData.unit_summary} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Resumen..."/></div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500">Descripción Detallada</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded h-20 text-sm font-mono" placeholder="Descripción litológica..."/>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-sm flex justify-center gap-2">
                <Save size={18}/> Guardar Estrato
            </button>
         </form>
      </div>

      {/* Lista */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col border border-gray-200">
         <div className="bg-green-50 p-2 border-b border-green-100"><h4 className="font-bold text-xs text-green-800">Estratos Registrados ({list.length})</h4></div>
         <div className="overflow-auto flex-1">
             <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                        <th className="p-3">Depth (m)</th>
                        <th className="p-3">Bottom (m)</th>
                        <th className="p-3 text-center">Gráfico</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-right">Acción</th>
                    </tr>
                </thead> 
                <tbody className="divide-y">
                    {list.map(item => {
                        const isLinked = !!item.linked_sample_id;
                        return (
                            <tr key={item.soil_id} className={`hover:bg-green-50 ${isLinked ? 'bg-gray-50' : ''}`}>
                                <td className="p-3 font-bold whitespace-nowrap align-top text-gray-700">
                                    {item.depth.toFixed(3)}
                                </td>
                                <td className="p-3 font-bold whitespace-nowrap align-top text-gray-700">
                                    {item.bottom ? item.bottom.toFixed(2) : ''}
                                </td>
                                <td className="p-3 text-center align-top">
                                    <span className="bg-gray-800 text-white px-2 py-1 rounded font-bold">{item.graphic}</span>
                                </td>
                                <td className="p-3 align-top whitespace-pre-wrap font-mono text-gray-600">
                                    {isLinked && <span className="text-[10px] text-orange-500 font-bold mb-1 block uppercase tracking-wider">Automático (Test)</span>}
                                    {item.description}
                                </td>
                                <td className="p-3 text-right align-top">
                                    {isLinked ? (
                                        <div className="flex justify-end p-1">
                                            <Lock size={16} className="text-gray-400" title="Registro automático protegido"/>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar"><Pencil size={16}/></button>
                                            <button onClick={() => handleDelete(item)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Eliminar"><Trash2 size={16}/></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {list.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-gray-400">Sin estratos</td></tr>}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default SoilTab;