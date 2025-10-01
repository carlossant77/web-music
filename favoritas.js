class GerenciadorFavoritas {
    constructor() {
        this.listaFavoritas = document.getElementById('listaFavoritas');
        this.recomendacoesFavoritas = document.getElementById('recomendacoesFavoritas');
        this.favoritasVazias = document.getElementById('favoritasVazias');
        this.playlistsContainer = document.getElementById('playlistsContainer');
        
        this.favoritosKey = 'musicasFavoritas';
        this.playlistsKey = 'playlistsUsuario';
        this.historicoKey = 'historicoReproducoes';
        
        this.favoritas = [];
        this.playlists = [];
        
        this.inicializarEventos();
        this.carregarFavoritas();
    }
    
    inicializarEventos() {
        // Botões de controle
        document.getElementById('btnExportarFavoritas').addEventListener('click', () => this.mostrarModalExportar());
        document.getElementById('btnCriarPlaylist').addEventListener('click', () => this.mostrarModalPlaylist());
        document.getElementById('btnExplorarMusicas').addEventListener('click', () => this.redirectToInicio());
        
        // Filtros
        document.getElementById('filtroOrdenar').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtroArtista').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('buscarFavoritas').addEventListener('input', () => this.aplicarFiltros());
        
        // Modais
        document.getElementById('btnCriarPlaylistModal').addEventListener('click', () => this.criarPlaylist());
        document.getElementById('btnCancelarPlaylist').addEventListener('click', () => this.fecharModalPlaylist());
        document.getElementById('btnFecharExportar').addEventListener('click', () => this.fecharModalExportar());
        
        // Eventos de caracteres
        document.getElementById('nomePlaylist').addEventListener('input', (e) => this.atualizarContadorCaracteres(e, 50));
        document.getElementById('descricaoPlaylist').addEventListener('input', (e) => this.atualizarContadorCaracteres(e, 200));
        
        // Exportar
        document.querySelectorAll('.btn-exportar-formato').forEach(btn => {
            btn.addEventListener('click', (e) => this.exportarFavoritas(e.target.closest('.btn-exportar-formato').dataset.formato));
        });
        
        // Fechar modais ao clicar fora
        document.getElementById('modalPlaylist').addEventListener('click', (e) => {
            if (e.target.id === 'modalPlaylist') this.fecharModalPlaylist();
        });
        
        document.getElementById('modalExportar').addEventListener('click', (e) => {
            if (e.target.id === 'modalExportar') this.fecharModalExportar();
        });
    }
    
    carregarFavoritas() {
        this.favoritas = this.obterFavoritas();
        this.playlists = this.obterPlaylists();
        
        if (this.favoritas.length === 0) {
            this.mostrarFavoritasVazias();
            return;
        }
        
        this.carregarFiltroArtistas();
        this.mostrarFavoritas();
        this.mostrarEstatisticas();
        this.mostrarRecomendacoes();
        this.mostrarPlaylists();
    }
    
    obterFavoritas() {
        return JSON.parse(localStorage.getItem(this.favoritosKey) || '[]');
    }
    
    obterPlaylists() {
        return JSON.parse(localStorage.getItem(this.playlistsKey) || '[]');
    }
    
    salvarFavoritas() {
        localStorage.setItem(this.favoritosKey, JSON.stringify(this.favoritas));
    }
    
    salvarPlaylists() {
        localStorage.setItem(this.playlistsKey, JSON.stringify(this.playlists));
    }
    
    carregarFiltroArtistas() {
        const selectArtista = document.getElementById('filtroArtista');
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        const artistas = new Set();
        
        this.favoritas.forEach(musicaId => {
            const musica = todasMusicas.find(m => m.id === musicaId);
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
    
    mostrarFavoritas() {
        this.listaFavoritas.innerHTML = '';
        
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        const musicasFavoritas = todasMusicas.filter(musica => 
            this.favoritas.includes(musica.id)
        );
        
        if (musicasFavoritas.length === 0) {
            this.mostrarFavoritasVazias();
            return;
        }
        
        const musicasFiltradas = this.filtrarEOrdenarFavoritas(musicasFavoritas);
        
        musicasFiltradas.forEach(musica => {
            this.criarElementoMusicaFavorita(musica);
        });
        
        this.favoritasVazias.style.display = 'none';
        this.listaFavoritas.style.display = 'grid';
        document.getElementById('contadorFavoritas').textContent = `${musicasFiltradas.length} música${musicasFiltradas.length !== 1 ? 's' : ''}`;
    }
    
    filtrarEOrdenarFavoritas(musicas) {
        const termoBusca = document.getElementById('buscarFavoritas').value.toLowerCase();
        const artistaFiltro = document.getElementById('filtroArtista').value;
        const ordenarPor = document.getElementById('filtroOrdenar').value;
        
        let musicasFiltradas = musicas.filter(musica => {
            const matchBusca = musica.title.toLowerCase().includes(termoBusca) || 
                             musica.artist.toLowerCase().includes(termoBusca);
            const matchArtista = artistaFiltro === 'todos' || musica.artist === artistaFiltro;
            return matchBusca && matchArtista;
        });
        
        // Ordenar
        switch (ordenarPor) {
            case 'titulo':
                musicasFiltradas.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'artista':
                musicasFiltradas.sort((a, b) => a.artist.localeCompare(b.artist));
                break;
            case 'reproducoes':
                musicasFiltradas.sort((a, b) => (b.reproducoes || 0) - (a.reproducoes || 0));
                break;
            case 'data':
            default:
                // Manter ordem de adição (as mais recentes primeiro)
                break;
        }
        
        return musicasFiltradas;
    }
    
    criarElementoMusicaFavorita(musica) {
        const musicaEl = document.createElement('div');
        musicaEl.className = 'musica-favorita favoritada';
        
        const historico = JSON.parse(localStorage.getItem(this.historicoKey) || '[]');
        const entradaHistorico = historico.find(entry => entry.musicaId === musica.id);
        const vezesReproduzida = entradaHistorico ? entradaHistorico.vezesReproduzida : 0;
        
        musicaEl.innerHTML = `
            <div class="badge-favorita" title="Música Favorita">❤️</div>
            <div class="cabecalho-musica">
                <img src="${musica.img}" alt="${musica.title}" onerror="this.src='static/assets/padrao.jpg'">
                <div class="info-musica-favorita">
                    <h4>${musica.title}</h4>
                    <p>${musica.artist}</p>
                    <small>Reproduzida ${vezesReproduzida} vezes</small>
                </div>
            </div>
            <div class="controles-musica-favorita">
                <button class="btn-reproduzir-favorita" data-musica-id="${musica.id}">Reproduzir</button>
                <button class="btn-remover-favorita" data-musica-id="${musica.id}">Remover</button>
            </div>
        `;
        
        // Eventos dos botões
        musicaEl.querySelector('.btn-reproduzir-favorita').addEventListener('click', () => {
            this.reproduzirMusica(musica);
        });
        
        musicaEl.querySelector('.btn-remover-favorita').addEventListener('click', () => {
            this.removerFavorita(musica.id, musicaEl);
        });
        
        this.listaFavoritas.appendChild(musicaEl);
    }
    
    reproduzirMusica(musica) {
        localStorage.setItem('musicaSelecionada', JSON.stringify(musica));
        window.location.href = 'reproducao.html';
    }
    
    removerFavorita(musicaId, elemento) {
        this.favoritas = this.favoritas.filter(id => id !== musicaId);
        this.salvarFavoritas();
        
        // Animação de remoção
        elemento.style.transform = 'scale(0.9)';
        elemento.style.opacity = '0';
        
        setTimeout(() => {
            this.carregarFavoritas();
        }, 300);
    }
    
    mostrarEstatisticas() {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        const musicasFavoritas = todasMusicas.filter(musica => 
            this.favoritas.includes(musica.id)
        );
        
        // Total de favoritas
        document.getElementById('totalFavoritas').textContent = musicasFavoritas.length;
        
        // Artistas únicos
        const artistasUnicos = new Set(musicasFavoritas.map(m => m.artist));
        document.getElementById('totalArtistas').textContent = artistasUnicos.size;
        
        // Tempo total estimado (3 minutos por música)
        const tempoTotalMinutos = musicasFavoritas.length * 3;
        const horas = Math.floor(tempoTotalMinutos / 60);
        const minutos = tempoTotalMinutos % 60;
        document.getElementById('tempoTotalFavoritas').textContent = 
            horas > 0 ? `${horas}h ${minutos}min` : `${minutos} min`;
    }
    
    mostrarRecomendacoes() {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        if (todasMusicas.length === 0) return;
        
        // Recomendar músicas de artistas que estão nas favoritas
        const musicasFavoritas = todasMusicas.filter(musica => 
            this.favoritas.includes(musica.id)
        );
        
        if (musicasFavoritas.length === 0) return;
        
        const artistasFavoritos = [...new Set(musicasFavoritas.map(m => m.artist))];
        const musicasRecomendadas = todasMusicas.filter(musica => 
            artistasFavoritos.includes(musica.artist) && 
            !this.favoritas.includes(musica.id)
        ).slice(0, 4);
        
        this.recomendacoesFavoritas.innerHTML = '';
        
        if (musicasRecomendadas.length === 0) return;
        
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
            
            this.recomendacoesFavoritas.appendChild(musicaEl);
        });
    }
    
    mostrarPlaylists() {
        if (this.playlists.length === 0) {
            this.playlistsContainer.style.display = 'none';
            return;
        }
        
        this.playlistsContainer.style.display = 'block';
        const listaPlaylists = document.getElementById('listaPlaylists');
        listaPlaylists.innerHTML = '';
        
        this.playlists.forEach(playlist => {
            const playlistEl = document.createElement('div');
            playlistEl.className = 'playlist-card';
            
            playlistEl.innerHTML = `
                <h4>${playlist.nome}</h4>
                <p>${playlist.descricao || 'Sem descrição'}</p>
                <div class="playlist-meta">${playlist.musicas.length} músicas</div>
            `;
            
            playlistEl.addEventListener('click', () => {
                this.abrirPlaylist(playlist);
            });
            
            listaPlaylists.appendChild(playlistEl);
        });
    }
    
    aplicarFiltros() {
        this.mostrarFavoritas();
    }
    
    mostrarFavoritasVazias() {
        this.listaFavoritas.style.display = 'none';
        this.favoritasVazias.style.display = 'block';
        this.recomendacoesFavoritas.innerHTML = '';
        this.playlistsContainer.style.display = 'none';
        
        // Atualizar estatísticas para zero
        document.getElementById('totalFavoritas').textContent = '0';
        document.getElementById('totalArtistas').textContent = '0';
        document.getElementById('tempoTotalFavoritas').textContent = '0 min';
    }
    
    // Funcionalidades Criativas
    
    mostrarModalPlaylist() {
        document.getElementById('modalPlaylist').classList.add('active');
        document.getElementById('nomePlaylist').value = '';
        document.getElementById('descricaoPlaylist').value = '';
        this.atualizarContadorCaracteres({ target: document.getElementById('nomePlaylist') }, 50);
        this.atualizarContadorCaracteres({ target: document.getElementById('descricaoPlaylist') }, 200);
    }
    
    fecharModalPlaylist() {
        document.getElementById('modalPlaylist').classList.remove('active');
    }
    
    criarPlaylist() {
        const nome = document.getElementById('nomePlaylist').value.trim();
        const descricao = document.getElementById('descricaoPlaylist').value.trim();
        
        if (!nome) {
            alert('Por favor, digite um nome para a playlist.');
            return;
        }
        
        const novaPlaylist = {
            id: Date.now().toString(),
            nome: nome,
            descricao: descricao,
            dataCriacao: new Date().toISOString(),
            musicas: [...this.favoritas] // Copia todas as favoritas para a playlist
        };
        
        this.playlists.unshift(novaPlaylist);
        this.salvarPlaylists();
        this.fecharModalPlaylist();
        this.mostrarPlaylists();
        
        alert(`Playlist "${nome}" criada com sucesso com ${this.favoritas.length} músicas!`);
    }
    
    abrirPlaylist(playlist) {
        // Aqui você pode implementar a visualização da playlist
        alert(`Abrindo playlist: ${playlist.nome}\n${playlist.musicas.length} músicas`);
    }
    
    mostrarModalExportar() {
        document.getElementById('modalExportar').classList.add('active');
    }
    
    fecharModalExportar() {
        document.getElementById('modalExportar').classList.remove('active');
    }
    
    exportarFavoritas(formato) {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        const musicasFavoritas = todasMusicas.filter(musica => 
            this.favoritas.includes(musica.id)
        );
        
        let conteudo = '';
        let tipoMime = '';
        let extensao = '';
        
        switch (formato) {
            case 'texto':
                conteudo = this.exportarComoTexto(musicasFavoritas);
                tipoMime = 'text/plain';
                extensao = 'txt';
                break;
            case 'json':
                conteudo = this.exportarComoJSON(musicasFavoritas);
                tipoMime = 'application/json';
                extensao = 'json';
                break;
            case 'csv':
                conteudo = this.exportarComoCSV(musicasFavoritas);
                tipoMime = 'text/csv';
                extensao = 'csv';
                break;
        }
        
        this.downloadArquivo(conteudo, `musicas_favoritas.${extensao}`, tipoMime);
        this.fecharModalExportar();
        alert(`Lista de favoritas exportada como ${formato.toUpperCase()}!`);
    }
    
    exportarComoTexto(musicas) {
        let texto = 'MINHAS MÚSICAS FAVORITAS\n';
        texto += '=====================\n\n';
        
        musicas.forEach((musica, index) => {
            texto += `${index + 1}. ${musica.title} - ${musica.artist}\n`;
        });
        
        texto += `\nTotal: ${musicas.length} músicas`;
        return texto;
    }
    
    exportarComoJSON(musicas) {
        return JSON.stringify({
            playlist: 'Músicas Favoritas',
            dataExportacao: new Date().toISOString(),
            totalMusicas: musicas.length,
            musicas: musicas.map(m => ({
                titulo: m.title,
                artista: m.artist,
                reproducoes: m.reproducoes || 0
            }))
        }, null, 2);
    }
    
    exportarComoCSV(musicas) {
        let csv = 'Título,Artista,Reproduções\n';
        
        musicas.forEach(musica => {
            csv += `"${musica.title}","${musica.artist}",${musica.reproducoes || 0}\n`;
        });
        
        return csv;
    }
    
    downloadArquivo(conteudo, nomeArquivo, tipoMime) {
        const blob = new Blob([conteudo], { type: tipoMime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    atualizarContadorCaracteres(e, max) {
        const contador = e.target.nextElementSibling;
        if (contador && contador.classList.contains('contador-caracteres')) {
            contador.textContent = `${e.target.value.length}/${max}`;
        }
    }
    
    redirectToInicio() {
        window.location.href = 'inicio.html';
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new GerenciadorFavoritas();
});