import Dexie from 'dexie';

export const db = new Dexie('GeologDB');

// Definición del esquema (Schema)
// ++id = Autoincremental interno de IndexedDB
// Los campos listados son los índices para búsqueda rápida.

db.version(1).stores({
  // ESTRUCTURA JERÁRQUICA
  projects: '++id, project_id, title, client, location, depth_log_page, water_unit_w, input_units, shear_strength_max, water_content_max, k_scale_min, k_scale_increment, draft_stamp, coeff_of_consol_factor, dynamic_max, chamber_max, becker_max, sync_status',
  points: '++id, point_id, project_id, hole_depth, boring_date, soil_drilling_contractor, elevation, plunge, end_soil_depth, start_rock_depth, top_depth_rock, rock_date, rock_drilling_contractor, rock_drilling_rig, depth_log_page, borehole_type, north, east, surveyed, coordinate_system, zone, sync_status',

  // TABLAS DE REGISTRO (PESTAÑAS)
  cores: '++id, core_id, point_id, depth, bottom, run_number, tcr_length, rqd_length, jn, fracture_index, sync_status',
  discontinuities: '++id, discontinuity_id, point_id, depth, type, dip, shape, aperture, roughness_rating, weathering_rating, jcr, condition_discon, jr_roughness, ja_alteration, jn_set, sync_status',
  core_conditions: '++id, core_condition_id, point_id, depth, bottom, type, sync_status',
  
  // Pestaña Tests (Incluye Samples y Hydraulic)
  samples: '++id, sample_id, point_id, depth, bottom, number, type, v_15, v_30, v_45, sample_recobery, blows_limit_depth, sync_status',
  hydraulic_cond: '++id, hydraulic_id, point_id, depth, bottom, k, sync_status',
  
  piezometers: '++id, piezometer_id, point_id, depth, bottom, graphic, description, therm_node_num, lines, color, name, prof_piezo, sync_status',
  soil_profiles: '++id, soil_id, point_id, depth, bottom, graphic, description, unit_summary, linked_sample_id, sync_status',

  // TABLAS DE ACCIÓN RÁPIDA (BOTONES)
  water_observations: '++id, water_id, point_id, depth, water_observation_date, sync_status',
  methods: '++id, method_id, point_id, depth, bottom, method, type, sync_status',

  // TABLAS HIJAS / RELACIONADAS
  strength_weathering: '++id, strength_id, core_id, strength_v1, strength_v2, weathering_v1, weathering_v2, sync_status'
});

// Función auxiliar para generar IDs únicos de texto (Ej: CORE-XYZ123)
export const generateId = (prefix) => {
    // Genera un ID basado en el timestamp y caracteres aleatorios
    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
};