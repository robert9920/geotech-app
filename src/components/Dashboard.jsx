import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // Agregado useLocation
import { ArrowLeft, Droplet, Drill } from 'lucide-react';
import { db } from '../db.js';

// IMPORTAMOS LAS PESTAÑAS REALES
import CoreTab from './tabs/CoreTab.jsx';
import DiscontinuityTab from './tabs/DiscontinuityTab.jsx';
import ConditionsTab from './tabs/ConditionsTab.jsx';
import TestsTab from './tabs/TestsTab.jsx';
import SoilTab from './tabs/SoilTab.jsx';
import PiezometerTab from './tabs/PiezometerTab.jsx';

const Dashboard = () => {
  const { pointId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Hook para leer el estado de navegación

  // MODIFICADO: Inicializa activeTab leyendo location.state si existe, si no usa 'core'
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'core');
  
  const [pointData, setPointData] = useState(null);

  useEffect(() => {
    // Si location.state cambia (navegación), actualizamos la pestaña
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const loadPoint = async () => {
      try {
        const pt = await db.points.where('point_id').equals(pointId).first();
        if (pt) {
            setPointData(pt);
        } else {
            navigate('/', { replace: true });
        }
      } catch (error) {
        console.error("Error cargando punto:", error);
      }
    };
    loadPoint();
  }, [pointId, navigate]);

  const handleBack = () => {
      if (pointData && pointData.project_id) {
          navigate(`/project/${pointData.project_id}`, { replace: true });
      } else {
          navigate('/', { replace: true });
      }
  };

  if (!pointData) return <div className="p-10 text-center text-gray-500">Cargando datos del punto...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* HEADER */}
      <header className="bg-blue-900 text-white p-2 shadow-md flex items-center gap-3 sticky top-0 z-20">
          <button onClick={handleBack} className="p-1 hover:bg-blue-800 rounded transition-colors"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">{pointData.point_id}</h1>
            <div className="flex items-center gap-2 text-xs opacity-80 font-mono">
                <span>Prof: {pointData.hole_depth || 0}m</span>
                <span>|</span>
                <span>Elev: {pointData.elevation}</span>
            </div>
          </div>
          <div className="text-xs bg-green-600 px-2 py-1 rounded shadow font-bold tracking-wide">Sync: OK</div>
      </header>

      {/* BARRA DE ACCIONES */}
      <div className="bg-white border-b p-2 flex justify-between items-center shadow-sm px-4">
         <button className="flex items-center gap-1 text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded border border-blue-200 active:bg-blue-100 transition-transform active:scale-95">
            <Droplet size={16} /> Water
         </button>
         <span className="text-[10px] text-gray-300 font-bold tracking-widest uppercase select-none">LOGGING</span>
         <button className="flex items-center gap-1 text-sm font-bold text-orange-700 bg-orange-50 px-3 py-2 rounded border border-orange-200 active:bg-orange-100 transition-transform active:scale-95">
            <Drill size={16} /> Method
         </button>
      </div>

      {/* TABS */}
      <div className="bg-gray-800 text-gray-300 flex overflow-x-auto text-xs sm:text-sm font-medium shadow-inner">
         {['core', 'discontinuity', 'conditions', 'tests', 'soil', 'piezometer'].map(id => (
            <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 px-3 whitespace-nowrap border-b-4 transition-all duration-200 ${
                    activeTab === id 
                    ? 'border-blue-500 text-white bg-gray-700 font-bold' 
                    : 'border-transparent hover:bg-gray-700 hover:text-gray-100'
                }`}
            >
                {id.toUpperCase()}
            </button>
         ))}
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-20">
         {activeTab === 'core' && <CoreTab pointId={pointId} projectId={pointData.project_id} />}
         {activeTab === 'discontinuity' && <DiscontinuityTab pointId={pointId} projectId={pointData.project_id} />}
         {activeTab === 'conditions' && <ConditionsTab pointId={pointId} projectId={pointData.project_id}/>}
         {activeTab === 'tests' && <TestsTab pointId={pointId} projectId={pointData.project_id}/>}
         {activeTab === 'soil' && <SoilTab pointId={pointId} projectId={pointData.project_id}/>}
         {activeTab === 'piezometer' && <PiezometerTab pointId={pointId} projectId={pointData.project_id}/>}
      </div>
    </div>
  );
};

export default Dashboard;