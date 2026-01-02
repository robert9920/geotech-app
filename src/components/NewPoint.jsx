import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, MapPin, Calendar, Ruler, Anchor } from 'lucide-react';
import { db } from '../db.js';

const NewPoint = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    // Objeto Point con todos los campos mapeados y parseados
    const newPoint = {
        // --- Claves ---
        point_id: form.point_id.value.trim(),
        project_id: projectId,
        
        // --- Ubicación (Obligatorios y Opcionales) ---
        north: parseFloat(form.north.value) || 0,
        east: parseFloat(form.east.value) || 0,
        elevation: parseFloat(form.elevation.value) || 0,
        zone: form.zone.value,
        coordinate_system: form.coordinate_system.value,
        surveyed: form.surveyed.checked, // Boolean
        
        // --- Detalles Generales ---
        borehole_type: form.borehole_type.value,
        hole_depth: parseFloat(form.hole_depth.value) || 0,
        plunge: parseFloat(form.plunge.value) || -90, // Default vertical
        boring_date: form.boring_date.value, // Obligatorio
        
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
        // Validación de unicidad del PointID dentro del mismo proyecto
        // Dexie permite búsquedas compuestas si se indexan, pero aquí lo hacemos manual por simplicidad
        const existing = await db.points
            .where({ project_id: projectId })
            .and(item => item.point_id === newPoint.point_id)
            .count();
            
        if (existing > 0) {
            alert(`Error: El punto "${newPoint.point_id}" ya existe en este proyecto.`);
            return;
        }

        await db.points.add(newPoint);
        navigate(`/project/${projectId}`); // Volver a la lista
    } catch (error) {
        console.error("Error al guardar punto:", error);
        alert("Ocurrió un error al guardar el punto.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* --- HEADER --- */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={() => navigate(-1)} className="text-gray-600 flex items-center gap-1">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg">Nuevo Punto</h1>
                <p className="text-xs text-gray-400">Proyecto: {projectId}</p>
            </div>
            <button type="submit" className="text-blue-600 font-bold flex items-center gap-1">
                <Save size={18}/> Guardar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* --- SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-600">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex items-center gap-2">
                    <MapPin size={16}/> Identificación y Ubicación
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Point ID (Obligatorio) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Point ID *</label>
                    <input name="point_id" required type="text" className="w-full p-2 border border-blue-200 rounded font-bold text-lg" placeholder="Ej. BH-01" />
                  </div>

                  {/* Coordenadas (Obligatorias) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Norte (Y) *</label>
                    <input name="north" required type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Este (X) *</label>
                    <input name="east" required type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  
                  {/* Elevación y Zona */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Elevación (Z)</label>
                    <input name="elevation" type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Zona *</label>
                    <select name="zone" required className="w-full p-2 border rounded bg-white">
                        <option value="">Seleccionar...</option>
                        <option value="17S">17S</option>
                        <option value="18S">18S</option>
                        <option value="19S">19S</option>
                        <option value="17N">17N</option>
                        <option value="18N">18N</option>
                        <option value="19N">19N</option>
                    </select>
                  </div>

                  {/* Sistema y Tipo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Sistema Coord. *</label>
                    <select name="coordinate_system" required className="w-full p-2 border rounded bg-white">
                        <option value="WGS84">WGS84</option>
                        <option value="PSAD56">PSAD56</option>
                        <option value="SIRGAS">SIRGAS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Tipo de Sondeo</label>
                    <input name="borehole_type" type="text" list="borehole_types" className="w-full p-2 border rounded" placeholder="Ej. DDH" />
                    <datalist id="borehole_types">
                        <option value="DDH" />
                        <option value="RC" />
                        <option value="Calicata" />
                        <option value="SPT" />
                    </datalist>
                  </div>

                  {/* Surveyed (Checkbox) */}
                  <div className="flex items-center gap-2 mt-2">
                    <input name="surveyed" type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                    <label className="text-sm font-medium text-gray-700">¿Topografía validada? (Surveyed)</label>
                  </div>
                </div>
              </section>

              {/* --- SECCIÓN 2: PERFORACIÓN GENERAL --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex items-center gap-2">
                    <Ruler size={16}/> Datos de Perforación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Profundidad Total (m)</label>
                    <input name="hole_depth" type="number" step="0.1" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Inclinación (Plunge)</label>
                    <input name="plunge" type="number" step="0.1" defaultValue="-90" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Fecha Inicio *</label>
                    <input name="boring_date" required type="date" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Contratista (Suelo)</label>
                    <input name="soil_drilling_contractor" type="text" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Fin Prof. Suelo (m)</label>
                    <input name="end_soil_depth" type="number" step="0.1" className="w-full p-2 border rounded" />
                   </div>
                </div>
              </section>

              {/* --- SECCIÓN 3: PERFORACIÓN EN ROCA --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-gray-400">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex items-center gap-2">
                    <span className="text-xl">🪨</span> Detalles de Roca
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Inicio Roca (m)</label>
                    <input name="start_rock_depth" type="number" step="0.1" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Techo Roca (Top Depth)</label>
                    <input name="top_depth_rock" type="number" step="0.1" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Fecha Inicio Roca</label>
                    <input name="rock_date" type="date" className="w-full p-2 border rounded" />
                   </div>
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Contratista (Roca)</label>
                    <input name="rock_drilling_contractor" type="text" className="w-full p-2 border rounded" />
                   </div>
                   <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500">Equipo de Perforación (Rig)</label>
                    <input name="rock_drilling_rig" type="text" className="w-full p-2 border rounded" placeholder="Ej. Sandvik DE710" />
                   </div>
                </div>
              </section>

              {/* --- SECCIÓN 4: OTROS --- */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Configuración</h3>
                <div>
                    <label className="block text-xs font-medium text-gray-500">Página del Log (Depth Log Page)</label>
                    <input name="depth_log_page" type="number" className="w-full p-2 border rounded" placeholder="0" />
                </div>
              </section>

            </div>
          </div>
      </form>
    </div>
  );
};

export default NewPoint;