import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, MapPin, Ruler, AlertTriangle, Anchor } from 'lucide-react'; // Asegúrate de tener los iconos
import { db } from '../db.js';

const EditPoint = () => {
  const { projectId, pointId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pointData, setPointData] = useState(null);
  const [originalPointId, setOriginalPointId] = useState('');

  // 1. Cargar datos del punto
  useEffect(() => {
    const loadPoint = async () => {
      try {
        // Buscamos el punto usando índices compuestos si existen, o filtrando
        const data = await db.points
            .where({ project_id: projectId })
            .filter(pt => pt.point_id === pointId)
            .first();

        if (data) {
          setPointData(data);
          setOriginalPointId(data.point_id);
        } else {
          alert('Punto no encontrado');
          navigate(`/project/${projectId}`);
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    loadPoint();
  }, [projectId, pointId, navigate]);

  // 2. Manejar Actualización
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const newPointId = form.point_id.value.trim();

    const updatedPoint = {
        // --- Claves ---
        point_id: newPointId,
        project_id: projectId,
        
        // --- Ubicación ---
        north: parseFloat(form.north.value) || 0,
        east: parseFloat(form.east.value) || 0,
        elevation: parseFloat(form.elevation.value) || 0,
        zone: form.zone.value,
        coordinate_system: form.coordinate_system.value,
        surveyed: form.surveyed.checked,
        
        // --- Detalles Generales ---
        borehole_type: form.borehole_type.value,
        hole_depth: parseFloat(form.hole_depth.value) || 0,
        plunge: parseFloat(form.plunge.value) || -90,
        boring_date: form.boring_date.value,
        
        // --- Contratistas y Suelo ---
        soil_drilling_contractor: form.soil_drilling_contractor.value,
        end_soil_depth: parseFloat(form.end_soil_depth.value) || 0,
        
        // --- Datos de Roca ---
        start_rock_depth: parseFloat(form.start_rock_depth.value) || 0,
        top_depth_rock: parseFloat(form.top_depth_rock.value) || 0,
        rock_date: form.rock_date.value,
        rock_drilling_contractor: form.rock_drilling_contractor.value,
        rock_drilling_rig: form.rock_drilling_rig.value,
        
        // --- Configuración ---
        depth_log_page: parseInt(form.depth_log_page.value) || 0,
        
        // --- Sistema ---
        sync_status: 0
    };

    try {
        // TRANSACCIÓN: Actualizar punto y sus hijos si cambia el ID
        await db.transaction('rw', 
            db.points, db.cores, db.discontinuities, db.core_conditions, 
            db.samples, db.hydraulic_cond, db.piezometers, db.soil_profiles, 
            db.water_observations, db.methods,
            async () => {
                
                // Si cambió el ID, verificar duplicados y actualizar hijos
                if (newPointId !== originalPointId) {
                    // Validar duplicado en el mismo proyecto
                    const count = await db.points
                        .where({ project_id: projectId })
                        .filter(p => p.point_id === newPointId)
                        .count();
                    
                    if (count > 0) throw new Error(`El ID "${newPointId}" ya existe en este proyecto.`);

                    // Actualizar tablas hijas (Cascada)
                    // Nota: point_id es string, updateamos todos los registros hijos que coincidan
                    const tablesToUpdate = [
                        db.cores, db.discontinuities, db.core_conditions,
                        db.samples, db.hydraulic_cond, db.piezometers, 
                        db.soil_profiles, db.water_observations, db.methods
                    ];

                    for (const table of tablesToUpdate) {
                        await table.where('point_id').equals(originalPointId).modify({ point_id: newPointId });
                    }
                }

                // Actualizar el registro principal usando su llave primaria interna (id)
                await db.points.update(pointData.id, updatedPoint);
            }
        );

        alert('Punto actualizado correctamente');
        navigate(`/project/${projectId}`);

    } catch (error) {
        console.error("Error update:", error);
        alert(error.message || "Error al actualizar.");
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={() => navigate(`/project/${projectId}`)} className="text-gray-600 flex items-center gap-1">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg">Editar Punto</h1>
                {originalPointId !== pointData?.point_id && <span className="text-xs text-orange-500">ID Modificado</span>}
            </div>
            <button type="submit" className="text-blue-600 font-bold flex items-center gap-1">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* --- SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-600">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex justify-between">
                    <span className="flex items-center gap-2"><MapPin size={16}/> Identificación</span>
                    <div className="flex items-center gap-1 text-[10px] text-orange-600 normal-case bg-orange-50 px-2 py-1 rounded border border-orange-200">
                        <AlertTriangle size={12}/> Cambiar ID actualiza registros hijos
                    </div>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Point ID *</label>
                    <input 
                        name="point_id" 
                        defaultValue={pointData.point_id} 
                        required 
                        type="text" 
                        className="w-full p-2 border border-blue-200 rounded font-bold text-lg text-blue-900 bg-blue-50 focus:bg-white transition-colors" 
                    />
                  </div>

                  <div><label className="block text-xs font-medium text-gray-500">Norte (Y) *</label><input name="north" defaultValue={pointData.north} required type="number" step="0.01" className="w-full p-2 border rounded" /></div>
                  <div><label className="block text-xs font-medium text-gray-500">Este (X) *</label><input name="east" defaultValue={pointData.east} required type="number" step="0.01" className="w-full p-2 border rounded" /></div>
                  
                  <div><label className="block text-xs font-medium text-gray-500">Elevación (Z)</label><input name="elevation" defaultValue={pointData.elevation} type="number" step="0.01" className="w-full p-2 border rounded" /></div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Zona *</label>
                    <select name="zone" defaultValue={pointData.zone} required className="w-full p-2 border rounded bg-white">
                        <option value="17S">17S</option><option value="18S">18S</option><option value="19S">19S</option>
                        <option value="17N">17N</option><option value="18N">18N</option><option value="19N">19N</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500">Sistema Coord. *</label>
                    <select name="coordinate_system" defaultValue={pointData.coordinate_system} required className="w-full p-2 border rounded bg-white">
                        <option value="WGS84">WGS84</option><option value="PSAD56">PSAD56</option><option value="SIRGAS">SIRGAS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Tipo de Sondeo</label>
                    <input name="borehole_type" defaultValue={pointData.borehole_type} type="text" list="borehole_types" className="w-full p-2 border rounded" />
                    <datalist id="borehole_types"><option value="DDH" /><option value="RC" /><option value="Calicata" /></datalist>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input name="surveyed" type="checkbox" defaultChecked={pointData.surveyed} className="w-5 h-5 text-blue-600 rounded" />
                    <label className="text-sm font-medium text-gray-700">¿Topografía validada?</label>
                  </div>
                </div>
              </section>

              {/* --- SECCIÓN 2: PERFORACIÓN GENERAL --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex items-center gap-2">
                    <Ruler size={16}/> Datos de Perforación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-xs font-medium text-gray-500">Profundidad Total (m)</label><input name="hole_depth" defaultValue={pointData.hole_depth} type="number" step="0.1" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Inclinación</label><input name="plunge" defaultValue={pointData.plunge} type="number" step="0.1" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Fecha Inicio *</label><input name="boring_date" defaultValue={pointData.boring_date} required type="date" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Contratista (Suelo)</label><input name="soil_drilling_contractor" defaultValue={pointData.soil_drilling_contractor} type="text" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Fin Prof. Suelo (m)</label><input name="end_soil_depth" defaultValue={pointData.end_soil_depth} type="number" step="0.1" className="w-full p-2 border rounded" /></div>
                </div>
              </section>

              {/* --- SECCIÓN 3: PERFORACIÓN EN ROCA --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-gray-400">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex items-center gap-2">
                    <span className="text-xl">🪨</span> Detalles de Roca
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-xs font-medium text-gray-500">Inicio Roca (m)</label><input name="start_rock_depth" defaultValue={pointData.start_rock_depth} type="number" step="0.1" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Techo Roca</label><input name="top_depth_rock" defaultValue={pointData.top_depth_rock} type="number" step="0.1" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Fecha Inicio Roca</label><input name="rock_date" defaultValue={pointData.rock_date} type="date" className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-xs font-medium text-gray-500">Contratista (Roca)</label><input name="rock_drilling_contractor" defaultValue={pointData.rock_drilling_contractor} type="text" className="w-full p-2 border rounded" /></div>
                   <div className="col-span-2"><label className="block text-xs font-medium text-gray-500">Equipo (Rig)</label><input name="rock_drilling_rig" defaultValue={pointData.rock_drilling_rig} type="text" className="w-full p-2 border rounded" /></div>
                </div>
              </section>

              {/* --- SECCIÓN 4: CONFIGURACIÓN --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Configuración</h3>
                <div><label className="block text-xs font-medium text-gray-500">Página del Log</label><input name="depth_log_page" defaultValue={pointData.depth_log_page} type="number" className="w-full p-2 border rounded" /></div>
              </section>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditPoint;