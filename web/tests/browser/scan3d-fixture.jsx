// Explicit synthetic software fixture. Never register it in the patient/research dataset.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../../src/contexts/AuthContext';
import Scan3DMeshViewer from '../../src/pages/dentist-portal/x-core/components/3D/Scan3DMeshViewer';
import '../../src/styles/index.css';
const model = 'solid fixture\nfacet normal 0 0 1\nouter loop\nvertex -10 -10 0\nvertex 10 -10 0\nvertex 0 10 0\nendloop\nendfacet\nendsolid fixture';
const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(model))),v=>v.toString(16).padStart(2,'0')).join('');
let downloads = 0;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, options) => {
  if (String(input) === '/v1/x-core/3d-scans/software-fixture/status') return Response.json({scanId:'software-fixture',status:'ready',assets:{mesh:{assetUrl:'/v1/x-core/3d-scans/software-fixture/assets/mesh.stl',sha256:hash,measurementCapability:'visualization_only',clinicalStatus:'experimental',units:'arbitrary',scale:{status:'unvalidated'},provenance:{synthetic:true}}}});
  if (String(input) === '/v1/x-core/3d-scans/software-fixture/assets/mesh.stl') {
    downloads++;
    document.getElementById('downloads').textContent = `Mesh downloads: ${downloads}`;
    return new Response(model);
  }
  return nativeFetch(input,options);
};
createRoot(document.getElementById('fixture')).render(<AuthProvider><p style={{height:60,color:'white',background:'#233',padding:12}}>SYNTHETIC SOFTWARE FIXTURE — no clinical or reconstruction evidence. <span id="downloads">Mesh downloads: 0</span></p><div style={{height:'calc(100vh - 60px)'}}><Scan3DMeshViewer study={{id:'software-fixture',patientName:'Software fixture',status:'ready'}} onBack={()=>{}} /></div></AuthProvider>);
