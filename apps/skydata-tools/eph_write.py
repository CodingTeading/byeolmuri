"""Stellarium Web Engine .eph 타일 기록기.

apps/search-index/eph.py 의 역연산이다. 포맷은 upstream src/eph-file.c 를
따른다. 업스트림에는 타일을 만드는 도구가 없어서 직접 만들었다.

  파일:  "EPHE" + int32 version(2) + 청크 목록
  청크:  type[4] + int32 len + data + int32 crc(0 으로 둔다. 엔진이 검사하지 않음)
  타일:  int32 version(3) + int64 nuniq
  테이블 헤더: flags, row_size, n_col, n_row + n_col * {name[4], type[4], unit, start, size}
  데이터: 바이트 셔플 후 zlib 압축
"""
import struct
import zlib

EPH_RAD = 1 << 16
EPH_VMAG = 3 << 16
EPH_ARCSEC_ = 5 << 16 | 1 | 2 | 4     # 항성 목록이 쓰는 옛 단위
EPH_RAD_PER_YEAR = 6 << 16

# 기존 타일에서 그대로 읽어온 DSO 컬럼 배치. 순서와 오프셋을 바꾸지 않는다.
DSO_COLUMNS = [
    ('type', 's', 0,        0,   4),
    ('vmag', 'f', EPH_VMAG, 4,   4),
    ('bmag', 'f', EPH_VMAG, 8,   4),
    ('ra',   'f', EPH_RAD,  12,  4),
    ('de',   'f', EPH_RAD,  16,  4),
    ('smax', 'f', EPH_RAD,  20,  4),
    ('smin', 'f', EPH_RAD,  24,  4),
    ('angl', 'f', EPH_RAD,  28,  4),
    ('morp', 's', 0,        32,  32),
    ('snam', 's', 0,        64,  64),
    ('ids',  's', 0,        128, 256),
]
DSO_ROW_SIZE = 384

# 항성 타일의 컬럼 배치. 역시 기존 타일에서 읽어온 그대로다.
STAR_COLUMNS = [
    ('hip',  'i', 0,                0,   4),
    ('hd',   'i', 0,                4,   4),
    ('vmag', 'f', EPH_VMAG,         8,   4),
    ('ra',   'f', EPH_RAD,          12,  4),
    ('de',   'f', EPH_RAD,          16,  4),
    ('plx',  'f', EPH_ARCSEC_,      20,  4),
    ('pra',  'f', EPH_RAD_PER_YEAR, 24,  4),
    ('pde',  'f', EPH_RAD_PER_YEAR, 28,  4),
    ('bv',   'f', 0,                32,  4),
    ('ids',  's', 0,                36,  256),
]
STAR_ROW_SIZE = 292


def _shuffle(data, row_size, n_row):
    """압축률을 높이려고 같은 바이트 위치끼리 모은다. eph.py 의 _unshuffle 의 역."""
    out = bytearray(row_size * n_row)
    for i in range(row_size):
        out[i * n_row:(i + 1) * n_row] = data[i::row_size]
    return bytes(out)


def _pack_row(row, columns, row_size):
    buf = bytearray(row_size)
    for name, ctype, unit, start, size in columns:
        v = row.get(name)
        if ctype == 's':
            b = ('' if v is None else str(v)).encode('utf-8')[:size - 1]
            buf[start:start + len(b)] = b
        elif ctype == 'f':
            f = float('nan') if v is None else float(v)
            buf[start:start + 4] = struct.pack('<f', f)
        elif ctype == 'i':
            buf[start:start + 4] = struct.pack('<i', int(v or 0))
        elif ctype == 'Q':
            buf[start:start + 8] = struct.pack('<Q', int(v or 0))
        else:
            raise ValueError('unknown column type: %r' % ctype)
    return bytes(buf)


def build_tile(rows, order, pix, chunk_type=b'DSO ',
               columns=DSO_COLUMNS, row_size=DSO_ROW_SIZE,
               extra_chunks=()):
    """타일 하나를 .eph 파일 바이트로 만든다.

    extra_chunks 는 데이터 청크 앞에 그대로 실어 보낼 (type, bytes) 목록이다.
    항성 타일에는 children_mask 를 담은 JSON 청크가 붙어 있는데, 이것을
    잃으면 엔진이 하위 타일이 있는지 몰라 더 어두운 별을 받아오지 않는다.
    """
    n_row = len(rows)
    nuniq = 4 * (1 << (2 * order)) + pix

    body = bytearray()
    body += struct.pack('<i', 3)          # 타일 버전
    body += struct.pack('<q', nuniq)
    body += struct.pack('<iiii', 1, row_size, len(columns), n_row)  # flags=1 (셔플)
    for name, ctype, unit, start, size in columns:
        body += name.encode('ascii').ljust(4, b'\x00')
        body += ctype.encode('ascii').ljust(4, b'\x00')
        body += struct.pack('<iii', unit, start, size)

    raw = b''.join(_pack_row(r, columns, row_size) for r in rows)
    shuffled = _shuffle(raw, row_size, n_row)
    comp = zlib.compress(shuffled, 9)
    body += struct.pack('<ii', len(raw), len(comp))
    body += comp

    out = bytearray(b'EPHE')
    out += struct.pack('<i', 2)           # 파일 버전
    for ctype, cdata in extra_chunks:
        out += ctype
        out += struct.pack('<i', len(cdata))
        out += cdata
        out += struct.pack('<I', 0)
    out += chunk_type
    out += struct.pack('<i', len(body))
    out += body
    out += struct.pack('<I', 0)           # CRC. 엔진이 검사하지 않는다
    return bytes(out)
