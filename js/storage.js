// js/storage.js
export function saveData(data) {
    try {
        localStorage.setItem('rotasOnibus', JSON.stringify(data));
        console.log('Dados salvos com sucesso');
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

export function loadData() {
    try {
        const data = localStorage.getItem('rotasOnibus');
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
    
    // Dados padrão se nenhum dado for encontrado
    return [
        {
            number: "101",
            route: "Centro - Terminal Sul",
            stops: [
                "Praça da Sé, Centro",
                "Rua XV de Novembro, 500", 
                "Avenida Paulista, 1000",
                "Terminal Sul"
            ],
            // Coordenadas geocodificadas para as paradas padrão (você pode gerar essas com a API uma vez)
            coordsStops: [
                { lat: -25.4287, lng: -49.2733 }, // Praça da Sé (Exemplo de Curitiba)
                { lat: -25.4320, lng: -49.2760 }, // Rua XV de Novembro, 500
                { lat: -25.4400, lng: -49.2800 }, // Avenida Paulista, 1000 (apenas um exemplo, não é em Curitiba)
                { lat: -25.4500, lng: -49.2900 }  // Terminal Sul (exemplo)
            ]
        },
        {
            number: "202", 
            route: "Bairro Norte - Shopping",
            stops: [
                "Bairro Norte, Rua A",
                "Avenida Principal, 200",
                "Centro Comercial", 
                "Shopping Center"
            ],
            coordsStops: [
                { lat: -25.4100, lng: -49.3000 }, // Bairro Norte
                { lat: -25.4050, lng: -49.2950 }, // Avenida Principal
                { lat: -25.3900, lng: -49.2800 }, // Centro Comercial
                { lat: -25.3850, lng: -49.2750 }  // Shopping Center
            ]
        }
    ];
}
