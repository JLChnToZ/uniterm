'use strict';
module.exports.init = function(prefs) {
  prefs.changeDefault('cursor-color', '#0F8');
  prefs.changeDefault('cursor-blink', true);
  prefs.changeDefault('cursor-blink-cycle', [40, 40]);
  prefs.changeDefault('font-size', 14);
  prefs.changeDefault('color-palette-overrides', [
    '#111', '#F40', '#0F4', '#FC0',
    '#08F', '#80F', '#0F8', '#CCC',
    '#888', '#F04', '#8F0', '#FF8',
    '#44F', '#F8C', '#4FC', '#FFF'
  ]);
};
