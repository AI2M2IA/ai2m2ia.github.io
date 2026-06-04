(function () {
  'use strict';

  var saved = localStorage.getItem('ai2m2ia-theme');
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  var theme = saved || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);

  var savedLang = localStorage.getItem('ai2m2ia-lang');
  if (savedLang && /^[a-z]{2,3}(?:-[A-Z0-9]{2,3})?$/.test(savedLang)) {
    document.documentElement.setAttribute('lang', savedLang);
  }
}());
