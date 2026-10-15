'use strict';
const center=[136,116];
const outline=[[136,28],[158,94],[224,116],[158,138],[136,204],[114,138],[48,116],[114,94]];
const body='<path fill-rule="evenodd" d="M'+outline.map(p=>p.join(' ')).join('L')+'ZM136 102L150 116L136 130L122 116Z"/>'+
  '<path d="M32 189L71 150M48 222L91 179" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>';
module.exports={center,outline,body};
