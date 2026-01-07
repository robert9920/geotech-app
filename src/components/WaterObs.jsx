import React, { useState, useEffect } from 'react';
import { Save, Droplet, Calendar, Ruler } from 'lucide-react';
import { db, generateId } from '../db.js';


const WaterObs = ({ pointId }) => {
  const activePointId = pointId; // Fallback
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    water_id: generateId('WTR'),
    depth: '',
    water_observation_date: new Date().toISOString().split('T')[0] // Fecha de hoy por defecto
  });

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    if (!activePointId) return;
    try {
      // Buscamos si ya existe un registro para este punto
      const item = await db.water_observations.where('point_id').equals(activePointId).first();
      
      if (item) {
        setFormData(item);
        setExists(true);
      } else {
        // Si no existe, reseteamos (excepto el ID y la fecha por defecto)
        setExists(false);
        setFormData({
            water_id: generateId('WTR'),
            depth: '',
            water_observation_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error("Error cargando nivel freático:", error);
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
    
    if (!formData.depth || !formData.water_observation_date) {
        alert("Por favor complete la profundidad y la fecha.");
        return;
    }

    setLoading(true);
    try {
        if (exists) {
            // ACTUALIZAR registro existente
            await db.water_observations.update(formData.id, {
                depth: parseFloat(formData.depth),
                water_observation_date: formData.water_observation_date,
                sync_status: 0
            });
            alert("Nivel freático actualizado correctamente.");
        } else {
            // CREAR nuevo registro
            await db.water_observations.add({
                ...formData,
                point_id: activePointId,
                depth: parseFloat(formData.depth),
                sync_status: 0
            });
            setExists(true);
            alert("Nivel freático registrado correctamente.");
        }
        
        await loadData(); // Recargar para asegurar consistencia

    } catch (error) {
        console.error("Error guardando:", error);
        alert("Error al guardar el registro.");
    } finally {
        setLoading(false);
    }
  };

  return (
    // Estructura de scroll natural
    <div className="flex flex-col gap-4 pb-10">
      
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-cyan-500 max-w-lg mx-auto w-full">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-6 text-lg">
            <Droplet size={24} className="text-cyan-500"/> 
            {exists ? "Editar Nivel Freático" : "Registrar Nivel Freático"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Campo Profundidad */}
            <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                    <Ruler size={16} /> Profundidad (m)
                </label>
                <input 
                    name="depth" 
                    type="number" 
                    step="0.01" 
                    value={formData.depth} 
                    onChange={handleChange} 
                    className="w-full p-4 border border-gray-300 rounded-lg font-mono text-2xl font-bold text-gray-800 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all placeholder-gray-200"
                    placeholder="0.00"
                    required 
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">Metros bajo el nivel del terreno</p>
            </div>

            {/* Campo Fecha */}
            <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                    <Calendar size={16} /> Fecha de Observación
                </label>
                <input 
                    name="water_observation_date" 
                    type="date" 
                    value={formData.water_observation_date} 
                    onChange={handleChange} 
                    className="w-full p-3 border border-gray-300 rounded-lg text-base text-gray-700 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all bg-white"
                    required 
                />
            </div>

            <div className="pt-4">
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-cyan-600 text-white py-4 rounded-lg font-bold hover:bg-cyan-700 shadow-md flex justify-center items-center gap-2 transition-transform active:scale-[0.98]"
                >
                    <Save size={20}/> 
                    {loading ? 'Guardando...' : (exists ? 'Actualizar Nivel' : 'Guardar Nivel')}
                </button>
            </div>

        </form>
      </div>

      {/* Tarjeta Informativa (Solo visual) */}
      {exists && (
          <div className="max-w-lg mx-auto w-full bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-start gap-3">
              <div className="bg-cyan-100 p-2 rounded-full">
                  <Droplet size={20} className="text-cyan-600 fill-cyan-600"/>
              </div>
              <div>
                  <h4 className="font-bold text-cyan-900 text-sm">Registro Actual</h4>
                  <p className="text-xs text-cyan-700 mt-1">
                      Nivel freático detectado a <strong>{parseFloat(formData.depth).toFixed(2)}m</strong> el día {formData.water_observation_date}.
                  </p>
              </div>
          </div>
      )}

    </div>
  );
};

export default WaterObs;