import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProjectList from './components/ProjectList.jsx';
import PointList from './components/PointList.jsx';
import NewPoint from './components/NewPoint.jsx';
import Dashboard from './components/Dashboard.jsx';
import NewProject from './components/NewProject.jsx';
import EditProject from './components/EditProject.jsx';
import EditPoint from './components/EditPoint.jsx';
import EditCore from './components/tabs/EditCore.jsx';
import StrengthWeathering from './components/tabs/StrengthWeathering.jsx';
import EditDiscontinuity from './components/tabs/EditDiscontinuity.jsx';
import EditSample  from './components/tabs/EditSample.jsx'; 
import EditSoil from './components/tabs/EditSoil.jsx';  
import EditPiezometer from './components/tabs/EditPiezometer.jsx';
import EditHydraulic from './components/tabs/EditHydraulic.jsx';
import EditConditions from './components/tabs/EditConditions.jsx';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route path="/edit-project/:projectId" element={<EditProject />} />

        <Route path="/project/:projectId" element={<PointList />} />
        <Route path="/project/:projectId/new-point" element={<NewPoint />} />
        <Route path="/edit-point/:projectId/:pointId" element={<EditPoint />} />
        
        <Route path="/edit-core/:projectId/:pointId/:coreId" element={<EditCore />} />
        <Route path="/strength-weathering/:projectId/:pointId/:coreId" element={<StrengthWeathering />} />
        
        <Route path="/edit-discontinuity/:projectId/:pointId/:discontinuityId" element={<EditDiscontinuity />} />

        <Route path="/edit-conditions/:projectId/:pointId/:conditionId" element={<EditConditions />} />

        <Route path="/edit-sample/:projectId/:pointId/:sampleId" element={<EditSample />} />

        <Route path="/edit-soil/:projectId/:pointId/:soilId" element={<EditSoil />} />

        <Route path="/edit-hydraulic/:projectId/:pointId/:hydraulicId" element={<EditHydraulic />} />

        <Route path="/edit-piezometer/:projectId/:pointId/:piezometerId" element={<EditPiezometer />} />

        <Route path="/point/:pointId" element={<Dashboard />} />

      </Routes>
    </Router>
  );
};

export default App;