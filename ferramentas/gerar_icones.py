import struct
import zlib


def bloco(tipo, dados):
    corpo = tipo + dados
    return struct.pack('>I', len(dados)) + corpo + struct.pack('>I', zlib.crc32(corpo) & 0xFFFFFFFF)


def png(tamanho, caminho):
    verde = (46, 93, 52)
    madeira = (196, 148, 84)
    claro = (244, 241, 232)
    tabuas = [(0.22, 0.38, madeira), (0.42, 0.58, claro), (0.62, 0.78, madeira)]

    def pixel(x, y):
        u, v = x / tamanho, y / tamanho
        for topo, base, cor in tabuas:
            if 0.18 <= u <= 0.82 and topo <= v <= base:
                return cor
        return verde

    linhas = b''.join(
        b'\x00' + bytes(canal for x in range(tamanho) for canal in pixel(x, y))
        for y in range(tamanho)
    )
    cabecalho = struct.pack('>IIBBBBB', tamanho, tamanho, 8, 2, 0, 0, 0)
    dados = (b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', cabecalho)
             + bloco(b'IDAT', zlib.compress(linhas, 9)) + bloco(b'IEND', b''))
    with open(caminho, 'wb') as arquivo:
        arquivo.write(dados)


for lado in (192, 512):
    png(lado, f'icone-{lado}.png')
    print(f'icone-{lado}.png gerado')
