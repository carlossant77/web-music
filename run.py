import os
import mimetypes
from flask import Flask, jsonify, request, Response, abort
from mutagen import File as ArquivoMutagen
from pathlib import Path

# ⇩ MANTIDA exatamente como solicitado
MUSIC_DIR = "static/assets"

# Caminho absoluto seguro para varrer/servir arquivos
DIRETORIO_MUSICAS_ABS = os.path.abspath(MUSIC_DIR)

EXTENSOES_SUPORTADAS = (".mp3", ".m4a", ".flac", ".wav", ".ogg")

aplicacao = Flask(__name__)

# CORS simples (sem biblioteca): adiciona cabeçalhos após cada resposta
@aplicacao.after_request
def adicionar_cors(resposta):
    resposta.headers["Access-Control-Allow-Origin"] = "*"
    resposta.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    resposta.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return resposta

def escanear_musicas():
    """
    Percorre o diretório de músicas, extrai metadados básicos e
    retorna uma lista ordenada de dicionários com id/título/artista/álbum/url.
    """
    base = Path(DIRETORIO_MUSICAS_ABS)
    musicas = []
    for ext in EXTENSOES_SUPORTADAS:
        for caminho in base.rglob(f"*{ext}"):
            meta = extrair_metadados(str(caminho))
            id_musica = caminho.relative_to(base).as_posix()
            musicas.append({
                "id": id_musica,
                "title": meta.get("title") or caminho.stem,
                "artist": meta.get("artist") or "Desconhecido",
                "imageUrl": meta.get("imageUrl") or "",
                "url": f"/api/audio/{id_musica}",
            })
    musicas.sort(key=lambda m: (m["artist"].casefold(), m["title"].casefold()))
    return musicas


def extrair_metadados(caminho_arquivo: str) -> dict:
    """
    Lê tags simples (título, artista, álbum) usando Mutagen.
    Retorna dict vazio se não houver metadados.
    """
    try:
        audio = ArquivoMutagen(caminho_arquivo, easy=True)
        if not audio or not getattr(audio, "tags", None):
            return {}

        def primeiro(tag):
            valor = audio.tags.get(tag)
            return valor[0] if isinstance(valor, list) and valor else (valor if isinstance(valor, str) else None)

        return {
            "title": primeiro("title"),
            "artist": primeiro("artist"),
            "imageUrl": primeiro("album"),
        }
    except Exception:
        return {}


INDICE_MUSICAS = escanear_musicas()


@aplicacao.get("/api/saude")
def saude():
    """Endpoint simples para checagem de saúde do serviço."""
    return jsonify({"status": "ok", "count": len(INDICE_MUSICAS)})


@aplicacao.get("/api/musicas")
def listar_musicas():
    """Lista todas as músicas indexadas ao iniciar o servidor."""
    return jsonify(INDICE_MUSICAS)


def caminho_arquivo_por_id(id_musica: str) -> str:
    """
    Resolve com segurança o caminho absoluto a partir do id (caminho relativo).
    Bloqueia tentativas de fuga de diretório.
    """
    id_seguro = id_musica.replace("..", "").replace("\\", "/")
    caminho = os.path.join(DIRETORIO_MUSICAS_ABS, id_seguro)
    caminho = os.path.abspath(caminho)

    # Garante que o arquivo está dentro do diretório de músicas
    if not caminho.startswith(DIRETORIO_MUSICAS_ABS):
        abort(404)
    if not os.path.isfile(caminho):
        abort(404)
    return caminho


@aplicacao.get("/api/audio/<path:id_musica>")
def transmitir_audio(id_musica: str):
    """
    Serve o arquivo de áudio com suporte a HTTP Range (206 Partial Content)
    para permitir seek no player.
    """
    caminho = caminho_arquivo_por_id(id_musica)
    tamanho_arquivo = os.path.getsize(caminho)
    cabecalho_range = request.headers.get("Range")
    tipo_mime = mimetypes.guess_type(caminho)[0] or "application/octet-stream"

    cabecalhos = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Content-Type": tipo_mime,
    }

    if cabecalho_range:
        # Ex.: Range: bytes=0- ou bytes=1000-2000
        unidade, _, intervalo = cabecalho_range.partition("=")
        if unidade != "bytes":
            return Response(status=416)

        inicio_str, _, fim_str = intervalo.partition("-")
        try:
            inicio = int(inicio_str) if inicio_str else 0
            fim = int(fim_str) if fim_str else tamanho_arquivo - 1
        except ValueError:
            return Response(status=416)

        inicio = max(0, inicio)
        fim = min(fim, tamanho_arquivo - 1)
        if inicio > fim:
            return Response(status=416)

        comprimento = fim - inicio + 1
        cabecalhos.update({
            "Content-Range": f"bytes {inicio}-{fim}/{tamanho_arquivo}",
            "Content-Length": str(comprimento),
        })

        def gerar():
            with open(caminho, "rb") as f:
                f.seek(inicio)
                restante = comprimento
                bloco = 64 * 1024
                while restante > 0:
                    dados = f.read(min(bloco, restante))
                    if not dados:
                        break
                    restante -= len(dados)
                    yield dados

        return Response(gerar(), status=206, headers=cabecalhos)

    # Sem Range: envia tudo
    cabecalhos["Content-Length"] = str(tamanho_arquivo)

    def gerar_completo():
        with open(caminho, "rb") as f:
            while True:
                dados = f.read(64 * 1024)
                if not dados:
                    break
                yield dados

    return Response(gerar_completo(), status=200, headers=cabecalhos)


if __name__ == "__main__":
    # aplicacao.run(host="127.0.0.1", port=80, debug=True)
    aplicacao.run(host="0.0.0.0", port=80, debug=True)
    # aplicacao.run(host="0.0.0.0", port=5000, debug=True)