class MusicPlayer {
    constructor() {
        console.log('Iniciando MusicPlayer...');
        
        this.audio = document.getElementById('audioPlayer');
        this.isPlaying = false;
        this.currentMusic = null;
        this.recomendacoes = [];
        this.baseUrl = localStorage.getItem('urlServidor') || '';
        
        // Lista completa para navegação (música atual + recomendações)
        this.listaNavegacao = [];
        this.indiceAtual = -1;

        console.log('Base URL:', this.baseUrl);

        this.initializeElements();
        this.loadMusicData();
        this.setupEventListeners();
        
        // Para acesso global temporário (debug)
        window.musicPlayer = this;
    }
    
    initializeElements() {
        // Elementos da música principal
        this.capaAlbumPrincipal = document.getElementById('capaAlbumPrincipal');
        this.tituloMusicaPrincipal = document.getElementById('tituloMusicaPrincipal');
        this.artistaMusicaPrincipal = document.getElementById('artistaMusicaPrincipal');
        
        // Botão de favoritar
        this.btnFavoritar = document.getElementById('btnFavoritar');
        this.iconeFavorito = document.getElementById('iconeFavorito');
        
        // Elementos de controle
        this.btnPlayPause = document.getElementById('btnPlayPause');
        this.playPauseIcon = document.getElementById('playPauseIcon');
        this.btnPrev = document.getElementById('btnPrev');
        this.btnNext = document.getElementById('btnNext');
        this.btnShuffle = document.getElementById('btnShuffle');
        this.btnRepeat = document.getElementById('btnRepeat');
        this.btnVoltar = document.getElementById('btnVoltar');
        
        // Elementos de progresso
        this.progress = document.getElementById('progress');
        this.progressBar = document.querySelector('.progress-bar');
        this.tempoAtual = document.getElementById('tempoAtual');
        this.tempoTotal = document.getElementById('tempoTotal');
        
        // Elementos de volume
        this.volumeLevel = document.getElementById('volumeLevel');
        this.volumeBar = document.querySelector('.volume-bar');
        
        // Lista de recomendações
        this.listaRecomendacoes = document.getElementById('listaRecomendacoes');
        
        // Inicializar tempos
        if (this.tempoAtual) this.tempoAtual.textContent = '0:00';
        if (this.tempoTotal) this.tempoTotal.textContent = '0:00';
        
        console.log('Botão de favoritar encontrado:', !!this.btnFavoritar);
        console.log('Ícone de favorito encontrado:', !!this.iconeFavorito);
        console.log('Botão Play/Pause encontrado:', !!this.btnPlayPause);
        console.log('Botão Voltar encontrado:', !!this.btnVoltar);
    }
    
    loadMusicData() {
        console.log('Carregando dados da música...');
        
        const musicaSalva = localStorage.getItem('musicaSelecionada');
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        
        console.log('Música salva:', musicaSalva);
        console.log('Total de músicas:', todasMusicas.length);

        if (musicaSalva) {
            this.currentMusic = JSON.parse(musicaSalva);
            console.log('Música atual:', this.currentMusic);
            
            this.displayMusicInfo();
            this.loadAudio();
            this.carregarRecomendacoes(todasMusicas);
            this.atualizarEstadoFavorito();
        } else {
            console.error('Nenhuma música selecionada encontrada');
            this.redirectToHome();
        }
    }
    
    displayMusicInfo() {
        if (this.currentMusic) {
            if (this.tituloMusicaPrincipal) this.tituloMusicaPrincipal.textContent = this.currentMusic.title;
            if (this.artistaMusicaPrincipal) this.artistaMusicaPrincipal.textContent = this.currentMusic.artist;
            if (this.capaAlbumPrincipal) {
                this.capaAlbumPrincipal.src = this.currentMusic.img;
                
                console.log('Definindo imagem:', this.currentMusic.img);
                
                this.capaAlbumPrincipal.onerror = () => {
                    console.error('Erro ao carregar imagem, usando fallback');
                    this.capaAlbumPrincipal.src = 'static/assets/padrao.jpg';
                };
            }
        }
    }
    
    atualizarEstadoFavorito() {
        if (!this.btnFavoritar || !this.currentMusic) {
            console.log('Elementos de favorito não disponíveis');
            return;
        }
        
        const favoritos = this.obterFavoritos();
        const isFavorita = favoritos.includes(this.currentMusic.id);
        
        console.log('Atualizando estado do favorito:', this.currentMusic.title, 'é favorita?', isFavorita);
        
        if (isFavorita) {
            this.btnFavoritar.classList.add('favoritado');
            if (this.iconeFavorito) {
                this.iconeFavorito.style.filter = 'brightness(0) invert(1)';
            }
        } else {
            this.btnFavoritar.classList.remove('favoritado');
            if (this.iconeFavorito) {
                this.iconeFavorito.style.filter = 'brightness(0) invert(0.7)';
            }
        }
    }
    
    carregarRecomendacoes(todasMusicas) {
        if (todasMusicas.length === 0) {
            if (this.listaRecomendacoes) this.listaRecomendacoes.innerHTML = '<p>Nenhuma música disponível</p>';
            return;
        }
        
        console.log('Carregando recomendações iniciais. Total de músicas:', todasMusicas.length);
        
        // Filtrar músicas diferentes da atual
        const outrasMusicas = todasMusicas.filter(musica => 
            musica.id !== this.currentMusic.id
        );
        
        console.log('Músicas disponíveis para recomendação:', outrasMusicas.length);
        
        if (outrasMusicas.length === 0) {
            if (this.listaRecomendacoes) this.listaRecomendacoes.innerHTML = '<p>Nenhuma recomendação disponível</p>';
            return;
        }
        
        // Selecionar 5 músicas aleatórias
        this.recomendacoes = this.selecionarAleatoriasUnicas(outrasMusicas, 5);
        console.log('Recomendações iniciais sorteadas:', this.recomendacoes.map(m => m.title));
        
        // Construir lista de navegação
        this.construirListaNavegacao();
        
        this.renderizarRecomendacoes();
    }
    
    selecionarAleatoriasUnicas(musicas, quantidade) {
        if (musicas.length === 0) return [];
        
        const copiaMusicas = [...musicas];
        const selecionadas = [];
        
        const maxMusicas = Math.min(quantidade, copiaMusicas.length);
        
        console.log(`Selecionando ${maxMusicas} de ${copiaMusicas.length} músicas disponíveis`);
        
        for (let i = 0; i < maxMusicas; i++) {
            const randomIndex = Math.floor(Math.random() * copiaMusicas.length);
            const musicaSelecionada = copiaMusicas.splice(randomIndex, 1)[0];
            selecionadas.push(musicaSelecionada);
        }
        
        return selecionadas;
    }
    
    construirListaNavegacao() {
        this.listaNavegacao = [this.currentMusic, ...this.recomendacoes];
        this.indiceAtual = 0;
        this.atualizarEstadoBotoes();
        
        console.log('Lista de navegação criada:', this.listaNavegacao.map(m => m.title));
        console.log('Índice atual:', this.indiceAtual);
    }
    
    atualizarEstadoBotoes() {
        const totalMusicas = this.listaNavegacao.length;
        
        if (this.btnPrev && this.btnNext) {
            if (totalMusicas <= 1) {
                this.btnPrev.classList.add('disabled');
                this.btnNext.classList.add('disabled');
            } else {
                this.btnPrev.classList.remove('disabled');
                this.btnNext.classList.remove('disabled');
            }
        }
    }
    
    renderizarRecomendacoes() {
        if (!this.listaRecomendacoes) return;
        
        this.listaRecomendacoes.innerHTML = '';
        
        if (this.recomendacoes.length === 0) {
            this.listaRecomendacoes.innerHTML = '<p>Nenhuma recomendação disponível</p>';
            return;
        }
        
        console.log('Renderizando', this.recomendacoes.length, 'recomendações');
        
        this.recomendacoes.forEach((musica, index) => {
            const musicaEl = document.createElement('div');
            musicaEl.className = 'musica-recomendada';
            
            const favoritos = this.obterFavoritos();
            const isFavorita = favoritos.includes(musica.id);
            
            musicaEl.innerHTML = `
                <img src="${musica.img}" alt="${musica.title}" 
                     onerror="this.src='static/assets/padrao.jpg'">
                <div class="info-recomendada">
                    <h4>${musica.title}</h4>
                    <p>${musica.artist}</p>
                </div>
                <button class="btn-favoritar-recomendacao ${isFavorita ? 'favoritado' : ''}" 
                        data-musica-id="${musica.id}">
                    <img src="static/assets/favorit.png" alt="Favoritar">
                </button>
            `;
            
            // Evento para reproduzir a música recomendada
            musicaEl.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-favoritar-recomendacao')) {
                    console.log(`Clicou na recomendação ${index + 1}:`, musica.title);
                    this.trocarMusica(musica);
                }
            });
            
            // Evento para favoritar a música recomendada
            const btnFavoritarRec = musicaEl.querySelector('.btn-favoritar-recomendacao');
            btnFavoritarRec.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorita(musica.id, btnFavoritarRec);
            });
            
            this.listaRecomendacoes.appendChild(musicaEl);
        });
    }
    
    toggleFavorita(musicaId, elemento = null) {
        console.log('Toggle favorita para música ID:', musicaId);
        
        const favoritos = this.obterFavoritos();
        const isFavorita = favoritos.includes(musicaId);
        
        if (isFavorita) {
            // Remover dos favoritos
            const index = favoritos.indexOf(musicaId);
            favoritos.splice(index, 1);
            
            if (elemento) {
                elemento.classList.remove('favoritado');
            }
            
            // Se é a música atual, atualizar o botão principal
            if (this.currentMusic && this.currentMusic.id === musicaId && this.btnFavoritar) {
                this.btnFavoritar.classList.remove('favoritado');
                if (this.iconeFavorito) {
                    this.iconeFavorito.style.filter = 'brightness(0) invert(0.7)';
                }
            }
            
            console.log('Música removida dos favoritos:', musicaId);
        } else {
            // Adicionar aos favoritos
            favoritos.push(musicaId);
            
            if (elemento) {
                elemento.classList.add('favoritado');
            }
            
            // Se é a música atual, atualizar o botão principal
            if (this.currentMusic && this.currentMusic.id === musicaId && this.btnFavoritar) {
                this.btnFavoritar.classList.add('favoritado');
                if (this.iconeFavorito) {
                    this.iconeFavorito.style.filter = 'brightness(0) invert(1)';
                }
            }
            
            console.log('Música adicionada aos favoritos:', musicaId);
        }
        
        localStorage.setItem('musicasFavoritas', JSON.stringify(favoritos));
        
        // Debug para verificar o estado atual
        console.log('Favoritos atualizados:', favoritos);
    }
    
    obterFavoritos() {
        return JSON.parse(localStorage.getItem('musicasFavoritas') || '[]');
    }
    
    trocarMusica(novaMusica) {
        console.log('Trocando para música recomendada:', novaMusica.title);
        
        const novoIndice = this.listaNavegacao.findIndex(m => m.id === novaMusica.id);
        
        if (novoIndice !== -1) {
            this.trocarParaMusicaPorIndice(novoIndice);
        } else {
            this.trocarParaMusicaNova(novaMusica);
        }
    }
    
    trocarParaMusicaNova(novaMusica) {
        this.incrementarContador(this.currentMusic.id);
        this.atualizarContadoresLocalStorage();
        
        localStorage.setItem('musicaSelecionada', JSON.stringify(novaMusica));
        
        this.currentMusic = novaMusica;
        this.displayMusicInfo();
        this.loadAudio();
        this.atualizarEstadoFavorito();
        
        if (this.isPlaying) {
            this.play();
        }
        
        this.recarregarTodasRecomendacoes();
    }
    
    recarregarTodasRecomendacoes() {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        console.log('Recarregando recomendações. Total de músicas:', todasMusicas.length);
        
        if (todasMusicas.length === 0) {
            if (this.listaRecomendacoes) this.listaRecomendacoes.innerHTML = '<p>Nenhuma música disponível</p>';
            return;
        }
        
        const outrasMusicas = todasMusicas.filter(musica => 
            musica.id !== this.currentMusic.id
        );
        
        console.log('Músicas disponíveis para recomendação:', outrasMusicas.length);
        
        if (outrasMusicas.length === 0) {
            if (this.listaRecomendacoes) this.listaRecomendacoes.innerHTML = '<p>Nenhuma recomendação disponível</p>';
            return;
        }
        
        this.recomendacoes = this.selecionarAleatoriasUnicas(outrasMusicas, 5);
        console.log('Novas recomendações sorteadas:', this.recomendacoes.map(m => m.title));
        
        this.construirListaNavegacao();
        this.renderizarRecomendacoes();
    }
    
    previousSong() {
        if (this.listaNavegacao.length <= 1) {
            console.log('Apenas uma música disponível');
            return;
        }
        
        let novoIndice = this.indiceAtual - 1;
        
        if (novoIndice < 0) {
            novoIndice = this.listaNavegacao.length - 1;
        }
        
        console.log(`Previous: ${this.indiceAtual} -> ${novoIndice}`);
        this.trocarParaMusicaPorIndice(novoIndice);
    }
    
    nextSong() {
        if (this.listaNavegacao.length <= 1) {
            console.log('Apenas uma música disponível');
            return;
        }
        
        let novoIndice = this.indiceAtual + 1;
        
        if (novoIndice >= this.listaNavegacao.length) {
            novoIndice = 0;
        }
        
        console.log(`Next: ${this.indiceAtual} -> ${novoIndice}`);
        this.trocarParaMusicaPorIndice(novoIndice);
    }
    
    trocarParaMusicaPorIndice(novoIndice) {
        if (novoIndice < 0 || novoIndice >= this.listaNavegacao.length) {
            console.error('Índice inválido:', novoIndice);
            return;
        }
        
        const novaMusica = this.listaNavegacao[novoIndice];
        
        if (!novaMusica) {
            console.error('Música não encontrada no índice:', novoIndice);
            return;
        }
        
        if (novaMusica.id === this.currentMusic.id) {
            console.log('Já está na mesma música');
            return;
        }
        
        this.incrementarContador(this.currentMusic.id);
        this.indiceAtual = novoIndice;
        this.currentMusic = novaMusica;
        localStorage.setItem('musicaSelecionada', JSON.stringify(this.currentMusic));
        
        this.displayMusicInfo();
        this.loadAudio();
        this.atualizarEstadoFavorito();
        
        if (this.isPlaying) {
            this.play();
        }
        
        this.atualizarRecomendacoesAposNavegacao();
    }
    
    atualizarRecomendacoesAposNavegacao() {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        
        this.recomendacoes = this.recomendacoes.filter(m => m.id !== this.currentMusic.id);
        
        if (this.recomendacoes.length < 5) {
            const outrasMusicas = todasMusicas.filter(musica => 
                musica.id !== this.currentMusic.id
            );
            
            const musicasDisponiveis = outrasMusicas.filter(m => 
                !this.recomendacoes.some(rec => rec.id === m.id)
            );
            
            const novasRecomendacoes = this.selecionarAleatoriasUnicas(musicasDisponiveis, 5 - this.recomendacoes.length);
            this.recomendacoes.push(...novasRecomendacoes);
        }
        
        this.construirListaNavegacao();
        this.renderizarRecomendacoes();
    }
    
    loadAudio() {
        if (this.currentMusic && this.currentMusic.url) {
            console.log('Carregando áudio:', this.currentMusic.url);
            
            // Remover event listeners antigos
            this.audio.removeEventListener('loadedmetadata', this.handleMetadata.bind(this));
            this.audio.removeEventListener('canplay', this.handleCanPlay.bind(this));
            this.audio.removeEventListener('error', this.handleAudioError.bind(this));
            
            this.audio.addEventListener('loadedmetadata', this.handleMetadata.bind(this));
            this.audio.addEventListener('canplay', this.handleCanPlay.bind(this));
            this.audio.addEventListener('error', this.handleAudioError.bind(this));
            
            this.audio.src = this.currentMusic.url;
            this.audio.load();
            
            // Limpar timeout anterior se existir
            if (this.metadataTimeout) {
                clearTimeout(this.metadataTimeout);
            }
            
            this.metadataTimeout = setTimeout(() => {
                console.warn('Timeout no carregamento de metadata, usando fallback');
                this.updateDurationFallback();
            }, 5000);
            
        } else {
            console.error('URL do áudio não disponível');
        }
    }
    
    handleMetadata() {
        console.log('Metadata carregado - Duração:', this.audio.duration);
        if (this.metadataTimeout) {
            clearTimeout(this.metadataTimeout);
        }
        this.updateDuration();
    }
    
    handleCanPlay() {
        console.log('Áudio pronto para reprodução');
        this.updateDuration();
    }
    
    handleAudioError(e) {
        console.error('Erro no áudio:', e);
        console.error('Código do erro:', this.audio.error);
        if (this.metadataTimeout) {
            clearTimeout(this.metadataTimeout);
        }
    }
    
    updateDuration() {
        if (this.audio.duration && !isNaN(this.audio.duration) && this.audio.duration !== Infinity) {
            console.log('Duração real:', this.audio.duration);
            if (this.tempoTotal) this.tempoTotal.textContent = this.formatTime(this.audio.duration);
        } else {
            console.warn('Duração não disponível ou inválida');
            this.updateDurationFallback();
        }
    }
    
    updateDurationFallback() {
        setTimeout(() => {
            if (this.audio.duration && !isNaN(this.audio.duration)) {
                if (this.tempoTotal) this.tempoTotal.textContent = this.formatTime(this.audio.duration);
            } else {
                if (this.tempoTotal) this.tempoTotal.textContent = '--:--';
            }
        }, 1000);
    }
    
    updateProgress() {
        if (this.audio.duration && !isNaN(this.audio.duration)) {
            const progressPercent = (this.audio.currentTime / this.audio.duration) * 100;
            if (this.progress) this.progress.style.width = `${progressPercent}%`;
            if (this.tempoAtual) this.tempoAtual.textContent = this.formatTime(this.audio.currentTime);
        } else {
            if (this.tempoAtual) this.tempoAtual.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Event listeners do áudio
        if (this.audio) {
            this.audio.removeEventListener('timeupdate', this.updateProgress.bind(this));
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            
            this.audio.addEventListener('ended', () => this.onSongEnd());
            this.audio.addEventListener('error', (e) => this.onAudioError(e));
        }
        
        // Event listeners dos botões de controle
        if (this.btnPlayPause) {
            this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.setProgress(e));
        }
        
        if (this.volumeBar) {
            this.volumeBar.addEventListener('click', (e) => this.setVolume(e));
        }
        
        if (this.btnVoltar) {
            this.btnVoltar.addEventListener('click', () => this.redirectToHome());
        }
        
        if (this.btnPrev) {
            this.btnPrev.addEventListener('click', () => this.previousSong());
        }
        
        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => this.nextSong());
        }
        
        // Evento do botão de favoritar
        if (this.btnFavoritar) {
            this.btnFavoritar.addEventListener('click', () => {
                console.log('Botão de favoritar clicado para música:', this.currentMusic?.title);
                this.toggleFavorita(this.currentMusic.id, this.btnFavoritar);
            });
            console.log('Event listener do botão de favoritar adicionado');
        } else {
            console.warn('Botão de favoritar não encontrado no setupEventListeners');
        }
        
        console.log('Event listeners configurados com sucesso');
    }
    
    onAudioError(e) {
        console.error('Erro no áudio:', e);
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        console.log('Tentando reproduzir...');
        
        if (this.audio.readyState < 2) {
            console.log('Áudio ainda não carregado, aguardando...');
            this.audio.load();
        }
        
        this.audio.play().then(() => {
            console.log('Reprodução iniciada com sucesso');
            this.isPlaying = true;
            if (this.playPauseIcon) this.playPauseIcon.src = 'static/assets/pause.png';
            
            // Registrar reprodução no histórico quando a música começa
            this.registrarReproducaoNoHistorico(this.currentMusic.id);
            
            setTimeout(() => this.updateDuration(), 100);
            
        }).catch(error => {
            console.error('Erro ao reproduzir:', error);
        });
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        if (this.playPauseIcon) this.playPauseIcon.src = 'static/assets/play.png';
    }
    
    setProgress(e) {
        if (!this.progressBar) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        
        if (this.audio.duration && !isNaN(this.audio.duration)) {
            this.audio.currentTime = percent * this.audio.duration;
        }
    }
    
    setVolume(e) {
        if (!this.volumeBar) return;
        
        const rect = this.volumeBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.volume = percent;
        if (this.volumeLevel) this.volumeLevel.style.width = `${percent * 100}%`;
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    onSongEnd() {
        this.isPlaying = false;
        if (this.playPauseIcon) this.playPauseIcon.src = 'static/assets/play.png';
        this.incrementarContador(this.currentMusic.id);
        this.atualizarContadoresLocalStorage();
        
        // Registrar reprodução no histórico quando a música termina
        this.registrarReproducaoNoHistorico(this.currentMusic.id);
    }
    
    incrementarContador(musicaId) {
        const contadores = JSON.parse(localStorage.getItem('musicasContadores') || '{}');
        contadores[musicaId] = (contadores[musicaId] || 0) + 1;
        localStorage.setItem('musicasContadores', JSON.stringify(contadores));
    }
    
    atualizarContadoresLocalStorage() {
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        const contadores = JSON.parse(localStorage.getItem('musicasContadores') || '{}');
        const musicasAtualizadas = todasMusicas.map(musica => ({
            ...musica,
            reproducoes: contadores[musica.id] || 0
        }));
        localStorage.setItem('todasMusicas', JSON.stringify(musicasAtualizadas));
    }
    
    registrarReproducaoNoHistorico(musicaId) {
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
        console.log('Reprodução registrada no histórico para música ID:', musicaId);
    }
    
    redirectToHome() {
        window.location.href = 'inicio.html';
    }
    
    debugEstado() {
        console.log('=== DEBUG DO ESTADO ===');
        console.log('Música atual:', this.currentMusic?.title);
        console.log('Índice atual:', this.indiceAtual);
        console.log('Total de recomendações:', this.recomendacoes.length);
        console.log('Recomendações:', this.recomendacoes.map(m => m.title));
        console.log('Lista de navegação:', this.listaNavegacao.map(m => m.title));
        
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        console.log('Total de músicas no sistema:', todasMusicas.length);
        
        const historico = JSON.parse(localStorage.getItem('historicoReproducoes') || '[]');
        console.log('Entradas no histórico:', historico.length);
        
        const favoritos = this.obterFavoritos();
        console.log('Total de favoritos:', favoritos.length);
        console.log('Botão de favoritar disponível:', !!this.btnFavoritar);
        console.log('Ícone de favorito disponível:', !!this.iconeFavorito);
        console.log('=== FIM DEBUG ===');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando player...');
    new MusicPlayer();
});