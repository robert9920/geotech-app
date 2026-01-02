import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { db } from '../db.js'; // Importación correcta con .js

const NewProject = () => {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    // Objeto con los campos exactos solicitados
    const newProject = {
        // --- Strings (Obligatorios) ---
        project_id: form.project_id.value,
        client: form.client.value,
        title: form.title.value,
        location: form.location.value,
        
        // --- Integers (Enteros) ---
        depth_log_page: parseInt(form.depth_log_page.value) || 0,
        draft_stamp: parseInt(form.draft_stamp.value) || 0,
        coeff_of_consol_factor: parseInt(form.coeff_of_consol_factor.value) || 0,
        dynamic_max: parseInt(form.dynamic_max.value) || 0,
        chamber_max: parseInt(form.chamber_max.value) || 0,
        becker_max: parseInt(form.becker_max.value) || 0,

        // --- Floats (Decimales) ---
        water_unit_w: parseFloat(form.water_unit_w.value) || 0,
        shear_strength_max: parseFloat(form.shear_strength_max.value) || 0,
        water_content_max: parseFloat(form.water_content_max.value) || 0,
        k_scale_min: parseFloat(form.k_scale_min.value) || 0,
        k_scale_increment: parseFloat(form.k_scale_increment.value) || 0,

        // --- Strings (Opcionales / Config) ---
        input_units: form.input_units.value,
        output_units: form.output_units.value,

        // --- Sistema ---
        sync_status: 0 // 0 = Pendiente de sincronización
    };

    try {
        // Verificación simple de ID duplicado
        const existing = await db.projects.where('project_id').equals(newProject.project_id).count();
        if (existing > 0) {
            alert('Error: Ya existe un proyecto con ese ID.');
            return;
        }

        await db.projects.add(newProject);
        navigate('/'); // Volver a la lista de proyectos
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Ocurrió un error al guardar el proyecto.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <header className="bg-white text-gray-800 p-4 shadow-sm flex items-center justify-between border-b sticky top-0 z-10">
            <button type="button" onClick={() => navigate('/')} className="text-gray-600 flex items-center gap-1">
                <X size={20}/> Cancelar
            </button>
            <h1 className="font-bold text-lg">Nuevo Proyecto</h1>
            <button type="submit" className="text-blue-600 font-bold flex items-center gap-1">
                <Save size={18}/> Guardar
            </button>
          </header>
          
          <div className="p-4 flex-1 overflow-auto pb-20">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* SECCIÓN 1: DATOS GENERALES (Obligatorios) */}
              <section className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-600">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ID Proyecto *</label>
                    <input name="project_id" required type="text" className="w-full p-2 border rounded font-bold" placeholder="Ej. W51-2025-D01-7438" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Proyecto *</label>
                    <input name="title" required type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cliente *</label>
                    <input name="client" required type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ubicación *</label>
                    <input name="location" required type="text" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 2: CONFIGURACIÓN Y UNIDADES */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Configuración y Unidades</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Input Units</label>
                    <select name="input_units" className="w-full p-2 border rounded bg-white">
                        <option value="Metric">Metric</option>
                        <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Output Units</label>
                    <select name="output_units" className="w-full p-2 border rounded bg-white">
                        <option value="Metric">Metric</option>
                        <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Depth Log Page (Entero)</label>
                    <input name="depth_log_page" type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Water Unit (Decimal)</label>
                    <input name="water_unit_w" type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 3: PARÁMETROS GEOTÉCNICOS */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Parámetros Geotécnicos (Límites)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Max Shear Strength</label>
                    <input name="shear_strength_max" type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Water Content</label>
                    <input name="water_content_max" type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Min K Scale</label>
                    <input name="k_scale_min" type="number" step="0.0001" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Increment K Scale</label>
                    <input name="k_scale_increment" type="number" step="0.01" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Consol Factor Coeff</label>
                    <input name="coeff_of_consol_factor" type="number" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

              {/* SECCIÓN 4: OTROS PARÁMETROS (Enteros) */}
              <section className="bg-white p-5 rounded-lg shadow-sm">
                <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm border-b pb-2">Otros Parámetros</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div>
                    <label className="block text-xs font-medium text-gray-500">Draft Stamp</label>
                    <input name="draft_stamp" type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Dynamic</label>
                    <input name="dynamic_max" type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Chamber</label>
                    <input name="chamber_max" type="number" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Max Becker</label>
                    <input name="becker_max" type="number" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </section>

            </div>
          </div>
      </form>
    </div>
  );
};

export default NewProject;