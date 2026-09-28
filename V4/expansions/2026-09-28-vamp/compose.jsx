#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../2026-09-27-metal-gear-mines/compose-one.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
composeMines(home+'cards/vamp/',root);
'Vamp composed';
