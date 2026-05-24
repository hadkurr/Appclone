import { Fingerprint } from '../types/profile';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
];

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const LANGUAGES = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'ja-JP', 'zh-CN', 'ko-KR', 'pt-BR', 'ru-RU'];
const SCREEN_SIZES = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1680, height: 1050 },
  { width: 3840, height: 2160 },
];
const COLOR_DEPTHS = [24, 32];
const WEBGL_VENDORS = ['Google Inc. (NVIDIA)', 'Google Inc. (AMD)', 'Google Inc. (Intel)', 'Google Inc.'];
const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PROFILE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#f97316', '#84cc16',
  '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9', '#d946ef',
];

export function generateFingerprint(): Fingerprint {
  const screen = randomItem(SCREEN_SIZES);
  return {
    userAgent: randomItem(USER_AGENTS),
    platform: randomItem(PLATFORMS),
    language: randomItem(LANGUAGES),
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: randomItem(COLOR_DEPTHS),
    webglVendor: randomItem(WEBGL_VENDORS),
    webglRenderer: randomItem(WEBGL_RENDERERS),
    canvasNoise: Math.random() > 0.3,
  };
}

export function generateProfileColor(): string {
  return randomItem(PROFILE_COLORS);
}

export function buildFingerprintJS(fp: Fingerprint): string {
  return `
(function() {
  try {
    Object.defineProperty(navigator, 'userAgent', { get: function() { return ${JSON.stringify(fp.userAgent)}; } });
  } catch(e) {}
  try {
    Object.defineProperty(navigator, 'platform', { get: function() { return ${JSON.stringify(fp.platform)}; } });
  } catch(e) {}
  try {
    Object.defineProperty(navigator, 'language', { get: function() { return ${JSON.stringify(fp.language)}; } });
  } catch(e) {}
  try {
    Object.defineProperty(navigator, 'languages', { get: function() { return [${JSON.stringify(fp.language)}, 'en']; } });
  } catch(e) {}
  try {
    Object.defineProperty(screen, 'width', { get: function() { return ${fp.screenWidth}; } });
    Object.defineProperty(screen, 'height', { get: function() { return ${fp.screenHeight}; } });
    Object.defineProperty(screen, 'colorDepth', { get: function() { return ${fp.colorDepth}; } });
  } catch(e) {}
  try {
    var getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return ${JSON.stringify(fp.webglVendor)};
      if (param === 37446) return ${JSON.stringify(fp.webglRenderer)};
      return getParam.call(this, param);
    };
  } catch(e) {}
  ${fp.canvasNoise ? `
  try {
    var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      var ctx = this.getContext('2d');
      if (ctx) {
        var imgData = ctx.getImageData(0, 0, Math.min(this.width, 16), Math.min(this.height, 16));
        for (var i = 0; i < imgData.data.length; i += 4) {
          imgData.data[i] = imgData.data[i] ^ 1;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      return origToDataURL.apply(this, arguments);
    };
  } catch(e) {}` : ''}
})();
`;
}
