// /service/js/core/register-sw.js — εγγραφή του service worker του Service (scope: /service/)
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () { /* χωρίς offline, η εφαρμογή δουλεύει κανονικά */ });
  });
})();
