'use strict';

/*
 * Build the editorial illustration shelf. Every master below is authored as
 * deterministic SVG geometry, then rasterised locally with Sharp. The SVGs
 * stay beside their WebP derivatives so a future editor can tune shapes
 * without reverse engineering a bitmap.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets-source', 'library', 'editorial');
const C = {
  petrol: '#173e49',
  ink: '#172d38',
  paper: '#f4ead4',
  cream: '#fff7e4',
  amber: '#dbac60',
  sage: '#87a997',
  terracotta: '#b76d52',
  clay: '#ce8b69',
  rust: '#8d5145',
  sea: '#4f8190',
  moss: '#547663',
  rose: '#d28f88',
  ochre: '#b88847',
};

const svg = (width, height, title, body, defs = '') => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <title>${title}</title>
  <defs>
    <pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="5" r="1.2" fill="${C.ink}" opacity=".16"/>
      <circle cx="16" cy="13" r=".9" fill="${C.ink}" opacity=".12"/>
      <circle cx="9" cy="20" r=".7" fill="${C.ink}" opacity=".1"/>
    </pattern>
    <pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.8" fill="${C.amber}" opacity=".38"/>
    </pattern>
    ${defs}
  </defs>
  <style>
    .line{stroke:${C.ink};stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
    .fine{stroke:${C.ink};stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .paper-line{stroke:${C.paper};stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
  </style>
  ${body}
</svg>
`;

const roomBase = (body) => `
  <rect width="1200" height="600" fill="${C.paper}"/>
  <rect width="1200" height="600" fill="url(#grain)" opacity=".22"/>
  <path d="M0 458 C180 424 325 478 510 448 C712 417 926 466 1200 428 V600 H0Z" fill="${C.terracotta}" opacity=".72"/>
  <path d="M0 498 C190 470 335 514 526 481 C730 446 1000 499 1200 456 V600 H0Z" fill="${C.rust}" opacity=".36"/>
  <path d="M48 52 H1152" class="fine" opacity=".34"/>
  <path d="M48 548 H1152" class="line" opacity=".52"/>
  ${body}
  <path d="M35 35 H1165 V565 H35Z" fill="none" class="fine" opacity=".55"/>
`;

function readingRoom() {
  const body = `
    <path d="M73 420 V136 H406 V420Z" fill="${C.sage}" opacity=".46"/>
    <path d="M92 400 V151 H390" class="line" opacity=".36"/>
    <path d="M104 190 H372 M104 252 H372 M104 314 H372" class="fine" opacity=".62"/>
    <g>
      <rect x="111" y="203" width="30" height="42" rx="4" fill="${C.terracotta}"/>
      <rect x="148" y="189" width="26" height="56" rx="4" fill="${C.amber}"/>
      <rect x="182" y="197" width="34" height="48" rx="4" fill="${C.petrol}"/>
      <rect x="223" y="181" width="28" height="64" rx="4" fill="${C.clay}"/>
      <rect x="259" y="198" width="23" height="47" rx="4" fill="${C.rust}"/>
      <rect x="290" y="188" width="34" height="57" rx="4" fill="${C.moss}"/>
      <rect x="330" y="202" width="30" height="43" rx="4" fill="${C.ochre}"/>
      <rect x="114" y="266" width="44" height="34" rx="4" fill="${C.petrol}"/>
      <rect x="166" y="273" width="27" height="27" rx="4" fill="${C.terracotta}"/>
      <rect x="202" y="262" width="38" height="38" rx="4" fill="${C.amber}"/>
      <rect x="249" y="270" width="29" height="30" rx="4" fill="${C.clay}"/>
      <rect x="287" y="259" width="44" height="41" rx="4" fill="${C.moss}"/>
      <rect x="339" y="272" width="20" height="28" rx="4" fill="${C.rose}"/>
      <rect x="110" y="328" width="23" height="45" rx="4" fill="${C.amber}"/>
      <rect x="140" y="341" width="36" height="32" rx="4" fill="${C.petrol}"/>
      <rect x="185" y="332" width="28" height="41" rx="4" fill="${C.terracotta}"/>
      <rect x="221" y="344" width="44" height="29" rx="4" fill="${C.rust}"/>
      <rect x="274" y="331" width="27" height="42" rx="4" fill="${C.sage}"/>
      <rect x="309" y="343" width="48" height="30" rx="4" fill="${C.petrol}"/>
    </g>
    <path d="M512 372 V210 Q512 118 614 118 Q716 118 716 210 V372Z" fill="${C.petrol}" class="line"/>
    <path d="M535 350 V218 Q535 145 614 145 Q693 145 693 218 V350Z" fill="${C.amber}"/>
    <path d="M614 142 V351 M536 242 H692 M537 298 H691" class="paper-line" opacity=".9"/>
    <path d="M557 168 Q582 149 609 147 M642 147 Q668 151 685 174" fill="none" class="fine" opacity=".5"/>
    <path d="M768 320 H1028 L984 364 H718Z" fill="${C.ink}"/>
    <path d="M756 357 L728 490 M990 357 L1030 487" class="line"/>
    <path d="M842 312 Q839 274 871 253 Q905 272 899 312Z" fill="${C.amber}" class="line"/>
    <path d="M869 251 V217" class="line"/>
    <path d="M847 216 Q869 190 891 216" fill="none" class="line"/>
    <path d="M889 196 Q897 177 904 195 Q912 213 897 223" fill="${C.terracotta}" class="fine"/>
    <path d="M782 375 H959" class="paper-line" opacity=".55"/>
    <path d="M1033 300 Q1107 271 1150 324 V475 H1040Z" fill="${C.sage}"/>
    <path d="M1040 319 Q1092 285 1136 328" fill="none" class="line"/>
    <path d="M1082 302 Q1066 250 1092 214 Q1117 250 1097 304" fill="${C.moss}" class="fine"/>
    <path d="M1098 253 Q1120 205 1138 230 Q1146 261 1107 278" fill="${C.moss}" class="fine"/>
    <path d="M1078 413 H1160" class="line" opacity=".6"/>
    <path d="M433 390 Q450 347 486 361 Q512 372 500 425 L448 435Z" fill="${C.terracotta}" class="line"/>
    <path d="M448 429 L424 497 M490 428 L516 494" class="line"/>
    <path d="M423 494 H460 M496 494 H533" class="line"/>
    <path d="M61 120 Q260 75 455 116" fill="none" class="fine" opacity=".4"/>
    <circle cx="435" cy="98" r="14" fill="${C.amber}"/>
  `;
  return svg(1200, 600, 'Reading room editorial vignette', roomBase(body));
}

function harbourRoom() {
  const body = `
    <path d="M86 114 H502 V430 H86Z" fill="${C.petrol}" class="line"/>
    <path d="M114 144 H474 V402 H114Z" fill="${C.sea}"/>
    <path d="M125 330 Q204 278 280 332 T457 328 V402 H114Z" fill="${C.sage}" opacity=".62"/>
    <path d="M121 350 Q185 313 242 345 T366 348 T469 337" fill="none" class="paper-line" opacity=".7"/>
    <path d="M274 144 V403 M114 256 H474" class="paper-line" opacity=".86"/>
    <path d="M161 311 L185 220 L193 220 L213 311 M196 219 V166" fill="none" class="line" opacity=".8"/>
    <path d="M187 170 Q231 189 272 171" fill="none" class="fine"/>
    <path d="M815 150 Q850 113 890 150 L890 395 H815Z" fill="${C.sage}" class="line"/>
    <path d="M839 167 Q856 144 875 167 V377 H839Z" fill="${C.amber}"/>
    <path d="M857 150 V391" class="paper-line" opacity=".75"/>
    <path d="M741 400 H1106 L1060 440 H692Z" fill="${C.ink}"/>
    <path d="M734 436 L704 493 M1058 436 L1096 493" class="line"/>
    <path d="M734 471 Q800 448 872 471 T1020 469" fill="none" class="paper-line" opacity=".42"/>
    <path d="M914 386 Q945 358 983 383 L973 415 H913Z" fill="${C.terracotta}" class="line"/>
    <path d="M940 358 V335" class="line"/>
    <path d="M912 336 Q940 310 967 336" fill="none" class="line"/>
    <path d="M777 393 Q804 361 835 393 L824 421 H768Z" fill="${C.amber}" class="fine"/>
    <path d="M784 370 Q804 343 823 370" fill="none" class="fine"/>
    <path d="M552 160 Q614 118 672 157 L694 212 Q626 241 551 207Z" fill="${C.terracotta}" class="line"/>
    <path d="M566 175 Q620 146 681 174" fill="none" class="paper-line" opacity=".7"/>
    <path d="M598 214 V363 M654 216 V359" class="line"/>
    <path d="M549 359 H701" class="line"/>
    <path d="M551 268 Q609 228 676 258" fill="none" class="fine"/>
    <path d="M554 300 Q626 274 692 300" fill="none" class="fine"/>
    <path d="M1052 183 Q1080 151 1111 183 V298 H1052Z" fill="${C.amber}" class="line"/>
    <path d="M1078 147 V327" class="line"/>
    <path d="M1053 328 H1112" class="line"/>
    <path d="M1022 307 Q1082 278 1144 310" fill="none" class="fine"/>
    <circle cx="1110" cy="352" r="38" fill="none" class="line"/>
    <circle cx="1110" cy="352" r="22" fill="none" class="fine"/>
    <path d="M1090 370 Q1115 386 1131 363" fill="none" class="fine"/>
    <path d="M1105 316 V387" class="fine"/>
    <path d="M512 424 Q555 397 603 423" fill="none" class="line" opacity=".7"/>
    <circle cx="535" cy="405" r="13" fill="${C.amber}"/>
  `;
  return svg(1200, 600, 'Harbour room editorial vignette', roomBase(body));
}

function companionRoom() {
  const body = `
    <path d="M86 160 Q86 108 138 108 H402 Q451 108 451 160 V425 H86Z" fill="${C.sage}" opacity=".54"/>
    <path d="M109 390 V170 Q109 133 145 133 H395 Q428 133 428 170 V390" class="line" opacity=".6"/>
    <path d="M161 134 V384 M246 134 V384 M332 134 V384" class="fine" opacity=".46"/>
    <path d="M124 210 Q171 179 224 212 T332 210 T421 224" fill="none" class="paper-line" opacity=".65"/>
    <path d="M101 410 H453" class="line"/>
    <path d="M182 348 H644 L694 403 H145Z" fill="${C.petrol}"/>
    <path d="M170 341 Q185 286 256 300 H553 Q617 295 637 343Z" fill="${C.terracotta}" class="line"/>
    <path d="M198 311 Q243 335 287 307 T375 310 T464 305 T568 316" fill="none" class="paper-line" opacity=".5"/>
    <path d="M200 390 L178 494 M596 389 L629 494" class="line"/>
    <path d="M158 494 H205 M608 494 H655" class="line"/>
    <path d="M744 205 H1033 V424 H744Z" fill="${C.ink}" class="line"/>
    <path d="M771 235 H1007 V395 H771Z" fill="${C.amber}"/>
    <path d="M771 315 H1007 M890 235 V395" class="paper-line" opacity=".85"/>
    <path d="M792 277 Q839 244 881 277 T973 275" fill="none" class="fine" opacity=".7"/>
    <path d="M840 454 Q842 382 892 372 Q939 384 944 454Z" fill="${C.moss}" class="line"/>
    <path d="M880 383 Q863 342 890 320 Q915 342 899 384" fill="${C.sage}" class="fine"/>
    <path d="M907 371 Q931 328 952 347 Q962 376 919 393" fill="${C.sage}" class="fine"/>
    <path d="M860 454 V499 M924 454 V499" class="line"/>
    <path d="M828 499 H963" class="line"/>
    <path d="M518 473 Q535 436 572 450 Q602 460 605 496 H504Z" fill="${C.amber}" class="line"/>
    <path d="M532 454 Q544 420 573 432 Q597 442 595 466" fill="none" class="line"/>
    <circle cx="566" cy="466" r="6" fill="${C.ink}"/>
    <circle cx="589" cy="464" r="6" fill="${C.ink}"/>
    <path d="M509 497 Q548 514 610 496" fill="none" class="paper-line" opacity=".55"/>
    <path d="M670 125 Q708 91 746 125" fill="none" class="line" opacity=".5"/>
    <path d="M708 92 V171" class="line" opacity=".5"/>
    <path d="M672 149 Q708 173 744 149" fill="none" class="fine"/>
    <circle cx="708" cy="183" r="11" fill="${C.amber}"/>
  `;
  return svg(1200, 600, 'Companion room editorial vignette', roomBase(body));
}

function glasshouseRoom() {
  const body = `
    <path d="M82 114 H1118 V431 H82Z" fill="${C.sage}" opacity=".48"/>
    <path d="M104 132 H1096 V408 H104Z" fill="${C.amber}" opacity=".48"/>
    <path d="M104 132 V409 M340 132 V409 M585 132 V409 M830 132 V409 M1096 132 V409" class="line" opacity=".68"/>
    <path d="M104 266 H1096" class="line" opacity=".55"/>
    <path d="M84 114 L600 56 L1118 114" fill="${C.petrol}" class="line"/>
    <path d="M112 111 L600 73 L1087 111" fill="${C.cream}"/>
    <path d="M600 73 V409" class="line" opacity=".74"/>
    <path d="M183 382 H516 L544 425 H154Z" fill="${C.terracotta}" class="line"/>
    <path d="M199 408 H500" class="paper-line" opacity=".5"/>
    <path d="M238 374 Q232 321 263 291 Q296 321 279 377" fill="${C.moss}" class="line"/>
    <path d="M292 378 Q300 291 342 271 Q373 332 336 382" fill="${C.moss}" class="line"/>
    <path d="M379 379 Q368 317 403 295 Q431 338 420 381" fill="${C.sage}" class="line"/>
    <path d="M220 380 V425 M319 381 V425 M403 382 V425" class="line"/>
    <path d="M706 383 H1042 V428 H706Z" fill="${C.petrol}" class="line"/>
    <path d="M736 368 Q724 316 753 292 Q786 326 772 370" fill="${C.terracotta}" class="line"/>
    <path d="M815 370 Q809 294 842 272 Q875 330 856 372" fill="${C.moss}" class="line"/>
    <path d="M902 372 Q895 318 927 298 Q956 336 942 373" fill="${C.sage}" class="line"/>
    <path d="M1002 384 Q995 337 1021 318 Q1049 345 1038 385" fill="${C.ochre}" class="line"/>
    <path d="M743 428 L726 498 M1014 428 L1032 498" class="line"/>
    <path d="M714 499 H758 M1009 499 H1054" class="line"/>
    <path d="M564 403 Q575 362 608 365 Q633 374 634 416 L575 422Z" fill="${C.ink}" class="line"/>
    <path d="M587 364 Q580 326 602 301 Q628 332 612 365" fill="${C.sage}" class="line"/>
    <path d="M564 423 H638" class="line"/>
    <path d="M1100 179 Q1135 145 1158 179 V283 Q1137 304 1100 283Z" fill="${C.terracotta}" class="line"/>
    <path d="M1118 179 Q1136 148 1150 179" fill="none" class="fine"/>
    <path d="M1130 304 V422" class="line"/>
    <path d="M1106 421 H1155" class="line"/>
    <path d="M518 121 Q550 89 582 122" fill="none" class="fine"/>
    <path d="M529 120 Q544 158 563 178 Q579 156 591 121" fill="${C.moss}" class="fine"/>
    <circle cx="520" cy="101" r="12" fill="${C.amber}"/>
  `;
  return svg(1200, 600, 'Glasshouse room editorial vignette', roomBase(body));
}

const portraitFrame = (name, background, body) =>
  svg(
    480,
    600,
    `${name} club portrait`,
    `
  <rect width="480" height="600" fill="${C.paper}"/>
  <rect width="480" height="600" fill="url(#grain)" opacity=".24"/>
  <path d="M45 559 V220 Q45 83 240 83 Q435 83 435 220 V559Z" fill="${background}" class="line"/>
  <path d="M71 558 V225 Q71 111 240 111 Q409 111 409 225 V558Z" fill="${C.cream}" opacity=".22"/>
  <path d="M44 559 H436" class="line" opacity=".6"/>
  ${body}
  <path d="M84 520 Q240 489 396 520" fill="none" class="fine" opacity=".35"/>
`,
  );

function reader() {
  return portraitFrame(
    'Reader',
    C.petrol,
    `
    <path d="M110 559 Q112 447 183 421 Q240 400 297 421 Q368 447 370 559Z" fill="${C.amber}" class="line"/>
    <path d="M160 462 Q205 492 240 462 Q275 492 320 462" fill="none" class="paper-line" opacity=".75"/>
    <path d="M211 394 V438 Q240 463 269 438 V394" fill="${C.terracotta}" class="line"/>
    <ellipse cx="240" cy="292" rx="84" ry="109" fill="#5d3d35" class="line"/>
    <path d="M160 278 Q161 159 239 161 Q318 162 321 278 Q291 220 242 223 Q191 224 160 278Z" fill="#d2d1bc" class="line"/>
    <path d="M169 225 Q180 169 219 152 M208 183 Q240 141 274 157 M254 157 Q300 151 318 204" fill="none" class="fine" opacity=".9"/>
    <ellipse cx="157" cy="296" rx="19" ry="28" fill="#5d3d35" class="fine"/>
    <ellipse cx="323" cy="296" rx="19" ry="28" fill="#5d3d35" class="fine"/>
    <path d="M167 303 Q181 229 240 226 Q299 229 313 303 V345 Q310 404 240 430 Q170 404 167 345Z" fill="#814e41" class="line"/>
    <path d="M204 309 Q220 297 236 309 M250 309 Q266 297 282 309" fill="none" class="line"/>
    <circle cx="221" cy="315" r="6" fill="${C.ink}"/><circle cx="259" cy="315" r="6" fill="${C.ink}"/>
    <path d="M240 318 Q230 350 242 360" fill="none" class="fine"/>
    <path d="M213 377 Q241 389 270 375" fill="none" class="line"/>
    <path d="M186 301 H236 M244 301 H294" class="fine"/><circle cx="240" cy="301" r="7" fill="${C.amber}"/>
    <path d="M129 478 L241 503 L351 478" fill="none" class="paper-line" opacity=".45"/>
    <path d="M139 463 Q179 446 208 465 L198 492 Q164 496 135 478Z" fill="${C.cream}" class="line"/>
    <path d="M342 463 Q301 446 272 465 L282 492 Q316 496 346 478Z" fill="${C.cream}" class="line"/>
    <path d="M152 466 L194 476 M328 466 L286 476" class="fine"/>
  `,
  );
}

function cartographer() {
  return portraitFrame(
    'Cartographer',
    C.terracotta,
    `
    <path d="M103 559 Q111 451 173 424 Q239 397 307 424 Q370 452 378 559Z" fill="${C.petrol}" class="line"/>
    <path d="M158 456 L208 430 L239 474 L270 430 L322 456" fill="none" class="paper-line" opacity=".72"/>
    <path d="M211 393 V435 Q240 451 269 435 V393" fill="#bb795e" class="line"/>
    <ellipse cx="240" cy="286" rx="82" ry="109" fill="#b87858" class="line"/>
    <path d="M165 278 Q159 185 217 154 Q284 126 323 204 L314 275 Q287 214 238 221 Q190 222 165 278Z" fill="#6d413d" class="line"/>
    <path d="M172 210 Q203 146 263 149 Q304 155 319 197" fill="none" class="fine"/>
    <path d="M172 242 Q184 190 213 169 M203 171 Q243 141 284 163 M258 157 Q299 168 314 211" fill="none" class="fine" opacity=".7"/>
    <path d="M166 304 Q177 229 240 225 Q303 229 314 304 V342 Q307 402 240 425 Q173 402 166 342Z" fill="#bd7b5b" class="line"/>
    <path d="M197 307 Q216 293 232 307 M248 307 Q264 293 283 307" fill="none" class="line"/>
    <circle cx="217" cy="313" r="6" fill="${C.ink}"/><circle cx="263" cy="313" r="6" fill="${C.ink}"/>
    <path d="M240 317 L231 353 L246 357" fill="none" class="fine"/>
    <path d="M214 378 Q241 388 267 375" fill="none" class="line"/>
    <path d="M151 308 Q150 354 184 380 M329 308 Q330 354 296 380" fill="none" class="fine"/>
    <path d="M114 523 Q241 481 366 523" fill="none" class="paper-line" opacity=".5"/>
    <path d="M128 459 L180 447 L189 484 L138 496Z" fill="${C.amber}" class="line"/>
    <path d="M140 473 L174 464 M151 489 L183 480" class="fine"/>
    <circle cx="337" cy="465" r="31" fill="${C.amber}" class="line"/><circle cx="337" cy="465" r="16" fill="${C.petrol}" class="fine"/>
    <path d="M337 433 V497 M305 465 H369" class="fine"/>
  `,
  );
}

function botanist() {
  return portraitFrame(
    'Botanist',
    C.moss,
    `
    <path d="M92 559 Q105 450 176 421 Q240 399 304 421 Q375 450 388 559Z" fill="${C.sage}" class="line"/>
    <path d="M162 466 Q200 491 240 464 Q280 491 319 466" fill="none" class="paper-line" opacity=".7"/>
    <path d="M211 395 V439 Q239 459 269 439 V395" fill="#9b6b4a" class="line"/>
    <ellipse cx="240" cy="291" rx="84" ry="109" fill="#9b6b4a" class="line"/>
    <path d="M158 277 Q159 191 213 158 Q261 125 316 182 Q334 216 322 278 Q294 227 241 221 Q188 226 158 277Z" fill="${C.ink}" class="line"/>
    <path d="M171 223 Q194 159 238 150 Q286 149 313 207" fill="none" class="fine" opacity=".72"/>
    <path d="M168 301 Q179 228 240 225 Q301 228 312 301 V346 Q306 405 240 427 Q174 405 168 346Z" fill="#a97552" class="line"/>
    <path d="M201 307 Q218 295 236 308 M245 308 Q264 295 281 307" fill="none" class="line"/>
    <circle cx="219" cy="314" r="6" fill="${C.ink}"/><circle cx="261" cy="314" r="6" fill="${C.ink}"/>
    <path d="M240 318 Q228 349 243 359" fill="none" class="fine"/>
    <path d="M210 377 Q240 391 270 376" fill="none" class="line"/>
    <path d="M115 485 Q140 448 170 463 Q151 491 115 485Z" fill="${C.terracotta}" class="line"/>
    <path d="M152 474 Q140 426 162 400 Q184 427 170 469" fill="${C.moss}" class="fine"/>
    <path d="M335 493 Q360 449 388 462 Q376 496 335 493Z" fill="${C.terracotta}" class="line"/>
    <path d="M367 477 Q357 429 382 409 Q402 442 389 480" fill="${C.moss}" class="fine"/>
    <path d="M124 531 Q240 494 356 531" fill="none" class="paper-line" opacity=".42"/>
  `,
  );
}

function astronomer() {
  return portraitFrame(
    'Astronomer',
    C.ink,
    `
    <path d="M89 559 Q104 445 177 419 Q240 398 303 419 Q376 445 391 559Z" fill="${C.clay}" class="line"/>
    <path d="M160 468 Q204 496 240 464 Q276 496 321 468" fill="none" class="paper-line" opacity=".72"/>
    <path d="M211 394 V438 Q240 460 269 438 V394" fill="#553f39" class="line"/>
    <ellipse cx="240" cy="288" rx="83" ry="109" fill="#4d342f" class="line"/>
    <path d="M158 274 Q165 180 240 158 Q314 180 322 274 Q287 216 241 222 Q193 219 158 274Z" fill="#d0c2a0" class="line"/>
    <path d="M175 209 Q192 168 226 154 M208 178 Q240 142 274 156 M256 155 Q300 163 316 207" fill="none" class="fine"/>
    <path d="M168 303 Q179 229 240 225 Q301 229 312 303 V345 Q307 403 240 426 Q173 403 168 345Z" fill="#63443a" class="line"/>
    <path d="M197 308 Q216 294 233 307 M248 307 Q264 294 283 308" fill="none" class="line"/>
    <circle cx="218" cy="314" r="6" fill="${C.ink}"/><circle cx="262" cy="314" r="6" fill="${C.ink}"/>
    <path d="M240 318 Q230 349 245 358" fill="none" class="fine"/>
    <path d="M211 377 Q241 390 271 375" fill="none" class="line"/>
    <path d="M127 475 Q160 444 200 463 L190 493 Q149 492 120 479Z" fill="${C.petrol}" class="line"/>
    <path d="M280 462 Q321 444 358 475 L352 497 Q313 488 289 491Z" fill="${C.petrol}" class="line"/>
    <circle cx="123" cy="161" r="11" fill="${C.amber}"/><circle cx="346" cy="205" r="7" fill="${C.amber}"/><circle cx="362" cy="152" r="14" fill="${C.terracotta}"/>
    <path d="M105 520 Q240 482 375 520" fill="none" class="paper-line" opacity=".42"/>
  `,
  );
}

function archivist() {
  return portraitFrame(
    'Archivist',
    C.ochre,
    `
    <path d="M88 559 Q106 446 177 418 Q240 398 303 418 Q374 446 392 559Z" fill="${C.terracotta}" class="line"/>
    <path d="M155 464 Q201 493 240 464 Q279 493 326 464" fill="none" class="paper-line" opacity=".75"/>
    <path d="M211 394 V438 Q240 459 269 438 V394" fill="#e0a27a" class="line"/>
    <ellipse cx="240" cy="290" rx="83" ry="110" fill="#d08d68" class="line"/>
    <path d="M161 275 Q158 177 240 157 Q322 177 319 275 Q285 219 240 222 Q193 220 161 275Z" fill="#252f35" class="line"/>
    <path d="M169 210 Q194 164 239 155 Q286 163 312 210" fill="none" class="fine"/>
    <path d="M168 302 Q179 229 240 225 Q301 229 312 302 V345 Q306 404 240 426 Q174 404 168 345Z" fill="#d79670" class="line"/>
    <path d="M198 307 Q216 294 234 307 M247 307 Q264 294 282 307" fill="none" class="line"/>
    <circle cx="218" cy="314" r="6" fill="${C.ink}"/><circle cx="262" cy="314" r="6" fill="${C.ink}"/>
    <path d="M240 319 Q230 349 245 359" fill="none" class="fine"/>
    <path d="M211 378 Q241 390 270 375" fill="none" class="line"/>
    <path d="M119 460 H196 L185 505 H109Z" fill="${C.cream}" class="line"/>
    <path d="M284 460 H361 L371 505 H295Z" fill="${C.cream}" class="line"/>
    <path d="M128 477 H180 M301 477 H352 M120 493 H176 M305 493 H361" class="fine" opacity=".7"/>
    <path d="M240 446 V531" class="fine" opacity=".55"/>
    <path d="M103 531 Q240 493 377 531" fill="none" class="paper-line" opacity=".42"/>
  `,
  );
}

function maker() {
  return portraitFrame(
    'Maker',
    C.rust,
    `
    <path d="M90 559 Q103 447 177 419 Q240 399 303 419 Q377 447 390 559Z" fill="${C.petrol}" class="line"/>
    <path d="M160 469 Q204 493 240 465 Q276 493 321 469" fill="none" class="paper-line" opacity=".7"/>
    <path d="M211 394 V438 Q240 459 269 438 V394" fill="#9b684d" class="line"/>
    <ellipse cx="240" cy="290" rx="83" ry="110" fill="#a56e4f" class="line"/>
    <path d="M159 276 Q160 183 224 159 Q297 133 322 215 L315 277 Q283 224 240 223 Q193 221 159 276Z" fill="#3a2d2b" class="line"/>
    <path d="M170 210 Q195 160 236 154 M209 170 Q259 133 299 171 M263 152 Q311 175 318 216" fill="none" class="fine" opacity=".8"/>
    <path d="M168 302 Q179 229 240 225 Q301 229 312 302 V346 Q306 404 240 426 Q174 404 168 346Z" fill="#aa7553" class="line"/>
    <path d="M198 307 Q216 294 234 307 M247 307 Q264 294 282 307" fill="none" class="line"/>
    <circle cx="218" cy="314" r="6" fill="${C.ink}"/><circle cx="262" cy="314" r="6" fill="${C.ink}"/>
    <path d="M240 319 Q230 349 245 359" fill="none" class="fine"/>
    <path d="M211 378 Q241 391 271 375" fill="none" class="line"/>
    <path d="M116 471 Q146 438 194 458 L182 513 Q143 499 111 485Z" fill="${C.clay}" class="line"/>
    <path d="M285 458 Q334 438 365 471 L370 487 Q334 501 294 513Z" fill="${C.clay}" class="line"/>
    <path d="M154 458 L144 508 M324 455 L335 508" class="fine" opacity=".65"/>
    <path d="M117 527 Q240 491 363 527" fill="none" class="paper-line" opacity=".4"/>
    <path d="M103 184 L135 166 L152 190 L120 208Z" fill="${C.amber}" class="line"/>
    <path d="M107 187 L147 184" class="fine"/>
    <circle cx="350" cy="161" r="20" fill="${C.amber}" class="line"/>
    <path d="M350 145 V177 M334 161 H366" class="fine"/>
  `,
  );
}

const works = [
  {
    id: 'reading-room',
    title: 'Reading room',
    kind: 'room',
    svg: readingRoom(),
    integration: 'Optional editorial room vignette; decorative field-notes atmosphere.',
  },
  {
    id: 'harbour-room',
    title: 'Harbour room',
    kind: 'room',
    svg: harbourRoom(),
    integration: 'Optional editorial room vignette; decorative field-notes atmosphere.',
  },
  {
    id: 'companion-room',
    title: 'Companion room',
    kind: 'room',
    svg: companionRoom(),
    integration: 'Optional editorial room vignette; decorative field-notes atmosphere.',
  },
  {
    id: 'glasshouse-room',
    title: 'Glasshouse room',
    kind: 'room',
    svg: glasshouseRoom(),
    integration: 'Optional editorial room vignette; decorative field-notes atmosphere.',
  },
  {
    id: 'reader',
    title: 'The Reader',
    kind: 'portrait',
    svg: reader(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
  {
    id: 'cartographer',
    title: 'The Cartographer',
    kind: 'portrait',
    svg: cartographer(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
  {
    id: 'botanist',
    title: 'The Botanist',
    kind: 'portrait',
    svg: botanist(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
  {
    id: 'astronomer',
    title: 'The Astronomer',
    kind: 'portrait',
    svg: astronomer(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
  {
    id: 'archivist',
    title: 'The Archivist',
    kind: 'portrait',
    svg: archivist(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
  {
    id: 'maker',
    title: 'The Maker',
    kind: 'portrait',
    svg: maker(),
    integration: 'Optional field-notes gallery club illustration; decorative archetype only.',
  },
];

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const assets = [];
  for (const work of works) {
    const svgPath = path.join(OUT, `${work.id}.svg`);
    const webpPath = path.join(OUT, `${work.id}.webp`);
    const svgBuffer = Buffer.from(work.svg, 'utf8');
    fs.writeFileSync(svgPath, svgBuffer);
    // Keep SVG CSS pixels as output pixels so the catalogue dimensions stay
    // stable for responsive consumers (rooms 1200x600, portraits 480x600).
    await sharp(svgBuffer).webp({ quality: 92, effort: 6, smartSubsample: true }).toFile(webpPath);
    const webpBuffer = fs.readFileSync(webpPath);
    const dimensions = work.kind === 'room' ? [1200, 600] : [480, 600];
    assets.push({
      id: work.id,
      title: work.title,
      category: 'editorial',
      source: `assets-source/library/editorial/${work.id}.svg`,
      derivatives: [`assets-source/library/editorial/${work.id}.webp`],
      dimensions,
      provenance: {
        author: 'Alibi project',
        method: 'Original deterministic layered SVG geometry, locally rasterised with Sharp',
        license: 'Project original; no separate public reuse grant',
        generator: 'tools/assets/build-editorial.cjs',
      },
      accessibility:
        work.kind === 'room'
          ? 'Decorative editorial room vignette; adjacent section title remains editable. No gameplay, clue or evidence meaning.'
          : 'Decorative fictional club archetype bust; adjacent label remains editable. Not a suspect or museum portrait, and no gameplay meaning.',
      integration: work.integration,
      files: [
        {
          path: `assets-source/library/editorial/${work.id}.svg`,
          bytes: svgBuffer.length,
          sha256: sha256(svgBuffer),
        },
        {
          path: `assets-source/library/editorial/${work.id}.webp`,
          bytes: webpBuffer.length,
          sha256: sha256(webpBuffer),
        },
      ],
      qa: {
        scope:
          'Generated locally; SVG source retained; WebP decoded by Sharp and visually inspected as a contact sheet.',
      },
    });
  }
  fs.writeFileSync(
    path.join(OUT, 'catalogue.json'),
    JSON.stringify({ schemaVersion: 1, assets }, null, 2) + '\n',
  );
  console.log(`Built ${assets.length} editorial assets in ${path.relative(ROOT, OUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
