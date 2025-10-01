class GerenciadorHistorico {
    constructor() {
        this.listaHistorico = document.getElementById('listaHistorico');
        this.recomendacoesHistorico = document.getElementById('recomendacoesHistorico');
        this.estatisticasContainer = document.getElementById('estatisticas');
        this.filtroData = document.getElementById('filtroData');
        this.filtroArtista = document.getElementById('filtroArtista');
        
        this.historicoKey = 'historicoReproducoes';
        this.favoritosKey = 'musicasFavoritas';
        
        this.inicializarEventos();
        this.carregarHistorico();
    }
    
    inicializarEventos() {
        // Botões de controle
        document.getElementById('btnLimparHistorico').addEventListener('click', () => this.mostrarModalConfirmacao());
        document.getElementById('btnEstatisticas').addEventListener('click', () => this.toggleEstatisticas());
        document.getElementById('btnAplicarFiltros').addEventListener('click', () => this.aplicarFiltros());
        
        // Modal de confirmação
        document.getElementById('btnConfirmarLimpar').addEventListener('click', () => this.limparHistorico());
        document.getElementById('btnCancelarLimpar').addEventListener('click', () => this.fecharModal());
        
        // Fechar modal ao clicar fora
        document.getElementById('modalConfirmacao').addEventListener('click', (e) => {
            if (e.target.id === 'modalConfirmacao') this.fecharModal();
        });
    }
    
    carregarHistorico() {
        const historico = this.obterHistorico();
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        
        if (historico.length === 0) {
            this.mostrarHistoricoVazio();
            return;
        }
        
        this.carregarFiltroArtistas(historico, todasMusicas);
        this.mostrarHistorico(historico, todasMusicas);
        this.mostrarEstatisticas(historico, todasMusicas);
        this.mostrarRecomendacoes(historico, todasMusicas);
    }
    
    obterHistorico() {
        return JSON.parse(localStorage.getItem(this.historicoKey) || '[]');
    }
    
    salvarHistorico(historico) {
        localStorage.setItem(this.historicoKey, JSON.stringify(historico));
    }
    
    carregarFiltroArtistas(historico, todasMusicas) {
        const selectArtista = document.getElementById('filtroArtista');
        const artistas = new Set();
        
        historico.forEach(entry => {
            const musica = todasMusicas.find(m => m.id === entry.musicaId);
            if (musica) artistas.add(musica.artist);
        });
        
        // Limpar opções exceto "Todos"
        while (selectArtista.children.length > 1) {
            selectArtista.removeChild(selectArtista.lastChild);
        }
        
        // Adicionar artistas únicos
        artistas.forEach(artista => {
            const option = document.createElement('option');
            option.value = artista;
            option.textContent = artista;
            selectArtista.appendChild(option);
        });
    }
    
    mostrarHistorico(historico, todasMusicas) {
        this.listaHistorico.innerHTML = '';
        
        const historicoOrdenado = this.ordenarHistorico(historico, this.filtroData.value);
        const artistaFiltro = this.filtroArtista.value;
        
        let historicoFiltrado = historicoOrdenado;
        if (artistaFiltro !== 'todos') {
            historicoFiltrado = historicoOrdenado.filter(entry => {
                const musica = todasMusicas.find(m => m.id === entry.musicaId);
                return musica && musica.artist === artistaFiltro;
            });
        }
        
        if (historicoFiltrado.length === 0) {
            this.listaHistorico.innerHTML = `
                <div class="historico-vazio">
                    <p>Nenhuma música encontrada com os filtros aplicados.</p>
                </div>
            `;
            return;
        }
        
        historicoFiltrado.forEach(entry => {
            const musica = todasMusicas.find(m => m.id === entry.musicaId);
            if (musica) {
                this.criarElementoMusicaHistorico(musica, entry);
            }
        });
    }
    
    ordenarHistorico(historico, criterio) {
        switch (criterio) {
            case 'recentes':
                return [...historico].sort((a, b) => new Date(b.data) - new Date(a.data));
            case 'antigas':
                return [...historico].sort((a, b) => new Date(a.data) - new Date(b.data));
            case 'reproducoes':
                return [...historico].sort((a, b) => b.vezesReproduzida - a.vezesReproduzida);
            default:
                return historico;
        }
    }
    
    criarElementoMusicaHistorico(musica, entry) {
        const musicaEl = document.createElement('div');
        musicaEl.className = 'musica-historico';
        
        const data = new Date(entry.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const favoritos = this.obterFavoritos();
        const isFavorita = favoritos.includes(musica.id);
        
        musicaEl.innerHTML = `
            <img src="${musica.img}" alt="${musica.title}" onerror="this.src='static/assets/padrao.jpg'">
            <div class="info-musica-historico">
                <h4>${musica.title}</h4>
                <p>${musica.artist}</p>
                <div class="meta-musica">
                    <span>Reproduzida ${entry.vezesReproduzida} vezes</span>
                    <span>Última vez: ${dataFormatada} às ${horaFormatada}</span>
                </div>
            </div>
            <div class="controles-musica-historico">
                <button class="btn-reproduzir" data-musica-id="${musica.id}">Reproduzir</button>
                <button class="btn-favoritar ${isFavorita ? 'favoritada' : ''}" data-musica-id="${musica.id}">
                    ${isFavorita ? '❤️' : '🤍'} Favorita
                </button>
            </div>
        `;
        
        // Eventos dos botões
        musicaEl.querySelector('.btn-reproduzir').addEventListener('click', () => {
            this.reproduzirMusica(musica);
        });
        
        musicaEl.querySelector('.btn-favoritar').addEventListener('click', (e) => {
            this.toggleFavorita(musica.id, e.target);
        });
        
        this.listaHistorico.appendChild(musicaEl);
    }
    
    reproduzirMusica(musica) {
        // Adicionar ao histórico
        this.adicionarAoHistorico(musica.id);
        
        // Redirecionar para reprodução
        localStorage.setItem('musicaSelecionada', JSON.stringify(musica));
        window.location.href = 'reproducao.html';
    }
    
    adicionarAoHistorico(musicaId) {
        const historico = this.obterHistorico();
        const agora = new Date().toISOString();
        
        const entradaExistente = historico.find(entry => entry.musicaId === musicaId);
        
        if (entradaExistente) {
            entradaExistente.vezesReproduzida += 1;
            entradaExistente.data = agora;
        } else {
            historico.unshift({
                musicaId: musicaId,
                vezesReproduzida: 1,
                data: agora
            });
        }
        
        // Manter apenas as 100 entradas mais recentes
        if (historico.length > 100) {
            historico.splice(100);
        }
        
        this.salvarHistorico(historico);
    }
    
    toggleFavorita(musicaId, botao) {
        const favoritos = this.obterFavoritos();
        const isFavorita = favoritos.includes(musicaId);
        
        if (isFavorita) {
            // Remover dos favoritos
            const index = favoritos.indexOf(musicaId);
            favoritos.splice(index, 1);
            botao.classList.remove('favoritada');
            botao.innerHTML = '🤍 Favorita';
        } else {
            // Adicionar aos favoritos
            favoritos.push(musicaId);
            botao.classList.add('favoritada');
            botao.innerHTML = '❤️ Favorita';
        }
        
        localStorage.setItem(this.favoritosKey, JSON.stringify(favoritos));
    }
    
    obterFavoritos() {
        return JSON.parse(localStorage.getItem(this.favoritosKey) || '[]');
    }
    
    mostrarEstatisticas(historico, todasMusicas) {
        if (historico.length === 0) return;
        
        // Total de reproduções
        const totalReproducoes = historico.reduce((total, entry) => total + entry.vezesReproduzida, 0);
        document.getElementById('totalReproducoes').textContent = totalReproducoes;
        
        // Artista mais ouvido
        const artistasCount = {};
        historico.forEach(entry => {
            const musica = todasMusicas.find(m => m.id === entry.musicaId);
            if (musica) {
                artistasCount[musica.artist] = (artistasCount[musica.artist] || 0) + entry.vezesReproduzida;
            }
        });
        
        const artistaTop = Object.keys(artistasCount).reduce((a, b) => 
            artistasCount[a] > artistasCount[b] ? a : b, 'Nenhum');
        document.getElementById('artistaTop').textContent = artistaTop;
        
        // Música mais tocada
        const musicasCount = {};
        historico.forEach(entry => {
            const musica = todasMusicas.find(m => m.id === entry.musicaId);
            if (musica) {
                musicasCount[musica.title] = (musicasCount[musica.title] || 0) + entry.vezesReproduzida;
            }
        });
        
        const musicaTop = Object.keys(musicasCount).reduce((a, b) => 
            musicasCount[a] > musicasCount[b] ? a : b, 'Nenhuma');
        document.getElementById('musicaTop').textContent = musicaTop;
        
        // Tempo total estimado (assumindo 3 minutos por música)
        const tempoTotalMinutos = Math.round(totalReproducoes * 3);
        const horas = Math.floor(tempoTotalMinutos / 60);
        const minutos = tempoTotalMinutos % 60;
        document.getElementById('tempoTotal').textContent = 
            horas > 0 ? `${horas}h ${minutos}min` : `${minutos} min`;
    }
    
    mostrarRecomendacoes(historico, todasMusicas) {
        if (historico.length === 0 || todasMusicas.length === 0) return;
        
        // Encontrar artista mais ouvido
        const artistasCount = {};
        historico.forEach(entry => {
            const musica = todasMusicas.find(m => m.id === entry.musicaId);
            if (musica) {
                artistasCount[musica.artist] = (artistasCount[musica.artist] || 0) + entry.vezesReproduzida;
            }
        });
        
        const artistaTop = Object.keys(artistasCount).reduce((a, b) => 
            artistasCount[a] > artistasCount[b] ? a : b, '');
        
        // Recomendar músicas do artista mais ouvido que não estão no histórico
        const musicasArtistaTop = todasMusicas.filter(musica => 
            musica.artist === artistaTop && 
            !historico.some(entry => entry.musicaId === musica.id)
        );
        
        // Se não houver músicas do artista top, recomendar músicas aleatórias
        const musicasRecomendadas = musicasArtistaTop.length > 0 ? 
            musicasArtistaTop.slice(0, 4) : 
            this.selecionarAleatorias(todasMusicas, 4);
        
        this.recomendacoesHistorico.innerHTML = '';
        
        musicasRecomendadas.forEach(musica => {
            const musicaEl = document.createElement('div');
            musicaEl.className = 'musica-card';
            
            musicaEl.innerHTML = `
                <img src="${musica.img}" alt="${musica.title}" class="capa-musica" 
                     onerror="this.src='static/assets/padrao.jpg'"/>
                <h4>${musica.title}</h4>
                <p>${musica.artist}</p>
            `;
            
            musicaEl.addEventListener('click', () => {
                this.reproduzirMusica(musica);
            });
            
            this.recomendacoesHistorico.appendChild(musicaEl);
        });
    }
    
    selecionarAleatorias(musicas, quantidade) {
        const copiaMusicas = [...musicas];
        const selecionadas = [];
        const max = Math.min(quantidade, copiaMusicas.length);
        
        for (let i = 0; i < max; i++) {
            const randomIndex = Math.floor(Math.random() * copiaMusicas.length);
            selecionadas.push(copiaMusicas.splice(randomIndex, 1)[0]);
        }
        
        return selecionadas;
    }
    
    aplicarFiltros() {
        this.carregarHistorico();
    }
    
    toggleEstatisticas() {
        const estaVisivel = this.estatisticasContainer.style.display !== 'none';
        this.estatisticasContainer.style.display = estaVisivel ? 'none' : 'block';
        
        const botao = document.getElementById('btnEstatisticas');
        botao.textContent = estaVisivel ? 'Ver Estatísticas' : 'Ocultar Estatísticas';
    }
    
    mostrarModalConfirmacao() {
        document.getElementById('modalConfirmacao').classList.add('active');
    }
    
    fecharModal() {
        document.getElementById('modalConfirmacao').classList.remove('active');
    }
    
    limparHistorico() {
        localStorage.removeItem(this.historicoKey);
        this.fecharModal();
        this.mostrarHistoricoVazio();
        this.estatisticasContainer.style.display = 'none';
        document.getElementById('btnEstatisticas').textContent = 'Ver Estatísticas';
    }
    
    mostrarHistoricoVazio() {
        this.listaHistorico.innerHTML = `
            <div class="historico-vazio">
                <img src="static/assets/historico.png" alt="Histórico vazio">
                <h3>Seu histórico está vazio</h3>
                <p>Comece a reproduzir músicas para vê-las aqui!</p>
            </div>
        `;
        
        this.recomendacoesHistorico.innerHTML = '';
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new GerenciadorHistorico();
});

// Função para ser chamada quando uma música é reproduzida (deve ser adicionada ao reprodução.js)
function registrarReproducaoNoHistorico(musicaId) {
    const historico = JSON.parse(localStorage.getItem('historicoReproducoes') || '[]');
    const agora = new Date().toISOString();
    
    const entradaExistente = historico.find(entry => entry.musicaId === musicaId);
    
    if (entradaExistente) {
        entradaExistente.vezesReproduzida += 1;
        entradaExistente.data = agora;
    } else {
        historico.unshift({
            musicaId: musicaId,
            vezesReproduzida: 1,
            data: agora
        });
    }
    
    // Manter apenas as 100 entradas mais recentes
    if (historico.length > 100) {
        historico.splice(100);
    }
    
    localStorage.setItem('historicoReproducoes', JSON.stringify(historico));
}