// Expose à l'interface un accès réseau passant par le processus principal (pas de restriction CORS).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dofusTools', {
  isDesktop: true,
  fetchJson: (url) => ipcRenderer.invoke('fetch-json', url),
  equipmentCatalog: (force) => ipcRenderer.invoke('equipment-catalog', !!force),
});
