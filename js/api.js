// js/api.js
import { NOMINATIM_URL } from './config.js';

export async function fetchCoordinates(address) {
    try {
        const url = NOMINATIM_URL + encodeURIComponent(address) + '&limit=1';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                name: data[0].display_name
            };
        }
        console.warn('Endereço não encontrado pela geocodificação:', address);
        return null;
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        return null;
    }
}
