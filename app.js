const entradaUrlServidor = document.getElementById('serverUrl');
const botaoConectar = document.getElementById('connectBtn');
const modalApi = document.getElementById('modalApi');
const conteudoPrincipal = document.getElementById('conteudoPrincipal');
const musicasRecomendadasEl = document.getElementById('musicasRecomendadas');
const todasAsMusicasEl = document.getElementById('todasAsMusicas');

// Sistema de contadores no localStorage
const CONTADORES_KEY = 'musicasContadores';

// Funções para gerenciar contadores
function obterContadores() {
    const contadoresSalvos = localStorage.getItem(CONTADORES_KEY);
    return contadoresSalvos ? JSON.parse(contadoresSalvos) : {};
}

function salvarContadores(contadores) {
    localStorage.setItem(CONTADORES_KEY, JSON.stringify(contadores));
}

function incrementarContador(musicaId) {
    const contadores = obterContadores();
    contadores[musicaId] = (contadores[musicaId] || 0) + 1;
    salvarContadores(contadores);
    return contadores[musicaId];
}

function obterContador(musicaId) {
    const contadores = obterContadores();
    return contadores[musicaId] || 0;
}

// Gerar ID único para cada música baseado no id do JSON
function gerarMusicaId(musica) {
    return musica.id || `${musica.title}-${musica.artist}`.toLowerCase().replace(/\s+/g, '_');
}

// Função para redirecionar para a página de reprodução
function redirecionarParaReproducao(musica, baseUrl) {
    const musicaId = gerarMusicaId(musica);
    
    // Incrementar contador ao selecionar a música
    incrementarContador(musicaId);
    
    // Salvar dados da música no localStorage para a página de reprodução
    localStorage.setItem('musicaSelecionada', JSON.stringify({
        ...musica,
        baseUrl: baseUrl
    }));
    
    // Redirecionar para a página de reprodução
    window.location.href = 'reproducao.html';
}

// compatibilidade: lê 'urlServidor' (novo) ou 'serverUrl' (antigo)
const urlSalva = localStorage.getItem('urlServidor') ?? localStorage.getItem('serverUrl');
if (urlSalva) entradaUrlServidor.value = urlSalva;

infoMusica = [];
artistas = [];

function juntarUrl(base, relativo) {
    try {
        return new URL(relativo, base).href;
    } catch {
        return base.replace(/\/+$/, '') + '/' + relativo.replace(/^\/+/, '');
    }
}

async function buscarJSON(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

botaoConectar.addEventListener('click', async () => {
    const base = entradaUrlServidor.value.trim().replace(/\/$/, '');
    if (!base) { 
        console.error('URL do servidor não informada');
        return; 
    }

    console.log('Tentando conectar à API:', base);
    
    localStorage.setItem('urlServidor', base);
    localStorage.setItem('serverUrl', base);

    try {
        const urlSaude = juntarUrl(base, '/api/saude');
        console.log('Testando saúde da API:', urlSaude);
        
        const saude = await buscarJSON(urlSaude);
        console.log('Resposta da saúde:', saude);

        const urlMusicas = juntarUrl(base, '/api/musicas');
        console.log('Buscando músicas:', urlMusicas);
        
        const musicas = await buscarJSON(urlMusicas);
        console.log('Músicas recebidas:', musicas);

        renderizarMusicas(base, musicas);

        modalApi.style.display = 'none';
        conteudoPrincipal.style.display = 'block';
    } catch (erro) {
        console.error('Erro na conexão:', erro);
        alert('Erro ao conectar: ' + erro.message);
    }
});

function renderizarMusicas(base, musicas) {
    console.log('Renderizando', musicas.length, 'músicas');
    
    if (!musicas || !musicas.length) {
        console.error('Nenhuma música recebida ou array vazio');
        musicasRecomendadasEl.innerHTML = '<li>Nenhuma música encontrada no servidor.</li>';
        return;
    }

    infoMusica = [];
    musicas.forEach((musica, index) => {
        console.log(`Processando música ${index + 1}:`, musica);
        
        const musicaId = gerarMusicaId(musica);
        const contador = obterContador(musicaId);

        // Usar imageUrl do JSON, com fallback para img se necessário
        let img = musica.imageUrl || musica.img;
        if (!img || img === '' || img === undefined) {
            img = 'static/assets/padrao.jpg';
            console.log(`Música ${musica.title} usando imagem padrão`);
        } else {
            img = img.startsWith('http') ? img : juntarUrl(base, img);
        }
        console.log(`URL da imagem: ${img}`);

        // Garantir que a URL do áudio seja absoluta
        let audioUrl = musica.url;
        if (audioUrl && !audioUrl.startsWith('http')) {
            audioUrl = juntarUrl(base, audioUrl);
        }
        console.log(`URL do áudio: ${audioUrl}`);

        infos = {
            id: musicaId,
            title: musica.title || '(Sem título)',
            artist: musica.artist || 'Desconhecido',
            img: img,
            url: audioUrl,
            reproducoes: contador,
            baseUrl: base
        };

        infoMusica.push(infos);
    });

    // Salvar todas as músicas para usar na página de reprodução
    localStorage.setItem('todasMusicas', JSON.stringify(infoMusica));
    console.log('Todas as músicas salvas no localStorage');

    renderizarTela();
}

function renderizarTela() {
    // Processar artistas
    artistas = [];
    infoMusica.forEach(musica => {
        const existente = artistas.find(a => a.name === musica.artist);

        if (!existente) {
            artistas.push({ 
                name: musica.artist || 'Desconhecido', 
                img: musica.img || 'static/assets/padrao.jpg' 
            });
        } else if (existente.img.includes('padrao.jpg') && musica.img && !musica.img.includes('padrao.jpg')) {
            existente.img = musica.img;
        }
    });

    // Renderizar artistas populares
    const artistasSelecionados = [];
    const artistasTemp = [...artistas];
    
    for (let i = 0; i < 6 && artistasTemp.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * artistasTemp.length);
        artistasSelecionados.push(artistasTemp.splice(randomIndex, 1)[0]);
    }

    // Preencher os 6 artistas
    for (let i = 1; i <= 6; i++) {
        const capa = document.getElementById(`image${i}`);
        const name = document.getElementById(`name${i}`);
        
        if (artistasSelecionados[i-1]) {
            name.textContent = artistasSelecionados[i-1].name;
            capa.src = artistasSelecionados[i-1].img;
            
            capa.onerror = function() {
                this.src = 'static/assets/padrao.jpg';
            };
        } else {
            capa.style.display = 'none';
            name.style.display = 'none';
        }
    }

    // Renderizar músicas recomendadas e todas as músicas
    renderizarMusicasRecomendadas();
    renderizarTodasAsMusicas();
}

function renderizarMusicasRecomendadas() {
    musicasRecomendadasEl.innerHTML = '';

    // Ordenar músicas por número de reproduções (mais tocadas primeiro)
    const musicasOrdenadas = [...infoMusica].sort((a, b) => b.reproducoes - a.reproducoes);
    
    // Pegar até 8 músicas mais tocadas
    const musicasParaExibir = musicasOrdenadas.slice(0, 8);

    musicasParaExibir.forEach(musica => {
        const musicaEl = document.createElement('div');
        musicaEl.className = 'musica-card';
        
        musicaEl.innerHTML = `
            <img src="${musica.img}" alt="${musica.title}" class="capa-musica" 
                 onerror="this.src='static/assets/padrao.jpg'"/>
            <h4>${musica.title}</h4>
            <p>${musica.artist}</p>
        `;

        musicaEl.addEventListener('click', () => {
            redirecionarParaReproducao(musica, musica.baseUrl);
        });

        musicasRecomendadasEl.appendChild(musicaEl);
    });
}

function renderizarTodasAsMusicas() {
    todasAsMusicasEl.innerHTML = '';

    infoMusica.forEach(musica => {
        const musicaEl = document.createElement('div');
        musicaEl.className = 'musica-card';
        
        musicaEl.innerHTML = `
            <img src="${musica.img}" alt="${musica.title}" class="capa-musica" 
                 onerror="this.src='static/assets/padrao.jpg'"/>
            <h4>${musica.title}</h4>
            <p>${musica.artist}</p>
        `;

        musicaEl.addEventListener('click', () => {
            redirecionarParaReproducao(musica, musica.baseUrl);
        });

        todasAsMusicasEl.appendChild(musicaEl);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modalApi");
    const btnConfig = document.getElementById("btnConfig");
    const conteudoPrincipal = document.getElementById("conteudoPrincipal");

    // 🔹 Sempre abre modal ao carregar a página
    modal.classList.add("active");
    conteudoPrincipal.style.display = "none";

    // 🔹 Abrir modal pelo botão de configurações
    btnConfig.addEventListener("click", () => {
        modal.classList.add("active");
    });

    // 🔹 Fechar ao clicar fora do modal
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
            if (localStorage.getItem('urlServidor')) {
                conteudoPrincipal.style.display = "block";
            }
        }
    });
});

// Função auxiliar para definir status
function definirStatus(mensagem) {
    console.log(mensagem);
}

// Sistema de Busca
class SistemaBusca {
    constructor() {
        this.searchBarExpanded = document.getElementById('searchBarExpanded');
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.toggleSearch = document.getElementById('toggleSearch');
        this.closeSearch = document.getElementById('closeSearch');
        
        this.buscasRecentesKey = 'buscasRecentesMusicy';
        this.buscasRecentes = this.obterBuscasRecentes();
        
        this.inicializarEventosBusca();
    }
    
    inicializarEventosBusca() {
        // Abrir/fechar busca
        this.toggleSearch.addEventListener('click', () => this.abrirBusca());
        this.closeSearch.addEventListener('click', () => this.fecharBusca());
        
        // Busca em tempo real
        this.searchInput.addEventListener('input', (e) => this.realizarBusca(e.target.value));
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.searchBarExpanded.style.display !== 'none') {
                this.fecharBusca();
            }
        });
    }
    
    abrirBusca() {
        this.searchBarExpanded.style.display = 'flex';
        this.searchInput.focus();
        this.mostrarBuscasRecentes();
    }
    
    fecharBusca() {
        this.searchBarExpanded.style.display = 'none';
        this.searchInput.value = '';
        this.searchResults.innerHTML = '';
    }
    
    realizarBusca(termo) {
        const termoLimpo = termo.trim().toLowerCase();
        
        if (termoLimpo.length === 0) {
            this.mostrarBuscasRecentes();
            return;
        }
        
        if (termoLimpo.length < 2) {
            this.searchResults.innerHTML = '<div class="no-results"><p>Digite pelo menos 2 caracteres...</p></div>';
            return;
        }
        
        // Salvar busca recente
        this.adicionarBuscaRecente(termoLimpo);
        
        const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
        
        if (todasMusicas.length === 0) {
            this.searchResults.innerHTML = '<div class="no-results"><p>Nenhuma música carregada</p></div>';
            return;
        }
        
        const resultados = this.filtrarMusicas(todasMusicas, termoLimpo);
        this.mostrarResultados(resultados, termoLimpo);
    }
    
    filtrarMusicas(musicas, termo) {
        return musicas.filter(musica => {
            const tituloMatch = musica.title.toLowerCase().includes(termo);
            const artistaMatch = musica.artist.toLowerCase().includes(termo);
            return tituloMatch || artistaMatch;
        });
    }
    
    mostrarResultados(resultados, termo) {
        if (resultados.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <img src="static/assets/lupa.png" alt="Nenhum resultado">
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Não encontramos músicas ou artistas para "${termo}"</p>
                </div>
            `;
            return;
        }
        
        // Agrupar por artista
        const artistas = {};
        resultados.forEach(musica => {
            if (!artistas[musica.artist]) {
                artistas[musica.artist] = {
                    artista: musica.artist,
                    imagem: musica.img,
                    musicas: []
                };
            }
            artistas[musica.artist].musicas.push(musica);
        });
        
        let html = `
            <div class="search-stats">
                ${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${termo}"
            </div>
        `;
        
        // Se há poucos resultados, mostrar tudo junto
        if (resultados.length <= 10) {
            html += `
                <div class="search-section">
                    <h4>Músicas Encontradas</h4>
                    <div class="search-musicas-grid">
                        ${resultados.map(musica => this.criarCardMusicaBusca(musica)).join('')}
                    </div>
                </div>
            `;
        } else {
            // Se há muitos resultados, agrupar por artista
            Object.values(artistas).forEach(grupo => {
                html += `
                    <div class="search-section">
                        <h4>${grupo.artista}</h4>
                        <div class="search-musicas-grid">
                            ${grupo.musicas.map(musica => this.criarCardMusicaBusca(musica)).join('')}
                        </div>
                    </div>
                `;
            });
        }
        
        this.searchResults.innerHTML = html;
        
        // Adicionar eventos aos cards
        this.adicionarEventosCardsBusca();
    }
    
    criarCardMusicaBusca(musica) {
        return `
            <div class="musica-card" data-musica-id="${musica.id}">
                <img src="${musica.img}" alt="${musica.title}" class="capa-musica" 
                     onerror="this.src='static/assets/padrao.jpg'"/>
                <h4>${musica.title}</h4>
                <p>${musica.artist}</p>
            </div>
        `;
    }
    
    adicionarEventosCardsBusca() {
        document.querySelectorAll('.search-musicas-grid .musica-card').forEach(card => {
            card.addEventListener('click', () => {
                const musicaId = card.dataset.musicaId;
                const todasMusicas = JSON.parse(localStorage.getItem('todasMusicas') || '[]');
                const musica = todasMusicas.find(m => m.id === musicaId);
                
                if (musica) {
                    this.reproduzirMusica(musica);
                    this.fecharBusca();
                }
            });
        });
    }
    
    reproduzirMusica(musica) {
        // Usar a mesma função de redirecionamento da página principal
        redirecionarParaReproducao(musica, musica.baseUrl);
    }
    
    obterBuscasRecentes() {
        return JSON.parse(localStorage.getItem(this.buscasRecentesKey) || '[]');
    }
    
    adicionarBuscaRecente(termo) {
        // Remover se já existir
        this.buscasRecentes = this.buscasRecentes.filter(t => t !== termo);
        // Adicionar no início
        this.buscasRecentes.unshift(termo);
        // Manter apenas as 5 mais recentes
        this.buscasRecentes = this.buscasRecentes.slice(0, 5);
        // Salvar
        localStorage.setItem(this.buscasRecentesKey, JSON.stringify(this.buscasRecentes));
    }
    
    mostrarBuscasRecentes() {
        if (this.buscasRecentes.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <img src="static/assets/lupa.png" alt="Buscar">
                    <h3>Buscar Músicas</h3>
                    <p>Digite o nome de uma música ou artista</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="recent-searches">
                <h5>Buscas Recentes</h5>
                <div class="recent-search-tags">
                    ${this.buscasRecentes.map(termo => 
                        `<div class="recent-search-tag" data-termo="${termo}">${termo}</div>`
                    ).join('')}
                </div>
            </div>
            <div class="no-results">
                <img src="static/assets/lupa.png" alt="Buscar">
                <h3>Buscar Músicas</h3>
                <p>Digite o nome de uma música ou artista</p>
            </div>
        `;
        
        this.searchResults.innerHTML = html;
        
        // Adicionar eventos às tags de busca recente
        document.querySelectorAll('.recent-search-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                this.searchInput.value = tag.dataset.termo;
                this.realizarBusca(tag.dataset.termo);
            });
        });
    }
}

// Inicializar sistema de busca quando a página carregar
let sistemaBusca;

// Modificar o final do app.js para inicializar o sistema de busca
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modalApi");
    const btnConfig = document.getElementById("btnConfig");
    const conteudoPrincipal = document.getElementById("conteudoPrincipal");

    // Inicializar sistema de busca
    sistemaBusca = new SistemaBusca();

    // 🔹 Sempre abre modal ao carregar a página
    modal.classList.add("active");
    conteudoPrincipal.style.display = "none";

    // 🔹 Abrir modal pelo botão de configurações
    btnConfig.addEventListener("click", () => {
        modal.classList.add("active");
    });

    // 🔹 Fechar ao clicar fora do modal
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
            if (localStorage.getItem('urlServidor')) {
                conteudoPrincipal.style.display = "block";
            }
        }
    });
});