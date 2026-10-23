"""Generate project-owned PNG chain icons using only the Python standard library."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


def segment_distance(x, y, ax, ay, bx, by):
    t = max(0, min(1, ((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)))
    return math.hypot(x-ax-t*(bx-ax), y-ay-t*(by-ay))


for size in (16, 48, 128):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # Two outlined links on a flat blue background, normalized to unit space.
            px, py = (x+.5)/size, (y+.5)/size
            distances = [segment_distance(px,py,.28,.64,.48,.44), segment_distance(px,py,.52,.56,.72,.36)]
            white = any(.075 < d < .13 for d in distances) or segment_distance(px,py,.40,.60,.60,.40)<.035
            row.extend((255,255,255,255) if white else (34,91,164,255))
        rows.append(bytes(row))
    image = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB',size,size,8,6,0,0,0))
    image += chunk(b'IDAT', zlib.compress(b''.join(rows),9)) + chunk(b'IEND', b'')
    (ROOT/'icons'/f'icon{size}.png').write_bytes(image)
