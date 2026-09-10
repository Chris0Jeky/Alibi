'use strict';
// Original vector illustration; no external images or font dependencies.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024"><rect width="1536" height="1024" fill="#183d46"/><circle cx="1200" cy="230" r="130" fill="#d8b471"/><path d="M0 410Q240 260 510 410T1020 410T1536 410V1024H0" fill="#477c82"/><path d="M0 590Q260 450 520 590T1040 590T1536 590V1024H0" fill="#2b626c"/><path d="M0 750Q300 630 600 750T1200 750T1536 750V1024H0" fill="#102f39"/><g transform="translate(355 220) rotate(-9 380 300)"><rect x="-18" y="24" width="800" height="580" rx="18" fill="#082630" opacity=".5"/><rect width="760" height="550" rx="12" fill="#f0e1bd"/><path d="M0 0L380 285L760 0M0 550L275 280M760 550L485 280" fill="none" stroke="#b89e72" stroke-width="7"/><circle cx="380" cy="300" r="70" fill="#a95341"/></g><g transform="translate(765 505)"><circle r="70" fill="#a95341"/><circle r="54" fill="none" stroke="#d9ad72" stroke-width="5"/><path d="M-36-14Q-18-34 0-14T36-14M-36 8Q-18-12 0 8T36 8M-36 30Q-18 10 0 30T36 30" fill="none" stroke="#edd5a6" stroke-width="6"/></g><g stroke="#d9ba83" stroke-width="4" opacity=".55"><path d="M1050 810h240M1130 845h310M170 830h190M100 860h200"/></g></svg>`;
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'assets-source/cases'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets-source/cases/invitation.svg'), svg);
sharp(Buffer.from(svg))
  .webp({ quality: 85 })
  .toFile(path.join(root, 'src/artwork/invitation.webp'));
