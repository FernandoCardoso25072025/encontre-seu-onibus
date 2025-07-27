// js/main.js
import { loadData, saveData } from './storage.js';
import { searchBus, addRoute, importCSV, deleteRoute, exportBackup, clearAllData, updateRoutesList, openFullRouteMap, openAdminFullRouteMap, displayResults } from './ui.js';
import { setRotasOnibus, rotasOnibus, resultadosBusca, setResultadosBusca } from './utils.js'; // Importe as variáveis para garantir que sejam compartilhadas

// Atribuir funções do módulo UI ao objeto window para que possam ser chamadas diretamente do HTML
window.searchBus = searchBus;
window.addRoute = addRoute;
window.importCSV = importCSV;
window.deleteRoute = deleteRoute;
window.exportBackup = exportBackup;
window.clearAllData = clearAllData;
window.openFullRouteMap = openFullRouteMap;
window.openAdminFullRouteMap = openAdminFullRouteMap;

document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados e define na variável global compartilhada
    setRotasOnibus(loadData());
    updateRoutesList();
    console.log(`🚌 Sistema iniciado com ${rotasOnibus.length} rotas.`);

    // Adiciona event listeners aos botões
    document.getElementById('searchButton').addEventListener('click', searchBus);
    document.getElementById('addRouteButton').addEventListener('click', addRoute);
    document.getElementById('fileInput').addEventListener('change', importCSV);
    document.getElementById('exportButton').addEventListener('click', exportBackup);
    document.getElementById('clearButton').addEventListener('click', clearAllData);
});
