#!/usr/bin/env node
/**
 * Generates every app icon from one vector design: a white tick inside a saffron circle on
 * Tickdo teal. Run after changing the design:  node scripts/make-icons.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const TEAL = '#0F5E57';
const SAFFRON = '#E8962E';
const OUT = path.join(__dirname, '..', 'assets', 'images');

// Tick path in a 100×100 box (thick, rounded — legible at 24 px).
const TICK = 'M33 51 L45 63 L67 38';

function svg({ size, bg, circle, tickColor, scale = 1, stroke = 9 }) {
  const c = 50;
  const r = 33 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    ${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}
    ${circle ? `<circle cx="${c}" cy="${c}" r="${r}" fill="${circle}"/>` : ''}
    <g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">
      <path d="${TICK}" fill="none" stroke="${tickColor}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

function write(name, markup, size) {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`${name} ${size}x${size}`);
}

// Full icon (store listing, iOS, legacy Android): teal square, saffron disc, white tick.
write('icon.png', svg({ size: 1024, bg: TEAL, circle: SAFFRON, tickColor: '#FFFFFF' }), 1024);
// Android adaptive icon: background layer + foreground kept inside the 66% safe zone.
write('android-icon-background.png', svg({ size: 512, bg: TEAL, tickColor: 'none' }), 512);
write('android-icon-foreground.png', svg({ size: 512, circle: SAFFRON, tickColor: '#FFFFFF', scale: 0.72 }), 512);
// Android 13+ themed icon: single-colour silhouette.
write('android-icon-monochrome.png', svg({ size: 512, circle: '#000000', tickColor: '#FFFFFF', scale: 0.72 }), 512);
// Splash: disc + tick, shown on the teal splash background.
write('splash-icon.png', svg({ size: 512, circle: SAFFRON, tickColor: '#FFFFFF' }), 512);
// Notification small icon: white silhouette on transparent (Android tints it).
write('notification-icon.png', svg({ size: 96, tickColor: '#FFFFFF', stroke: 14 }), 96);
write('favicon.png', svg({ size: 64, bg: TEAL, circle: SAFFRON, tickColor: '#FFFFFF' }), 64);
