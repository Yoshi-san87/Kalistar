'use strict';
const original=require('../2026-10-04-white-weapons/sources.cjs');
const rotate=(degrees,body)=>'<g transform="rotate('+degrees+' 128 128)">'+body+'</g>';
const replacements={
  Hache:rotate(-40,
    '<path d="M137 29h13v188h-13zM132 211h23v17h-23zM117 26A55 55 0 0 0 117 136L119 112L142 102V60L119 50Z M153 68H170L177 60V98L170 90H153Z"/>'+
    '<path d="M132 151h23v7h-23zM132 181h23v7h-23z"/>'),
  Dague:rotate(-40,
    '<path fill-rule="evenodd" d="M126 26C122 55 96 88 96 110C95 126 103 141 121 150H136C157 128 154 77 126 26ZM128 71Q115 106 124 128L133 112Z"/>'+
    '<path d="M96 158Q128 180 162 147" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>'+
    '<path d="M120 180h15v30h-15z"/><circle cx="127.5" cy="224" r="12" fill="none" stroke="white" stroke-width="7"/>'),
  Gun:rotate(18,
    '<path fill-rule="evenodd" d="M34 66L50 54H178L185 63H198V89H179L173 98H44L34 90ZM48 73H160V79H48ZM166 65L160 87H166L172 65ZM177 67L171 87H177L183 67Z"/>'+
    '<path d="M48 44h14v7H48zM169 44h15v8h-15zM199 80l12-11l7 7l-10 14z"/>'+
    '<path fill-rule="evenodd" d="M50 104H179L192 115L179 134L205 196Q208 205 196 207L173 209Q167 209 164 201L141 149H116Q92 149 94 130L88 115H50ZM104 116L110 134Q113 141 124 141H139L133 116Z M163 158L177 154L179 160L165 164Z M170 177L184 173L186 179L172 183Z"/>'+
    '<path d="M123 118Q128 126 121 132" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/>'),
  Faucille:rotate(-25,
    '<path d="M156 43h13v186h-13zM150 218h25v11h-25zM167 48C111 21 39 67 29 141C69 89 112 67 157 76Z"/>'+
    '<path d="M151 91h22v8h-22zM151 152h22v8h-22z"/>')
};
module.exports={replacements,definitions:original.map(([family,body])=>[family,replacements[family]||body])};
