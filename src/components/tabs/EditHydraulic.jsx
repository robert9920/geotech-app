import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Droplets } from 'lucide-react';
import { db } from '../../db.js';

const EditHydraulic = () => {
  const { activePointId, hydraulicId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    hydraulic_id: '',
    depth: '',
    bottom: '',
    K: '',
    check: false,
    number: 0, // Se mantiene para la descripción, no se edita
    point_id: ''
  });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const item = await db.hydraulic_cond.where('hydraulic_id').equals(hydraulicId).first();
        if (item) {
          setFormData(item);
        } else {
          alert("Ensayo no encontrado");
          handleReturn();
        }
      } catch (error) {
        console.error(error);
        handleReturn();
      } finally {
        setLoading(false);
      }
    };
    // Simulamos carga si hay ID
    if (hydraulicId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydraulicId]);

  const handleReturn = () => {
    const targetPointId = activePointId || formData?.point_id;
    if (targetPointId) {
        navigate(`/point/${encodeURIComponent(targetPointId)}?tab=tests`, { state: { activeTab: 'tests' }, replace: true });
    } else {
        navigate(-1);
    }
  };

  // Helper para generar descripción (Misma lógica que TestsTab)
  const generateHydraulicDescription = (number, depth, bottom, kValue, isChecked) => {
    const d = parseFloat(depth).toFixed(2);
    const b = parseFloat(bottom).toFixed(2);
    const numPad = String(number).padStart(2, '0');
    
    let kText = '';
    if (isChecked ) {
        kText = 'MUY PERMEABLE';
    } else {
        const sci = kValue.toExponential(2);
        kText = `${sci.replace('e', 'x10')}cm/s`;
    }

    return `Ensayo de Permeabilidad N°${number}\nLFCC-${numPad}: (${d} m - ${b} m)\nK=${kText}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
        setFormData({ ...formData, [name]: checked });
    } else {
        if (type === 'number' && parseFloat(value) < 0) return;
        setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const depthVal = parseFloat(formData.depth);
    const bottomVal = parseFloat(formData.bottom);
    // K es opcional si check está activo, sino es obligatorio (o 0)
    const kVal = formData.K ? parseFloat(formData.K) : 0;

    // Validaciones
    if (isNaN(depthVal) || isNaN(bottomVal)) { alert("Profundidades requeridas"); return; }
    if (bottomVal < depthVal) { alert("Bottom debe ser mayor a Depth"); return; }
    //if (!formData.check && !formData.K) { alert("Ingrese valor K o marque 'Muy Permeable'"); return; }

    try {
      await db.transaction('rw', [db.hydraulic_cond, db.soil_profiles], async () => {
          
          // 1. Actualizar Hydraulic Record
          await db.hydraulic_cond.update(formData.id, {
            depth: depthVal,
            bottom: bottomVal,
            K: kVal,
            check: formData.check,
            sync_status: 0
          });

          // 2. Actualizar Soil Profile vinculado
          const linkedProf = await db.soil_profiles.where('linked_hydraulic_id').equals(formData.hydraulic_id).first();
          if (linkedProf) {
            const newDesc = generateHydraulicDescription(formData.number, depthVal, bottomVal, kVal, formData.check);
            
            await db.soil_profiles.update(linkedProf.id, {
                depth: (depthVal + bottomVal) / 2, // Actualizar profundidad promedio
                //bottom: bottomVal,
                description: newDesc,
                sync_status: 0
            });
          }
      });

      alert('Ensayo actualizado correctamente');
      handleReturn();

    } catch (error) {
        console.error("Error update:", error);
        alert("Error al actualizar");
    }
  };

  if (loading || !formData) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white p-4 shadow-sm flex justify-between border-b sticky top-0 z-20">
        <button type="button" onClick={handleReturn} className="text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
            <X size={24}/> Cancelar
        </button>
        <h1 className="font-bold text-xl flex items-center gap-2 text-cyan-600">
            <Droplets size={24}/> Editar Permeabilidad
        </h1>
        <button onClick={handleSubmit} className="text-white bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Save size={20}/> Actualizar
        </button>
      </header>

      <div className="p-4 md:p-6 flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-cyan-200">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="text-sm font-bold text-gray-500 block mb-1">Depth (m)</label>
                    <input name="depth" type="number" step="0.01" value={formData.depth} onChange={handleChange} className="w-full p-3 border rounded-lg font-bold focus:ring-2 focus:ring-cyan-500 outline-none" required/>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-500 block mb-1">Bottom (m)</label>
                    <input name="bottom" type="number" step="0.01" value={formData.bottom} onChange={handleChange} className="w-full p-3 border rounded-lg font-bold focus:ring-2 focus:ring-cyan-500 outline-none" required/>
                </div>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-cyan-800">Valor K (Permeabilidad)</label>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-cyan-200">
                        <input 
                            name="check" 
                            type="checkbox" 
                            checked={formData.check} 
                            onChange={handleChange} 
                            className="w-4 h-4 cursor-pointer text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-xs font-bold text-cyan-700">¿Muy Permeable?</span>
                    </div>
                </div>
                
                <input 
                    name="K" 
                    type="number" 
                    step="0.00000001" 
                    value={formData.K} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg text-lg font-mono focus:ring-2 focus:ring-cyan-500 outline-none transition-colors"
                    placeholder={formData.check ? "Opcional (Muy Permeable activo)" : "e.g. 1.2e-5"}
                />
                <p className="text-xs text-gray-500 mt-2">
                    Si marcas "Muy Permeable", la descripción del perfil ignorará el valor numérico, pero este se guardará de todos modos.
                </p>
            </div>

        </form>
      </div>
    </div>
  );
};

export default EditHydraulic;