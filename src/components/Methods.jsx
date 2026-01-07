import React, { useState, useEffect } from 'react';
import { Save, Drill, Pickaxe, Ruler, FileText } from 'lucide-react';
import { db, generateId } from '../db.js';


const MethodsPage = ({ pointId }) => {
  const activePointId = pointId; // Fallback
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA LOS DOS REGISTROS ---
  const [boringData, setBoringData] = useState({
    method_id: generateId('MTH'),
    depth: '',
    bottom: '',
    method: 'Boring',
    type: ''
  });
  const [boringExists, setBoringExists] = useState(false);

  const [drillingData, setDrillingData] = useState({
    method_id: generateId('MTH'),
    depth: '',
    bottom: '',
    method: 'Drilling',
    type: ''
  });
  const [drillingExists, setDrillingExists] = useState(false);

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    try {
      const items = await db.methods.where('point_id').equals(activePointId).toArray();
      
      // Filtrar y asignar datos si existen
      const foundBoring = items.find(i => i.method === 'Boring');
      console.log(foundBoring);
      
      if (foundBoring) {
          setBoringData(foundBoring);
          setBoringExists(true);
      } else {
          // Reset parcial si se borrara externamente (raro, pero seguro)
          setBoringExists(false);
          setBoringData({ method_id: generateId('MTH'), point_id: activePointId, depth: '', bottom: '', method: 'Boring', type: '' });
      }

      const foundDrilling = items.find(i => i.method === 'Drilling');
      if (foundDrilling) {
          setDrillingData(foundDrilling);
          setDrillingExists(true);
      } else {
          setDrillingExists(false);
          setDrillingData({ method_id: generateId('MTH'), point_id: activePointId, depth: '', bottom: '', method: 'Drilling', type: '' });
      }

    } catch (error) {
      console.error("Error cargando métodos:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePointId]);

  // --- MANEJADORES GENERALES ---
  const handleChange = (e, methodType) => {
    const { name, value, type } = e.target;
    // Evitar negativos en campos numéricos
    if (type === 'number' && parseFloat(value) < 0) return;

    if (methodType === 'Boring') {
        setBoringData(prev => ({ ...prev, [name]: value }));
    } else {
        setDrillingData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e, methodType) => {
    e.preventDefault();
    const data = methodType === 'Boring' ? boringData : drillingData;
    const exists = methodType === 'Boring' ? boringExists : drillingExists;

    // Validaciones
    const d = parseFloat(data.depth);
    const b = parseFloat(data.bottom);

    if (isNaN(d) || isNaN(b)) {
        alert("Complete las profundidades.");
        return;
    }
    if (b <= d) {
        alert("El valor 'Bottom' debe ser mayor que 'Depth'.");
        return;
    }

    setLoading(true);
    try {
        if (exists) {
            // Actualizar
            await db.methods.update(data.id, {
                depth: d,
                bottom: b,
                type: data.type,
                sync_status: 0
            });
            alert(`Registro de ${methodType} actualizado.`);
        } else {
            // Crear Nuevo
            await db.methods.add({
                ...data,
                point_id: activePointId,
                depth: d,
                bottom: b,
                sync_status: 0
            });
            alert(`Registro de ${methodType} creado.`);
        }
        await loadData();
    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* --- TARJETA BORING --- */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-600">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Pickaxe size={20} className="text-orange-600"/> Método: Boring
        </h3>
        
        <form onSubmit={(e) => handleSave(e, 'Boring')} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Depth (m)</label>
                    <input 
                        name="depth" 
                        type="number" 
                        step="0.01" 
                        value={boringData.depth} 
                        onChange={(e) => handleChange(e, 'Boring')} 
                        className="w-full p-3 border rounded font-bold text-gray-800" 
                        placeholder="0.00"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Bottom (m)</label>
                    <input 
                        name="bottom" 
                        type="number" 
                        step="0.01" 
                        value={boringData.bottom} 
                        onChange={(e) => handleChange(e, 'Boring')} 
                        className="w-full p-3 border rounded font-bold text-gray-800" 
                        placeholder="0.00"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Type (Descripción)</label>
                <input 
                    name="type" 
                    type="text" 
                    value={boringData.type} 
                    onChange={(e) => handleChange(e, 'Boring')} 
                    className="w-full p-3 border rounded text-gray-700" 
                    placeholder="Ej: Manual Auger, Wash Boring..."
                />
            </div>
            
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded font-bold hover:bg-orange-700 shadow-sm flex justify-center items-center gap-2 transition-transform active:scale-[0.98]"
            >
                <Save size={18}/> {boringExists ? 'Actualizar Boring' : 'Guardar Boring'}
            </button>
        </form>
      </div>

      {/* --- TARJETA DRILLING --- */}
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-600">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Drill size={20} className="text-gray-600"/> Método: Drilling
        </h3>
        
        <form onSubmit={(e) => handleSave(e, 'Drilling')} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Depth (m)</label>
                    <input 
                        name="depth" 
                        type="number" 
                        step="0.01" 
                        value={drillingData.depth} 
                        onChange={(e) => handleChange(e, 'Drilling')} 
                        className="w-full p-3 border rounded font-bold text-gray-800" 
                        placeholder="0.00"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Bottom (m)</label>
                    <input 
                        name="bottom" 
                        type="number" 
                        step="0.01" 
                        value={drillingData.bottom} 
                        onChange={(e) => handleChange(e, 'Drilling')} 
                        className="w-full p-3 border rounded font-bold text-gray-800" 
                        placeholder="0.00"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Type (Descripción)</label>
                <input 
                    name="type" 
                    type="text" 
                    value={drillingData.type} 
                    onChange={(e) => handleChange(e, 'Drilling')} 
                    className="w-full p-3 border rounded text-gray-700" 
                    placeholder="Ej: Diamond HQ, Tricone..."
                />
            </div>
            
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-600 text-white py-3 rounded font-bold hover:bg-gray-700 shadow-sm flex justify-center items-center gap-2 transition-transform active:scale-[0.98]"
            >
                <Save size={18}/> {drillingExists ? 'Actualizar Drilling' : 'Guardar Drilling'}
            </button>
        </form>
      </div>

    </div>
  );
};

export default MethodsPage;