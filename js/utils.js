// js/utils.js
import { EARTH_RADIUS_KM } from './config.js';

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = EARTH_RADIUS_KM;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function calculateSimilarity(str1, str2) {
    const normalize = function(s) {
        return s.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
                .replace(/[^\w\s]/g, ' ') // Remove pontuação, mantém letras e números e espaços
                .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um
                .trim();
    };
    
    const n1 = normalize(str1);
    const n2 = normalize(str2);
    
    if (n1.includes(n2) || n2.includes(n1)) {
        return 0.9; // Alta similaridade se um contém o outro
    }
    
    const words1 = n1.split(' ').filter(function(w) { return w.length > 2; });
    const words2 = n2.split(' ').filter(function(w) { return w.length > 2; });
    
    let matches = 0;
    const total = Math.max(words1.length, words2.length);
    
    if (total === 0) return 0;

    words1.forEach(function(w1) {
        words2.forEach(function(w2) {
            if (w1 === w2) {
                matches++;
            } else if (w1.includes(w2) || w2.includes(w1)) {
                matches += 0.7; // Pontuação parcial para inclusão
            }
        });
    });
    
    return Math.min(matches / total, 1);
}

export function showMessage(text) {
    const msg = document.getElementById('successMessage');
    msg.textContent = text;
    msg.style.display = 'block';
    setTimeout(function() {
        msg.style.display = 'none';
    }, 3000);
}

// Expõe rotasOnibus e resultadosBusca para acesso da UI (não é a melhor prática, mas simplifica neste contexto)
export let rotasOnibus = [];
export let resultadosBusca = null;

export function setRotasOnibus(newRoutes) {
    rotasOnibus = newRoutes;
}

export function setResultadosBusca(newResults) {
    resultadosBusca = newResults;
}
