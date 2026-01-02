import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronRight, Pencil } from 'lucide-react';
import { db } from '../db.js';

const PointList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (projectId) {
        db.points.where('project_id').equals(projectId).toArray().then(setPoints);
    }
  }, [projectId]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-blue-900 text-white p-4 shadow-md flex items-center gap-3 sticky top-0 z-10">
        <Link to="/" className="hover:bg-blue-800 p-1 rounded"><ArrowLeft /></Link>
        <div>
          <h1 className="font-bold text-lg">{projectId}</h1>
          <p className="text-xs opacity-80">Lista de Sondeos</p>
        </div>
      </header>
      <div className="p-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-gray-600 font-semibold">PUNTOS (Points)</h2>
           <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Total: {points.length}</span>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {points.map((pt) => (
            <div key={pt.id} className="border-b border-gray-100 flex justify-between items-center bg-white hover:bg-gray-50 relative group">
              
              {/* Botón de Editar (Lápiz) */}
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/edit-point/${projectId}/${pt.point_id}`);
                }}
                className="absolute right-12 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full z-10"
                title="Editar Punto"
              >
                <Pencil size={18} />
              </button>

              {/* Link principal al Dashboard */}
              <Link to={`/point/${pt.point_id}`} className="flex-1 p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-blue-900">{pt.point_id}</span>
                    {!pt.sync_status && <span className="w-2 h-2 rounded-full bg-orange-500" title="No sincronizado"></span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Prof: {pt.hole_depth || 0}m | Elev: {pt.elevation} | {pt.boring_date}
                  </div>
                </div>
                <ChevronRight className="text-gray-400 ml-10" />
              </Link>
            </div>
          ))}
          {points.length === 0 && (
            <div className="p-8 text-center text-gray-500 italic">
                No hay puntos registrados en este proyecto.
            </div>
          )}
        </div>
      </div>
      
      {/* Botón flotante para crear nuevo punto */}
      <Link to={`/project/${projectId}/new-point`} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95">
        <Plus size={28} />
      </Link>
    </div>
  );
};

export default PointList;