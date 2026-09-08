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
    <path d="M105 559 Q110 449 180 417 Q240 393 300 417 Q370 449 375 559Z" fill="${C.amber}" class="line"/>
    <path d="M145 457 Q185 429 213 456 L240 481 L267 456 Q295 429 335 457" fill="none" class="paper-line" opacity=".82"/>
    <path d="M207 387 V438 Q240 467 273 438 V387" fill="#8d5b4b" class="line"/>
    <path d="M153 284 Q156 178 240 159 Q324 178 327 284 Q322 387 240 424 Q158 387 153 284Z" fill="#8a5947" class="line"/>
    <path d="M150 268 Q151 171 203 148 Q240 126 280 145 Q326 168 330 249 L314 278 Q296 217 240 221 Q184 218 166 278Z" fill="#d2d1bc" class="line"/>
    <path d="M158 217 Q174 168 215 147 M199 176 Q240 132 281 150 M259 148 Q302 162 322 215" fill="none" class="fine" opacity=".86"/>
    <path d="M161 246 Q149 257 151 286 M319 246 Q331 257 329 286" fill="none" class="fine"/>
    <path d="M177 287 Q195 223 240 223 Q285 223 303 287 V345 Q297 394 240 422 Q183 394 177 345Z" fill="#96634f" class="line"/>
    <path d="M183 289 Q204 268 225 288 M255 288 Q276 268 297 289" fill="none" class="line"/>
    <circle cx="207" cy="300" r="19" fill="none" class="line"/><circle cx="273" cy="300" r="19" fill="none" class="line"/>
    <path d="M226 300 H254" class="line"/><circle cx="207" cy="300" r="5" fill="${C.ink}"/><circle cx="273" cy="300" r="5" fill="${C.ink}"/>
    <path d="M240 309 Q231 346 242 357" fill="none" class="fine"/>
    <path d="M212 377 Q240 389 269 374" fill="none" class="line"/>
    <path d="M155 457 L198 443 L217 476 L171 493Z M325 457 L282 443 L263 476 L309 493Z" fill="${C.cream}" class="line"/>
    <path d="M125 505 Q170 483 208 501 M272 501 Q310 483 355 505" fill="none" class="fine" opacity=".6"/>
  `,
  );
}

function cartographer() {
  return portraitFrame(
    'Cartographer',
    C.terracotta,
    `
    <path d="M101 559 Q108 450 173 420 Q240 392 307 420 Q372 450 379 559Z" fill="${C.petrol}" class="line"/>
    <path d="M147 449 L203 422 L240 476 L277 422 L333 449" fill="none" class="paper-line" opacity=".74"/>
    <path d="M211 388 V437 Q240 454 269 437 V388" fill="#7b4a3d" class="line"/>
    <path d="M157 286 Q162 205 190 177 Q212 154 240 159 Q268 154 290 177 Q318 205 323 286 L303 366 L240 430 L177 366Z" fill="#b87858" class="line"/>
    <path d="M158 260 Q161 193 190 165 Q210 143 240 150 Q270 143 290 165 Q319 193 322 260 Q303 224 283 215 Q240 191 197 215 Q177 224 158 260Z" fill="#6d413d" class="line"/>
    <g fill="#845048" class="fine">
      <circle cx="176" cy="196" r="13"/><circle cx="193" cy="173" r="12"/><circle cx="216" cy="157" r="12"/><circle cx="240" cy="152" r="13"/><circle cx="264" cy="157" r="12"/><circle cx="287" cy="173" r="12"/><circle cx="304" cy="196" r="13"/>
    </g>
    <path d="M177 291 Q194 239 219 234 M303 291 Q286 239 261 234" fill="none" class="fine" opacity=".72"/>
    <path d="M173 304 Q190 261 216 263 M264 263 Q290 261 307 304" fill="none" class="line"/>
    <circle cx="213" cy="311" r="6" fill="${C.ink}"/><circle cx="267" cy="311" r="6" fill="${C.ink}"/>
    <path d="M240 316 L228 354 L247 360" fill="none" class="fine"/>
    <path d="M211 381 Q240 394 270 378" fill="none" class="line"/>
    <path d="M136 502 Q177 474 212 496 M268 496 Q303 474 344 502" fill="none" class="fine" opacity=".6"/>
    <path d="M111 463 L177 444 L187 493 L121 506Z" fill="${C.amber}" class="line"/>
    <path d="M126 478 L171 466 M132 493 L177 481" class="fine"/>
    <circle cx="345" cy="467" r="31" fill="${C.amber}" class="line"/><circle cx="345" cy="467" r="16" fill="${C.petrol}" class="fine"/>
    <path d="M345 435 V499 M313 467 H377" class="fine"/>
  `,
  );
}

function botanist() {
  return portraitFrame(
    'Botanist',
    C.moss,
    `
    <path d="M90 559 Q100 449 173 418 Q240 395 307 418 Q380 449 390 559Z" fill="${C.sage}" class="line"/>
    <path d="M149 455 Q190 428 214 456 L240 483 L266 456 Q290 428 331 455" fill="none" class="paper-line" opacity=".74"/>
    <path d="M209 394 V440 Q240 460 271 440 V394" fill="#9b6b4a" class="line"/>
    <path d="M174 287 Q177 210 192 188 Q211 153 240 155 Q269 153 288 188 Q303 210 306 287 V345 Q299 396 240 424 Q181 396 174 345Z" fill="#c58662" class="line"/>
    <path d="M171 275 Q167 187 218 145 Q240 128 262 145 Q313 187 309 275 Q288 219 240 222 Q192 219 171 275Z" fill="${C.ink}" class="line"/>
    <path d="M188 201 Q214 157 240 150 Q266 157 292 201" fill="none" class="fine"/>
    <g fill="#4e332f" class="line">
      <path d="M171 213 Q141 246 151 390 Q161 426 181 407 L194 212Z"/>
      <path d="M309 213 Q339 246 329 390 Q319 426 299 407 L286 212Z"/>
    </g>
    <g fill="#b56f57" class="fine"><circle cx="159" cy="239" r="13"/><circle cx="157" cy="270" r="12"/><circle cx="158" cy="301" r="13"/><circle cx="160" cy="333" r="12"/><circle cx="163" cy="365" r="13"/><circle cx="321" cy="239" r="13"/><circle cx="323" cy="270" r="12"/><circle cx="322" cy="301" r="13"/><circle cx="320" cy="333" r="12"/><circle cx="317" cy="365" r="13"/></g>
    <path d="M191 302 Q211 287 229 302 M251 302 Q269 287 289 302" fill="none" class="line"/>
    <circle cx="215" cy="310" r="6" fill="${C.ink}"/><circle cx="265" cy="310" r="6" fill="${C.ink}"/>
    <path d="M240 316 Q231 348 243 358" fill="none" class="fine"/>
    <g fill="#9e5e4e"><circle cx="199" cy="332" r="3"/><circle cx="211" cy="337" r="3"/><circle cx="222" cy="333" r="3"/><circle cx="258" cy="333" r="3"/><circle cx="270" cy="337" r="3"/><circle cx="282" cy="332" r="3"/></g>
    <path d="M211 377 Q240 391 270 376" fill="none" class="line"/>
    <path d="M116 490 Q144 450 173 463 Q153 497 116 490Z" fill="${C.terracotta}" class="line"/>
    <path d="M151 472 Q140 423 163 400 Q185 431 170 471" fill="${C.moss}" class="fine"/>
    <path d="M331 492 Q358 449 389 463 Q373 499 331 492Z" fill="${C.terracotta}" class="line"/>
    <path d="M367 475 Q357 425 382 405 Q403 439 389 480" fill="${C.moss}" class="fine"/>
  `,
  );
}

function astronomer() {
  return portraitFrame(
    'Astronomer',
    C.ink,
    `
    <path d="M89 559 Q103 446 177 418 Q240 395 303 418 Q377 446 391 559Z" fill="${C.clay}" class="line"/>
    <path d="M156 465 Q201 493 240 463 Q279 493 324 465" fill="none" class="paper-line" opacity=".74"/>
    <path d="M211 393 V438 Q240 460 269 438 V393" fill="#553f39" class="line"/>
    <path d="M171 287 Q174 206 198 177 Q218 153 240 157 Q262 153 282 177 Q306 206 309 287 V344 Q303 396 240 425 Q177 396 171 344Z" fill="#6a443a" class="line"/>
    <path d="M169 264 Q172 190 208 166 Q240 143 272 166 Q308 190 311 264 Q288 215 240 220 Q192 215 169 264Z" fill="#302e31" class="line"/>
    <path d="M187 197 Q207 163 240 156 Q273 163 293 197" fill="none" class="fine"/>
    <path d="M191 294 Q210 276 230 294 M250 294 Q270 276 289 294" fill="none" class="line"/>
    <circle cx="211" cy="304" r="25" fill="none" class="line"/><circle cx="269" cy="304" r="25" fill="none" class="line"/>
    <path d="M236 304 H244" class="line"/><circle cx="211" cy="304" r="7" fill="${C.ink}"/><circle cx="269" cy="304" r="7" fill="${C.ink}"/>
    <path d="M240 316 Q231 349 245 359" fill="none" class="fine"/>
    <path d="M211 377 Q240 390 271 375" fill="none" class="line"/>
    <path d="M128 476 Q160 444 201 463 L190 494 Q149 492 120 479Z" fill="${C.petrol}" class="line"/>
    <path d="M279 463 Q320 444 359 476 L352 497 Q313 491 289 492Z" fill="${C.petrol}" class="line"/>
    <path d="M126 467 Q165 459 194 475 M286 475 Q315 459 354 467" class="fine" opacity=".58"/>
    <circle cx="122" cy="161" r="11" fill="${C.amber}"/><circle cx="345" cy="205" r="7" fill="${C.amber}"/><circle cx="361" cy="152" r="14" fill="${C.terracotta}"/>
  `,
  );
}

function archivist() {
  return portraitFrame(
    'Archivist',
    C.ochre,
    `
    <path d="M87 559 Q104 446 176 417 Q240 392 304 417 Q376 446 393 559Z" fill="${C.terracotta}" class="line"/>
    <path d="M151 457 Q196 429 214 457 L240 482 L266 457 Q284 429 329 457" fill="none" class="paper-line" opacity=".78"/>
    <path d="M209 392 V440 Q240 460 271 440 V392" fill="#b4775d" class="line"/>
    <path d="M169 286 Q173 201 198 174 Q219 151 240 155 Q261 151 282 174 Q307 201 311 286 V347 Q303 401 240 430 Q177 401 169 347Z" fill="#d0a073" class="line"/>
    <path d="M165 265 Q169 189 205 162 Q240 133 275 162 Q311 189 315 265 Q295 215 240 218 Q185 215 165 265Z" fill="#252f35" class="line"/>
    <path d="M198 161 Q201 121 240 112 Q279 121 282 161 Q267 143 240 145 Q213 143 198 161Z" fill="#252f35" class="line"/>
    <path d="M180 199 Q210 158 240 155 Q270 158 300 199" fill="none" class="fine"/>
    <path d="M187 296 Q207 279 229 296 M251 296 Q273 279 293 296" fill="none" class="line"/>
    <path d="M185 294 H229 V326 H185Z M251 294 H295 V326 H251Z" fill="none" class="fine"/><path d="M229 307 H251" class="line"/>
    <circle cx="207" cy="310" r="6" fill="${C.ink}"/><circle cx="273" cy="310" r="6" fill="${C.ink}"/>
    <path d="M240 319 Q230 349 245 361" fill="none" class="fine"/>
    <path d="M188 346 Q200 353 210 350 M292 346 Q280 353 270 350" fill="none" class="fine" opacity=".58"/>
    <path d="M207 384 Q240 398 273 382" fill="none" class="line"/>
    <path d="M119 459 H198 L185 507 H109Z" fill="${C.cream}" class="line"/>
    <path d="M282 459 H361 L371 507 H295Z" fill="${C.cream}" class="line"/>
    <path d="M128 478 H181 M300 478 H352 M120 494 H176 M306 494 H361" class="fine" opacity=".7"/>
    <path d="M103 532 Q240 493 377 532" fill="none" class="paper-line" opacity=".42"/>
  `,
  );
}

function maker() {
  return portraitFrame(
    'Maker',
    C.rust,
    `
    <path d="M84 559 Q99 443 177 414 Q240 389 303 414 Q381 443 396 559Z" fill="${C.petrol}" class="line"/>
    <path d="M149 459 Q194 429 216 457 L240 484 L264 457 Q286 429 331 459" fill="none" class="paper-line" opacity=".72"/>
    <path d="M209 392 V440 Q240 462 271 440 V392" fill="#765044" class="line"/>
    <path d="M147 289 Q151 201 184 174 Q213 151 240 159 Q267 151 296 174 Q329 201 333 289 Q331 380 240 431 Q149 380 147 289Z" fill="#805548" class="line"/>
    <path d="M146 271 Q149 194 190 161 Q214 139 240 149 Q266 139 290 161 Q331 194 334 271 Q306 225 277 215 Q240 203 203 215 Q174 225 146 271Z" fill="#3a2d2b" class="line"/>
    <path d="M158 216 Q174 172 211 155 M194 174 Q240 137 286 174 M269 155 Q306 172 322 216" fill="none" class="fine" opacity=".78"/>
    <g fill="#3a2d2b" class="fine"><circle cx="169" cy="209" r="18"/><circle cx="188" cy="177" r="15"/><circle cx="214" cy="158" r="14"/><circle cx="266" cy="158" r="14"/><circle cx="292" cy="177" r="15"/><circle cx="311" cy="209" r="18"/></g>
    <path d="M166 304 Q184 258 212 257 M268 257 Q296 258 314 304" fill="none" class="line"/>
    <circle cx="214" cy="313" r="6" fill="${C.ink}"/><circle cx="266" cy="313" r="6" fill="${C.ink}"/>
    <path d="M240 318 Q228 349 245 361" fill="none" class="fine"/>
    <path d="M205 384 Q240 399 276 380" fill="none" class="line"/>
    <path d="M111 469 Q152 432 201 456 L185 514 Q142 502 106 485Z" fill="${C.clay}" class="line"/>
    <path d="M279 456 Q328 432 369 469 L374 485 Q338 502 295 514Z" fill="${C.clay}" class="line"/>
    <path d="M148 458 L138 510 M331 458 L342 510" class="fine" opacity=".62"/>
    <path d="M115 528 Q240 489 365 528" fill="none" class="paper-line" opacity=".4"/>
    <path d="M101 184 L135 166 L152 190 L120 208Z" fill="${C.amber}" class="line"/><path d="M107 187 L147 184" class="fine"/>
    <circle cx="351" cy="161" r="20" fill="${C.amber}" class="line"/><path d="M351 145 V177 M335 161 H367" class="fine"/>
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
