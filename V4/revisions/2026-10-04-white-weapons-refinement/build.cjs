'use strict';
const {build}=require('../2026-10-04-white-weapons/build.cjs');
const {definitions}=require('./sources.cjs');
build({definitions,directory:__dirname,radii:{Faucille:42.8}}).catch(error=>{console.error(error);process.exitCode=1;});
