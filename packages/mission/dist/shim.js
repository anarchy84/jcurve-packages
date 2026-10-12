"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeShim = bridgeShim;
function bridgeShim(platform, overlay = false) {
    const common = `
  var send = function (method, params) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ m: 'MocationNativeBridge', method: method, params: params || {} })); } catch (e) {}
  };
  var parse = function (p) { if (typeof p === 'string') { try { return JSON.parse(p); } catch (e) { return {}; } } return p || {}; };`;
    if (platform === 'android') {
        return `(function () {
  if (window.MocationNativeBridge) return;${common}
  window.MocationNativeBridge = {
    openAppTarget: function (p) { send('openAppTarget', parse(p)); },
    showFloatingPopup: function (p) { send('showFloatingPopup', parse(p)); },
    requestOverlayPermission: function () { send('requestOverlayPermission'); },
    hasOverlayPermission: function () { return ${overlay ? 'true' : 'false'}; }
  };
})(); true;`;
    }
    return `(function () {${common}
  var ours = { postMessage: function (body) {
    var b = parse(body);
    if (b && b.message === 'openAppTarget') send('openAppTarget', { url: b.url, fallbackUrl: b.fallbackUrl });
  } };
  try {
    window.webkit = window.webkit || {};
    var mh = window.webkit.messageHandlers;
    if (mh && typeof mh === 'object') { try { mh.MocationNativeBridge = ours; } catch (e) {} }
    if (!(window.webkit.messageHandlers && window.webkit.messageHandlers.MocationNativeBridge)) {
      var wrapped = typeof Proxy === 'function' && mh ? new Proxy(mh, { get: function (t, k) { return k === 'MocationNativeBridge' ? ours : t[k]; } }) : { MocationNativeBridge: ours };
      Object.defineProperty(window.webkit, 'messageHandlers', { value: wrapped, configurable: true });
    }
  } catch (e) {}
})(); true;`;
}
