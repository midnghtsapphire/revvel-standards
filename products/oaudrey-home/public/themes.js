/* Swappable world skins. Default is candy (GitCandyland). GitAloha is the
   second skin. Art is drawn in world.js from these tokens. No trademarked
   character names. 2026-11-11 MarketShipper. */
(function (root) {
  var stations = {
    pushPier: 'Push Pier',
    prGate: 'PR Gate',
    checkGrove: 'Check Grove',
    reviewHut: 'Review Hut',
    fixIt: 'Fix-it Shack',
    mergeLagoon: 'Merge Lagoon',
    releaseVolcano: 'Release Volcano'
  };
  var themes = {
    candy: {
      id: 'candy',
      brand: 'GitCandyland',
      sky: ['#07122e', '#1d4ed8'],
      path: '#f7c4d6',
      pathEdge: '#ffe3a4',
      pellet: '#fff7fb',
      wall: ['#ff8fb8', '#8ef0c8', '#ffe27a', '#c9b6ff'],
      water: '#8ecbff',
      station: '#fff6ea',
      ink: '#1a140f',
      accent: '#ff4f8b',
      tree: 'lollipop',
      handoff: 'envelope',
      stations: stations
    },
    hawaiian: {
      id: 'hawaiian',
      brand: 'GitAloha',
      sky: ['#04243a', '#0e6e8a'],
      path: '#f0d7a4',
      pathEdge: '#1f8a70',
      pellet: '#fffaf0',
      wall: ['#1f8a70', '#e07a3d', '#f2c14e', '#147a8a'],
      water: '#1aa6c9',
      station: '#fff4e0',
      ink: '#102027',
      accent: '#e07a3d',
      tree: 'palm',
      handoff: 'surf',
      stations: stations
    }
  };
  root.OaudreyThemes = {
    defaultId: 'candy',
    get: function (id) { return themes[id] || themes.candy; },
    list: function () { return [themes.candy, themes.hawaiian]; }
  };
})(typeof window === 'undefined' ? globalThis : window);
