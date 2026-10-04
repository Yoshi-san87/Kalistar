'use strict';
// Original vector redraws of the established white weapon silhouettes.
const diagonal = body => '<g transform="rotate(-45 128 128)">' + body + '</g>';
const line = (d, width = 9) => '<path d="' + d + '" fill="none" stroke="white" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"/>';
const sword = (blade, guard, grip) => diagonal('<path d="' + blade + '"/>' + line(guard, 10) + '<path d="' + grip + '"/>');
module.exports = [
  ['Hache', diagonal('<path d="M122 40h12v169h-12zM118 202h20v22h-20zM117 57C102 69 84 72 61 66C62 91 79 113 111 117L109 102L120 89zM139 49L165 42L164 65L142 74z"/>' + line('M111 78L145 78', 10))],
  ['Marteau', diagonal('<path d="M64 54Q60 54 60 60V99Q60 105 66 105H116V54zM140 54V105H190Q196 105 196 99V60Q196 54 190 54zM122 49h12v62h-12zM122 120h12v88h-12zM117 204h22v22h-22z"/>')],
  ['Masse', diagonal('<path fill-rule="evenodd" d="M120 34h16l4 19l17-12l12 12l-12 17l19 4v16l-19 4l12 17l-12 12l-17-12l-4 19h-16l-4-19l-17 12l-12-12l12-17l-19-4V74l19-4l-12-17l12-12l17 12zM128 70a12 12 0 1 0 0 24a12 12 0 1 0 0-24"/><path d="M122 142h12v39h-12zM118 186h20v11h-20zM122 202h12v12h-12zM116 218h24v11h-24z"/>')],
  ['Poing', diagonal('<path d="M81 38Q74 77 78 113H94Q91 78 81 38M128 26Q116 70 120 113h16Q140 70 128 26M175 38Q165 78 162 113h16Q182 77 175 38M72 121h112v16H72zM80 144h96v16H80z"/>' + line('M88 169L80 191L93 219H163L176 191L168 169Z',12))],
  ['Fléau', null],
  ['Arc', line('M69 197C67 155 50 124 93 88C128 50 160 66 198 65',10) + line('M69 197L198 65',4) + line('M62 60L198 196',7) + '<path d="M44 44L70 53L53 70ZM173 181L191 177L213 199L195 201L191 216L171 195Z"/>'],
  ['Fouet', line('M178 68C143 20 66 34 48 80C18 151 91 181 133 138C168 104 208 125 210 165C213 203 188 225 168 210',9) + '<path d="M175 75L184 66L218 100Q222 105 216 111L208 119Q203 124 198 119L164 85z"/>' + line('M165 74L179 60',9)],
  ['Gun', '<g transform="rotate(24 128 128)"><path fill-rule="evenodd" d="M38 64h143v-8h13v12l18 12v17h-22l-8 12l24 72q3 9-7 12l-29 7q-9 2-12-8l-18-55h-28q-15 0-19-13l-4-16H38zM100 108l4 13q2 6 10 6h23l-6-19z"/><path d="M forty  fifty h139v8H40z"/><path d="M forty 82H174" fill="none" stroke="#081d29" stroke-width="6"/></g>'.replaceAll('forty','40').replace('fifty','50')],
  ['Lance', diagonal('<path d="M128 23C122 50 109 75 90 88L117 90h22l27-2C148 75 134 50 128 23z"/>' + line('M114 100H142',8) + '<path d="M123 112h10v100h-10zM128 216l8 10l-8 11l-8-11z"/>')],
  ['Projectile', '<path d="M54 173C22 134 40 76 82 49C112 30 145 34 167 44L149 60C116 52 85 72 73 101C64 123 60 147 70 163ZM202 83C234 122 216 180 174 207C144 226 111 222 89 212L107 196C140 204 171 184 183 155C192 133 196 109 186 93Z"/>' + line('M172 57L177 62M183 69L187 74M80 199L75 194M69 187L65 182',7)],
  ['Bâton', diagonal(line('M128 221V96C128 80 152 82 151 60C150 42 130 35 114 42C99 49 101 63 89 66',15) + '<path d="M111 109h34v10h-34zM111 124h34v8h-34z"/>')],
  ['Instrument', diagonal('<path fill-rule="evenodd" d="M109 106C96 96 81 104 84 121C87 134 86 140 73 151C44 175 61 219 91 226C124 237 159 219 174 193C189 164 182 142 162 136C146 132 142 125 141 113C140 97 125 95 120 106V72h-11zM124 153a14 14 0 1 0 0 28a14 14 0 1 0 0-28"/><path d="M109 40h11v103h-11zM104 26h21v32h-21z"/>' + line('M96 32h9M96 46h9M124 32h9M124 46h9',6) + '<path d="M103 199h45" fill="none" stroke="#081d29" stroke-width="8" stroke-linecap="round"/>')],
  ['Sceptre', diagonal('<path d="M123 121h10v98h-10zM128 219l9 13l-9 9l-9-9zM112 102h32v12h-32zM128 35L147 59L128 90L109 59Z"/>' + line('M112 95C83 94 90 70 83 60M144 95C173 94 166 70 173 60',8) + '<path d="M128 23l5 8h-10z"/>')],
  ['Tome', '<g transform="rotate(-20 128 128)"><path fill-rule="evenodd" d="M76 42H183Q197 42 197 57V204H76Q57 204 57 185V60Q57 42 76 42ZM82 56V170H183V56ZM77 180Q67 180 67 187Q67 194 77 194H187V180Z"/>' + line('M51 70H74M51 110H74M51 150H74',9) + '<path d="M132 90L144 110L132 130L120 110Z"/></g>'],
  ['Orbe', line('M172 60C144 43 104 40 70 69C43 92 43 131 65 161C89 194 141 197 175 170C204 145 207 98 184 75',8) + line('M155 70C178 80 185 100 183 120',6) + '<path d="M71 181h107q13 0 13 14v17H58v-17q0-14 13-14M93 91l5 12l12 5l-12 5l-5 12l-5-12l-12-5l12-5zM62 32l5 9l9 5l-9 5l-5 9l-5-9l-9-5l9-5zM39 70l4 8l8 4l-8 4l-4 8l-4-8l-8-4l8-4z"/>'],
  ['Dague', sword('M128 30L150 70V137H106V70Z','M90 150H166','M117 166h22v43l-11 13l-11-13z')],
  ['Epée courte', sword('M128 29L142 60V147H114V60Z','M90 153Q128 170 166 153','M122 174h12v39h-12zM116 215h24v10h-24z')],
  ['Epée longue', sword('M128 20L149 50V158H107V50Z','M90 168Q128 158 166 168','M122 182h12v36h-12zM117 222h22v11h-22z')],
  ['Katana', diagonal('<path d="M119 25Q111 80 118 155H132Q122 81 129 33Z"/>' + line('M103 166L145 163',9) + '<path d="M120 178h12v48h-12z"/>' + line('M116 180L135 188M116 195L135 203M116 210L135 218',4))],
  ['Faucille', diagonal('<path d="M122 61h12v165h-12zM135 52C92 49 58 70 48 111C75 82 96 76 121 80Z"/>' + line('M117 59H140',7))]
];
