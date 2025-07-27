// js/ui.js
import { showMessage, rotasOnibus, resultadosBusca, setRotasOnibus, setResultadosBusca } from './utils.js';
import { calculateDistance, calculateSimilarity } from './utils.js';
import { fetchCoordinates } from './api.js';
import { saveData } from './storage.js';
import { MAX_DISTANCE_SEARCH_KM, MIN_SIMILARITY_SCORE } from './config.js';

let currentMap = null; // Variável para a instância do mapa Leaflet

export async function searchBus() {
    const userAddress = document.getElementById('userAddress').value.trim();
    const destination = document.getElementById('destination').value.trim();
    
    if (!userAddress) {
        alert('Digite seu endereço atual');
        return;
    }
    
    const resultDiv = document.getElementById('searchResult');
    const busResults = document.getElementById('busResults');
    
    busResults.innerHTML = '<div class="loading">🔍 Procurando ônibus próximos...</div>';
    resultDiv.style.display = 'block';

    if (currentMap) {
        currentMap.remove(); // Remove o mapa anterior se existir
        currentMap = null;
    }
    document.getElementById('mapContainer').style.display = 'none'; // Esconde o contêiner do mapa por enquanto

    const userCoords = await fetchCoordinates(userAddress);
    if (!userCoords) {
        busResults.innerHTML = '<div style="color: #f44336; text-align: center; padding: 20px;">❌ Endereço não encontrado. Tente um endereço mais específico.</div>';
        return;
    }
    
    const results = [];
    
    for (const bus of rotasOnibus) {
        let bestMatch = {
            score: 0,
            type: '',
            stop: '',
            distance: Infinity,
            coords: null,
            index: -1
        };
        
        for (let j = 0; j < bus.stops.length; j++) {
            const stop = bus.stops[j];
            const stopCoords = bus.coordsStops[j]; // Usar coordenadas já armazenadas

            if (stopCoords) {
                const distance = calculateDistance(
                    userCoords.lat, userCoords.lng,
                    stopCoords.lat, stopCoords.lng
                );
                
                // Priorizar a proximidade física. Similaridade textual como fator secundário.
                const proximityScore = Math.max(0, (MAX_DISTANCE_SEARCH_KM - distance) / MAX_DISTANCE_SEARCH_KM); // Score de 0 a 1 baseado na distância
                const textSimilarityScore = calculateSimilarity(userAddress, stop);

                // Score combinado, dando mais peso à proximidade (ex: 80% proximidade, 20% texto)
                const combinedScore = (proximityScore * 0.8) + (textSimilarityScore * 0.2);
                
                if (combinedScore > bestMatch.score || 
                   (combinedScore === bestMatch.score && distance < bestMatch.distance)) {
                    bestMatch = {
                        score: combinedScore,
                        type: distance <= 0.2 ? 'exato' : (distance <= 1 ? 'proximo' : 'longe'), // Categoriza pela distância
                        stop: stop,
                        distance: distance,
                        coords: stopCoords,
                        index: j
                    };
                }
            }
            
            // Lógica para destino (se fornecido)
            if (destination) {
                const destinationSimilarity = calculateSimilarity(destination, stop);
                // Se o destino tem alta similaridade com uma parada, considere mesmo que a origem esteja um pouco longe
                if (destinationSimilarity > 0.7 && bestMatch.score < destinationSimilarity) {
                     bestMatch = {
                        score: destinationSimilarity, // Alta prioridade para o destino
                        type: 'destino',
                        stop: stop,
                        distance: bestMatch.distance, // Mantém a distância da origem se já calculada
                        coords: stopCoords,
                        index: j
                    };
                }
            }
        }
        
        // Adiciona à lista de resultados se o score for significativo ou a distância for aceitável
        if (bestMatch.score > MIN_SIMILARITY_SCORE || bestMatch.distance <= MAX_DISTANCE_SEARCH_KM) {
            results.push({
                bus: bus,
                match: bestMatch,
                userCoords: userCoords
            });
        }
    }
    
    results.sort((a, b) => {
        if (b.match.score !== a.match.score) {
            return b.match.score - a.match.score;
        }
        return a.match.distance - b.match.distance;
    });
    
    setResultadosBusca({
        results: results,
        userCoords: userCoords,
        userAddress: userAddress
    });
    
    displayResults(results, userAddress, userCoords);
}

export function displayResults(results, userAddress, userCoords) {
    const busResults = document.getElementById('busResults');
    const mapContainer = document.getElementById('mapContainer');
    
    if (results.length === 0) {
        busResults.innerHTML = `<div style="text-align: center; padding: 20px; color: #666;">
                                    <div style="font-size: 1.2em; margin-bottom: 10px;">😔 Nenhum ônibus encontrado</div>
                                    <p>Não encontramos rotas próximas ao endereço:<br><strong>${userAddress}</strong></p>
                                </div>`;
        if (currentMap) {
            currentMap.remove();
            currentMap = null;
        }
        mapContainer.style.display = 'none';
        return;
    }
    
    let html = `<div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
                    <h4 style="margin: 0 0 10px 0; color: #2e7d32;">📍 Busca realizada:</h4>
                    <p style="margin: 0; font-weight: 600;">${userAddress}</p>
                    <small style="color: #666;">Encontramos ${results.length} linha(s) próxima(s)</small>
                </div>`;
    
    results.forEach((result, i) => {
        const distanceText = result.match.distance < 1 ? 
            `${Math.round(result.match.distance * 1000)}m` : 
            `${result.match.distance.toFixed(1)}km`;
        
        let status = { icon: '📍', text: 'Próximo', className: 'status-far' };
        if (result.match.type === 'exato') {
            status = { icon: '✅', text: 'Passa no local', className: 'status-exact' };
        } else if (result.match.type === 'proximo') {
            status = { icon: '🚶‍♂️', text: 'Caminhada curta', className: 'status-close' };
        } else if (result.match.type === 'destino') {
            status = { icon: '🎯', text: 'Atende destino', className: 'status-exact' }; // Ou outra cor
        }
        
        html += `
            <div class="bus-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="bus-number">Linha ${result.bus.number}</div>
                        <div class="bus-route">${result.bus.route}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="status-badge ${status.className}">${status.icon} ${status.text}</div>
                        <div class="distance">${distanceText}</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <div style="font-size: 0.9em; opacity: 0.9;">
                        <strong>Ponto mais próximo:</strong><br>📍 ${result.match.stop}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="javascript:void(0)" onclick="window.openFullRouteMap(${i})" class="btn-map" aria-label="Ver trajeto completo no mapa">🗺️ Ver Trajeto Completo</a>
                    <a href="http://google.com/maps/dir/${encodeURIComponent(userAddress)}/${encodeURIComponent(result.match.stop)}" target="_blank" class="btn-map" style="background: #2196F3; color: white;" aria-label="Ir ao ponto mais próximo no Google Maps">🧭 Ir ao Ponto</a>
                </div>
            </div>
        `;
    });
    
    busResults.innerHTML = html;

    // Inicializa o mapa
    mapContainer.style.display = 'block';
    if (currentMap) {
        currentMap.remove();
    }
    currentMap = L.map('mapContainer').setView([userCoords.lat, userCoords.lng], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(currentMap);

    // Adiciona marcador para o endereço do usuário
    L.marker([userCoords.lat, userCoords.lng])
        .addTo(currentMap)
        .bindPopup(`<b>Seu endereço:</b><br>${userAddress}`).openPopup();

    // Adiciona marcadores para as paradas mais próximas encontradas
    const bounds = L.latLngBounds();
    bounds.extend([userCoords.lat, userCoords.lng]);

    results.forEach(res => {
        if (res.match.coords) {
            const marker = L.marker([res.match.coords.lat, res.match.coords.lng], {
                icon: L.divIcon({
                    className: 'custom-bus-icon',
                    html: `<div style="background: #4CAF50; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${res.bus.number}</div>`,
                    iconSize: [30, 30]
                })
            }).addTo(currentMap)
              .bindPopup(`<b>Linha ${res.bus.number}:</b> ${res.bus.route}<br>Ponto: ${res.match.stop}<br>Distância: ${res.match.distance.toFixed(1)}km`);
            bounds.extend([res.match.coords.lat, res.match.coords.lng]);
        }
    });

    // Ajusta a vista do mapa para incluir todos os marcadores relevantes
    if (results.length > 0) {
        currentMap.fitBounds(bounds.pad(0.2)); // Adiciona um padding para melhor visualização
    }
}

export function openFullRouteMap(resultIndex) {
    if (!resultadosBusca || !resultadosBusca.results[resultIndex]) {
        alert('Dados da rota não encontrados. Faça uma nova busca.');
        return;
    }
    
    const result = resultadosBusca.results[resultIndex];
    const bus = result.bus;
    const userAddress = resultadosBusca.userAddress;
    
    // Constrói a URL do Google Maps com origem, destino e waypoints
    const origin = encodeURIComponent(userAddress);
    const destination = encodeURIComponent(bus.stops[bus.stops.length - 1]); // Última parada da rota como destino
    
    // As paradas intermediárias, excluindo a primeira e a última se já forem origem/destino
    const waypoints = bus.stops
                        .slice(0, bus.stops.length - 1) // Remove o destino final
                        .map(stop => encodeURIComponent(stop))
                        .join('|');

    let url = `https://www.google.com/maps/dir/${origin}/${destination}`;
    if (waypoints) {
        url += `?waypoints=${waypoints}`;
    }
    url += `&travelmode=transit`; // Modo de viagem para trânsito público

    window.open(url, '_blank');
}

export function openAdminFullRouteMap(routeIndex) {
    const route = rotasOnibus[routeIndex];
    if (!route || route.stops.length < 2) {
        alert('Rota não encontrada ou com paradas insuficientes.');
        return;
    }
    
    const origin = encodeURIComponent(route.stops[0]); // Primeira parada como origem
    const destination = encodeURIComponent(route.stops[route.stops.length - 1]); // Última parada como destino
    
    const waypoints = route.stops
                        .slice(1, route.stops.length - 1) // Exclui a primeira e a última
                        .map(stop => encodeURIComponent(stop))
                        .join('|');

    let url = `https://www.google.com/maps/dir/${origin}/${destination}`;
    if (waypoints) {
        url += `?waypoints=${waypoints}`;
    }
    url += `&travelmode=transit`; 

    window.open(url, '_blank');
}

export async function addRoute() {
    const number = document.getElementById('busNumber').value.trim();
    const routeName = document.getElementById('busRoute').value.trim();
    const stopsText = document.getElementById('busStops').value.trim();
    
    if (!number || !routeName || !stopsText) {
        showMessage('Preencha todos os campos!', 'error');
        alert('Preencha todos os campos');
        return;
    }
    
    const rawStops = stopsText.split('\n').map(p => p.trim()).filter(p => p);
    
    if (rawStops.length < 2) {
        showMessage('Adicione pelo menos 2 endereços!', 'error');
        alert('Adicione pelo menos 2 endereços');
        return;
    }

    // Geocodificar todas as paradas ANTES de adicionar
    const geocodingPromises = rawStops.map(stop => fetchCoordinates(stop));
    const geocodedStops = await Promise.all(geocodingPromises);

    const validStops = [];
    const validCoords = [];
    geocodedStops.forEach((coords, index) => {
        if (coords) {
            validStops.push(rawStops[index]);
            validCoords.push(coords);
        } else {
            console.warn(`Não foi possível geocodificar: ${rawStops[index]}`);
        }
    });

    if (validStops.length < 2) {
        alert('Não foi possível encontrar coordenadas válidas para pelo menos 2 endereços. Verifique os endereços e tente novamente.');
        return;
    }
    
    const existingRouteIndex = rotasOnibus.findIndex(r => r.number === number);
    
    if (existingRouteIndex !== -1) {
        if (!confirm(`Rota ${number} já existe. Substituir?`)) {
            return;
        }
        rotasOnibus.splice(existingRouteIndex, 1); // Remove a rota existente
    }
    
    rotasOnibus.push({
        number: number,
        route: routeName,
        stops: validStops,
        coordsStops: validCoords // Armazena as coordenadas geocodificadas
    });
    
    saveData(rotasOnibus); // Salva no localStorage
    
    document.getElementById('busNumber').value = '';
    document.getElementById('busRoute').value = '';
    document.getElementById('busStops').value = '';
    
    showMessage('Rota adicionada com sucesso! 💾');
    updateRoutesList();
}

export function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        let importedCount = 0;
        
        const newRoutes = [];
        for (let i = 1; i < lines.length; i++) { // Ignora o cabeçalho
            const line = lines[i];
            if (line.trim()) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const number = parts[0].trim();
                    const routeName = parts[1].trim();
                    const rawStops = parts.slice(2).map(p => p.trim()).filter(p => p);
                    
                    if (number && routeName && rawStops.length > 0) {
                        const geocodingPromises = rawStops.map(stop => fetchCoordinates(stop));
                        const geocodedStops = await Promise.all(geocodingPromises);

                        const validStops = [];
                        const validCoords = [];
                        geocodedStops.forEach((coords, index) => {
                            if (coords) {
                                validStops.push(rawStops[index]);
                                validCoords.push(coords);
                            }
                        });

                        if (validStops.length >= 2) { // Garante pelo menos 2 paradas geocodificadas
                            const existingRouteIndex = rotasOnibus.findIndex(r => r.number === number);
                            if (existingRouteIndex !== -1) {
                                rotasOnibus.splice(existingRouteIndex, 1); // Remove para substituir
                            }
                            newRoutes.push({ number: number, route: routeName, stops: validStops, coordsStops: validCoords });
                            importedCount++;
                        } else {
                            console.warn(`Rota ${number} ignorada devido a poucas paradas válidas geocodificadas.`);
                        }
                    }
                }
            }
        }
        
        setRotasOnibus([...rotasOnibus, ...newRoutes]); // Adiciona as novas rotas ao array global
        saveData(rotasOnibus);
        updateRoutesList();
        showMessage(`${importedCount} rotas importadas! 📁`);
    };
    
    reader.readAsText(file);
}

export function deleteRoute(index) {
    const route = rotasOnibus[index];
    if (confirm(`Excluir rota ${route.number} (${route.route})?`)) {
        rotasOnibus.splice(index, 1);
        saveData(rotasOnibus);
        updateRoutesList();
        showMessage('Rota excluída! 🗑️');
    }
}

export function exportBackup() {
    const data = JSON.stringify(rotasOnibus, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_rotas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Backup exportado! 📤');
}

export function clearAllData() {
    if (confirm('Apagar TODAS as rotas?') && confirm('Confirma exclusão? Esta ação é irreversível!')) {
        setRotasOnibus([]); // Limpa o array global
        saveData(rotasOnibus);
        updateRoutesList();
        showMessage('Dados limpos! 🗑️');
    }
}

export function updateRoutesList() {
    const list = document.getElementById('routesList');
    
    if (rotasOnibus.length === 0) {
        list.innerHTML = '<p style="color: #666;">Nenhuma rota cadastrada</p>';
        return;
    }
    
    let html = '';
    rotasOnibus.forEach((bus, i) => {
        const preview = bus.stops.slice(0, 2).join(' → ') + (bus.stops.length > 2 ? ' → ...' : '');
        
        html += `
            <div class="route-item" role="listitem">
                <div class="route-number" aria-label="Linha ${bus.number}">🚌 Linha ${bus.number}</div>
                <div style="font-weight: 600; margin: 5px 0;">${bus.route}</div>
                <div class="stops-preview">📍 ${bus.stops.length} paradas: ${preview}</div>
                <div class="route-actions">
                    <a href="javascript:void(0)" onclick="window.openAdminFullRouteMap(${i})" class="btn-map" aria-label="Ver trajeto completo da rota no mapa">🗺️ Ver Trajeto Completo</a>
                    <button class="btn-delete" onclick="window.deleteRoute(${i})" aria-label="Excluir rota ${bus.number}">🗑️ Excluir</button>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}
