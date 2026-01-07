import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../db.js';

const ExportExcelButton = ({ projectId }) => {
  const [exporting, setExporting] = useState(false);

  // --- HELPER: Cálculos Geotécnicos ---
  const calculateNValue = (v15, v30, v45) => {
    const v1 = parseInt(v15) || 0;
    const v2 = parseInt(v30) || 0;
    const v3 = parseInt(v45) || 0;
    if (v1 >= 50) return "R";
    if ((v2 + v3) >= 50) return "R";
    return v2 + v3;
  };

  const calculatePercentage = (len, totalLen) => {
      if (!totalLen || totalLen <= 0) return 0;
      return ((len / totalLen) * 100).toFixed(0);
  };

  // Función auxiliar para extraer el valor numérico de las etiquetas (ej: "R3 - Media" -> 3)
  const extractValue = (str) => {
      if (!str) return null;
      // Busca R o W seguido de un número al inicio
      const match = str.match(/^[RW](\d+)/);
      return match ? parseInt(match[1], 10) : null;
  };

  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);

    try {
      // 1. Obtener información base del Proyecto
      // Usamos .where().equals() porque project_id es un índice, no la llave primaria (++id)
      const project = await db.projects.where('project_id').equals(projectId).first();
      
      const points = await db.points.where('project_id').equals(projectId).toArray();

      // Arrays acumuladores para cada hoja del Excel
      const sheets = {
        'Proyecto Info': [],
        'Puntos (Cabecera)': [],
        'Perforacion (Cores)': [],
        'Discontinuidades': [],
        'Condiciones': [],
        'Ensayos SPT-LPT': [],
        'Permeabilidad (Hydraulic)': [],
        'Perfil Suelo': [],
        'Piezometros': [],
        'Metodos': [],
        'Nivel Freatico': []
      };

      // --- HOJA: PROYECTO (Datos generales) ---
      if (project) {
          sheets['Proyecto Info'].push({
              'Project ID': project.project_id,
              'Título': project.title,
              'Cliente': project.client,
              'Ubicación': project.location,
              'Unidad Agua': project.water_unit_w,
              'Input Units': project.input_units,
              'Output Units': project.output_units,
              'Shear Max': project.shear_strength_max,
              'Water Content Max': project.water_content_max,
              'K Scale Min': project.k_scale_min,
              'K Scale Increment': project.k_scale_increment,
              'Draft Stamp': project.draft_stamp,
              'Coeff Consol Factor': project.coeff_of_consol_factor,
              'Dynamic Max': project.dynamic_max,
              'Chamber Max': project.chamber_max,
              'Becker Max': project.becker_max,
              'Depth Log Page': project.depth_log_page
          });
      } else {
          console.warn("No se encontró proyecto con ID:", projectId);
      }

      // 2. Recorrer cada punto
      for (const point of points) {
        const pId = point.point_id;

        // --- HOJA: PUNTOS (Todos los campos) ---
        sheets['Puntos (Cabecera)'].push({
            'Point ID': pId,
            'Project ID': point.project_id,
            'Profundidad Total': point.hole_depth,
            'Elevación': point.elevation,
            'Norte': point.north,
            'Este': point.east,
            'Zona': point.zone,
            'Sistema Coord.': point.coordinate_system,
            'Surveyed': point.surveyed ? 'SI' : 'NO',
            'Fecha Perforación': point.boring_date,
            'Contratista Suelo': point.soil_drilling_contractor,
            'End Soil Depth': point.end_soil_depth,
            'Start Rock Depth': point.start_rock_depth,
            'Top Depth Rock': point.top_depth_rock,
            'Fecha Roca': point.rock_date,
            'Contratista Roca': point.rock_drilling_contractor,
            'Equipo Roca': point.rock_drilling_rig,
            'Plunge': point.plunge,
            'Borehole Type': point.borehole_type,
            'Página Log': point.depth_log_page,
            'Estado Sync': point.sync_status
        });

        // --- HOJA: CORES (+ Strength/Weathering + Cálculos) ---
        const cores = await db.cores.where('point_id').equals(pId).toArray();
        const coresSorted = cores.sort((a,b) => a.depth - b.depth);
        
        for (const c of coresSorted) {
            const length = c.bottom - c.depth;
            const sw = await db.strength_weathering.where('core_id').equals(c.core_id).first();

            // --- LÓGICA DE CÁLCULO STR/WEATH ---
            let strIdx = '-';
            let weaIdx = '-';

            if (sw) {
                const s1 = extractValue(sw.strength_v1);
                const s2 = extractValue(sw.strength_v2);
                if (s1 !== null && s2 !== null) strIdx = (s1 + s2) / 2;

                const w1 = extractValue(sw.weathering_v1);
                const w2 = extractValue(sw.weathering_v2);
                if (w1 !== null && w2 !== null) weaIdx = (w1 + w2) / 2;
            }
            // ------------------------------------

            sheets['Perforacion (Cores)'].push({
                'Punto ID': pId,
                'Core ID': c.core_id,
                'Corrida #': c.run_number,
                'Desde (m)': c.depth,
                'Hasta (m)': c.bottom,
                'Longitud (m)': length.toFixed(2),
                'TCR (m)': c.tcr_length,
                'TCR (%)': calculatePercentage(c.tcr_length, length),
                'RQD (m)': c.rqd_length,
                'RQD (%)': calculatePercentage(c.rqd_length, length),
                'Str. Idx': strIdx, // Nueva Columna
                'Weath. Idx': weaIdx, // Nueva Columna
                'Jn': c.jn,
                'Strength V1': sw?.strength_v1 || '',
                'Strength V2': sw?.strength_v2 || '',
                'Weathering V1': sw?.weathering_v1 || '',
                'Weathering V2': sw?.weathering_v2 || ''
            });
        }

        // --- HOJA: DISCONTINUIDADES ---
        const discs = await db.discontinuities.where('point_id').equals(pId).toArray();
        discs.sort((a,b) => a.depth - b.depth).forEach(d => {
            sheets['Discontinuidades'].push({
                'Punto ID': pId,
                'Disc. ID': d.discontinuity_id,
                'Prof. (m)': d.depth,
                'Tipo': d.type,
                'Dip (°)': d.dip,
                'Forma (Shape)': d.shape,
                'Aperture (Code)': d.aperture,
                'Roughness Rating': d.roughness_rating,
                'Weathering Rating': d.weathering_rating,
                'JCR': d.jcr,
                'Condition': d.condition_discon,
                'Jr (Roughness)': d.jr_roughness,
                'Ja (Alteration)': d.ja_alteration,
                'Jn (Set)': d.jn_set
            });
        });

        // --- HOJA: CONDICIONES ---
        const conds = await db.core_conditions.where('point_id').equals(pId).toArray();
        conds.sort((a,b) => a.depth - b.depth).forEach(c => {
            sheets['Condiciones'].push({
                'Punto ID': pId,
                'Cond. ID': c.core_condition_id,
                'Desde (m)': c.depth,
                'Hasta (m)': c.bottom,
                'Tipo': c.type
            });
        });

        // --- HOJA: SAMPLES (SPT) ---
        const samples = await db.samples.where('point_id').equals(pId).toArray();
        samples.sort((a,b) => a.depth - b.depth).forEach(s => {
            sheets['Ensayos SPT-LPT'].push({
                'Punto ID': pId,
                'Sample ID': s.sample_id,
                'Muestra #': s.number,
                'Desde (m)': s.depth,
                'Hasta (m)': s.bottom,
                'Tipo': s.type,
                'Golpes 0-15': s.v_15,
                'Golpes 15-30': s.v_30,
                'Golpes 30-45': s.v_45,
                'N-Value (Calc)': calculateNValue(s.v_15, s.v_30, s.v_45),
                'Blows Limit': s.blows_limit_depth
            });
        });

        // --- HOJA: HYDRAULIC ---
        const hydros = await db.hydraulic_cond.where('point_id').equals(pId).toArray();
        hydros.sort((a,b) => a.depth - b.depth).forEach(h => {
            sheets['Permeabilidad (Hydraulic)'].push({
                'Punto ID': pId,
                'Hydraulic ID': h.hydraulic_id,
                'Ensayo #': h.number,
                'Desde (m)': h.depth,
                'Hasta (m)': h.bottom,
                'K (Raw)': h.K,
                'Check (Muy Permeable)': h.check ? 'SI' : 'NO',
                'K (Display)': (h.check || h.K >= 0.1) ? 'MUY PERMEABLE' : h.K?.toExponential(2)
            });
        });

        // --- HOJA: PERFIL SUELO ---
        const soils = await db.soil_profiles.where('point_id').equals(pId).toArray();
        soils.sort((a,b) => a.depth - b.depth).forEach(s => {
            sheets['Perfil Suelo'].push({
                'Punto ID': pId,
                'Soil ID': s.soil_id,
                'Prof. (m)': s.depth,
                'Fondo (m)': s.bottom,
                'USCS (Graphic)': s.graphic,
                'Descripción': s.description,
                'Resumen (Unit)': s.unit_summary,
                'Linked Sample ID': s.linked_sample_id || '-',
                'Linked Hydraulic ID': s.linked_hydraulic_id || '-'
            });
        });

        // --- HOJA: PIEZOMETROS ---
        const piezos = await db.piezometers.where('point_id').equals(pId).toArray();
        piezos.forEach(p => {
            sheets['Piezometros'].push({
                'Punto ID': pId,
                'Piezo ID': p.piezometer_id,
                'Nombre': p.name,
                'Desde (m)': p.depth,
                'Hasta (m)': p.bottom,
                'Prof. Sensor (m)': p.prof_piezo,
                'Gráfico': p.graphic,
                'Descripción': p.description,
                'Therm Node': p.therm_node_num,
                'Lines (Bool)': p.lines ? 'YES' : 'NO',
                'Color': p.color
            });
        });

        // --- HOJA: METODOS ---
        const methods = await db.methods.where('point_id').equals(pId).toArray();
        methods.forEach(m => {
            sheets['Metodos'].push({
                'Punto ID': pId,
                'Method ID': m.method_id,
                'Categoría': m.method,
                'Desde (m)': m.depth,
                'Hasta (m)': m.bottom,
                'Tipo Maquinaria': m.type
            });
        });

        // --- HOJA: NIVEL FREATICO ---
        const water = await db.water_observations.where('point_id').equals(pId).first();
        if (water) {
            sheets['Nivel Freatico'].push({
                'Punto ID': pId,
                'Water ID': water.water_id,
                'Profundidad (m)': water.depth,
                'Fecha Obs.': water.water_observation_date,
            });
        }
      }

      // 3. Crear el Workbook
      const wb = XLSX.utils.book_new();

      // 4. Agregar hojas
      Object.keys(sheets).forEach(sheetName => {
        const data = sheets[sheetName];
        if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length + 5, 15) }));
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });

      // 5. Descargar
      const fileName = `GeoData_${project ? project.project_id : project.title}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error("Error exportando Excel:", error);
      alert("Hubo un error generando el Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button 
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm disabled:opacity-50 border border-green-600"
        title="Descargar reporte Excel con todos los campos"
    >
        {exporting ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16} />}
        {exporting ? 'Generando...' : 'Excel'}
    </button>
  );
};

export default ExportExcelButton;