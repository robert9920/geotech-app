import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, AlertTriangle } from 'lucide-react';
import { db } from '../db.js';

const EditProject = () => {
  const { projectId } = useParams(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [originalId, setOriginalId] = useState(''); 

  // 1. Cargar datos del proyecto al iniciar
  useEffect(() => {
    const loadProject = async () => {
      try {
        const data = await db.projects.where('project_id').equals(projectId).first();
        if (data) {
          setProjectData(data);
          setOriginalId(data.project_id);
        } else {
          alert('Proyecto no encontrado');
          navigate('/');
        }
      } catch (error) {
        console.error(error);
        alert('Error cargando el proyecto');
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [projectId, navigate]);

  // 2. Manejar la actualización
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const newProjectId = form.project_id.value.trim();

    // Objeto con los 16 campos exactos
    const updatedProject = {
      // --- Strings ---
      project_id: newProjectId,
      client: form.client.value,
      title: form.title.value,
      location: form.location.value,
      
      // --- Configuración ---
      input_units: form.input_units.value,
      output_units: form.output_units.value,
      depth_log_page: parseInt(form.depth_log_page.value) || 0,
      water_unit_w: parseFloat(form.water_unit_w.value) || 0,

      // --- Geotecnia ---
      shear_strength_max: parseFloat(form.shear_strength_max.value) || 0,
      water_content_max: parseFloat(form.water_content_max.value) || 0,
      k_scale_min: parseFloat(form.k_scale_min.value) || 0,
      k_scale_increment: parseFloat(form.k_scale_increment.value) || 0,
      coeff_of_consol_factor: parseInt(form.coeff_of_consol_factor.value) || 0,

      // --- Otros ---
      draft_stamp: parseInt(form.draft_stamp.value) || 0,
      dynamic_max: parseInt(form.dynamic_max.value) || 0,
      chamber_max: parseInt(form.chamber_max.value) || 0,
      becker_max: parseInt(form.becker_max.value) || 0,
      
      sync_status: 0 
    };

    try {
      // TRANSACCIÓN DE ACTUALIZACIÓN
      await db.transaction('rw', db.projects, db.points, async () => {
        // Si el ID cambió, verificar duplicados y actualizar hijos
        if (newProjectId !== originalId) {
            const count = await db.projects.where('project_id').equals(newProjectId).count();
            if (count > 0) {
                throw new Error(`El ID "${newProjectId}" ya está siendo usado por otro proyecto.`);
            }
            // Actualizar hijos (puntos) para no perder la referencia
            await db.points.where('project_id').equals(originalId).modify({ project_id: newProjectId });
        }
        // Actualizar el Proyecto usando su llave primaria interna (id)
        await db.projects.update(projectData.id, updatedProject);
      });

      alert('Proyecto actualizado correctamente');
      navigate('/');
      
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert(error.message || "Error al actualizar el proyecto.");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando datos...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={() => navigate('/')} className="text-gray-600 flex items-center gap-1">
                <X size={20}/> Cancelar
            </button>
            <div className="text-center">
                <h1 className="font-bold text-lg">Editar Proyecto</h1>
                {originalId !== projectData?.project_id && <span className="text-xs text-orange-500">ID Modificado</span>}
            </div>
            <button type="submit" className="text-blue-600 font-bold flex items-center gap-1">
                <Save size={18}/> Actualizar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* SECCIÓN 1: INFORMACIÓN GENERAL */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-600">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2 flex justify-between items-center">
                    Información General
                    {/* Alerta discreta sobre el cambio de ID */}
                    <div className="group relative">
                        <AlertTriangle size={16} className="text-orange-400 cursor-help"/>
                        <span className="absolute right-0 w-48 bg-black text-white text-[10px] p-2 rounded hidden group-hover:block z-50">
                            Cuidado: Cambiar el ID actualizará todos los sondeos asociados.
                        </span>
                    </div>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ID Proyecto *</label>
                    <input 
                        name="project_id" 
                        type="text" 
                        defaultValue={projectData.project_id} 
                        required 
                        className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-blue-50 focus:bg-white transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Proyecto *</label>
                    <input name="title" defaultValue={projectData.title} required type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cliente *</label>
                    <input name="client" defaultValue={projectData.client} required type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ubicación *</label>
                    <input name="location" defaultValue={projectData.location} required type="text" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 2: CONFIGURACIÓN Y UNIDADES */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Configuración y Unidades</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Input Units</label>
                    <select name="input_units" defaultValue={projectData.input_units} className="w-full p-2 border rounded bg-white">
                        <option value="Metric">Metric</option>
                        <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Output Units</label>
                    <select name="output_units" defaultValue={projectData.output_units} className="w-full p-2 border rounded bg-white">
                        <option value="Metric">Metric</option>
                        <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Depth Log Page</label>
                    <input name="depth_log_page" defaultValue={projectData.depth_log_page} type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Water Unit</label>
                    <input name="water_unit_w" defaultValue={projectData.water_unit_w} type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 3: PARÁMETROS GEOTÉCNICOS */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Parámetros Geotécnicos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Max Shear Strength</label>
                    <input name="shear_strength_max" defaultValue={projectData.shear_strength_max} type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Water Content</label>
                    <input name="water_content_max" defaultValue={projectData.water_content_max} type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Min K Scale</label>
                    <input name="k_scale_min" defaultValue={projectData.k_scale_min} type="number" step="0.0001" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Increment K Scale</label>
                    <input name="k_scale_increment" defaultValue={projectData.k_scale_increment} type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Consol Factor Coeff</label>
                    <input name="coeff_of_consol_factor" defaultValue={projectData.coeff_of_consol_factor} type="number" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 4: OTROS PARÁMETROS */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Otros Parámetros</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Draft Stamp</label>
                    <input name="draft_stamp" defaultValue={projectData.draft_stamp} type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Dynamic</label>
                    <input name="dynamic_max" defaultValue={projectData.dynamic_max} type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Chamber</label>
                    <input name="chamber_max" defaultValue={projectData.chamber_max} type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Becker</label>
                    <input name="becker_max" defaultValue={projectData.becker_max} type="number" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

            </div>
          </div>
      </form>
    </div>
  );
};

export default EditProject;