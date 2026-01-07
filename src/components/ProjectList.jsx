import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Activity, Box, Plus, Pencil } from 'lucide-react';
import { db } from '../db.js';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
        const data = await db.projects.toArray();
        setProjects(data);
    };
    loadData();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><Box /> GeoLog Collector</h1>
      </header>
      
      <div className="p-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-gray-600 font-semibold">MIS PROYECTOS</h2>
           <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Total: {projects.length}</span>
        </div>

        <div className="grid gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow border-l-4 border-blue-600 relative hover:shadow-md transition group">
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/edit-project/${p.project_id}`);
                }}
                className="absolute top-3 right-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                title="Editar Proyecto"
              >
                <Pencil size={18} />
              </button>

              <Link to={`/project/${p.project_id}`} className="block p-4 pr-12">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-gray-800">{p.project_id}</h3>
                </div>
                <p className="text-blue-800 font-medium mb-2">{p.title}</p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {p.location}</span>
                    <span className="flex items-center gap-1"><Activity size={14}/> {p.client}</span>
                </div>
                <div className="mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${p.sync_status ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {p.sync_status ? 'Sincronizado' : 'Pendiente'}
                    </span>
                </div>
              </Link>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="text-center p-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                <p>No hay proyectos creados.</p>
                <p className="text-sm">Pulsa el botón + para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      <Link to="/new-project" className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 z-20">
        <Plus size={28} />
      </Link>
    </div>
  );
};

export default ProjectList;