"""
Stellarium Web Engine .eph 타일 파서.

포맷은 upstream src/eph-file.c 의 주석과 구현을 그대로 따른다.

  파일:  "EPHE" + int32 version + 청크 목록
  청크:  type[4] + int32 len + data + int32 crc
  타일:  int32 version + int64 nuniq
  테이블 헤더: flags, row_size, n_col, n_row + n_col * {name[4], type[4],
               unit, start, size}
  데이터: zlib 압축 블록 (flags & 1 이면 바이트 셔플됨)
"""
import struct
import zlib


def _unshuffle(data: bytes, row_size: int, n_row: int) -> bytes:
    """eph_shuffle_bytes 의 역연산.

    압축률을 높이려고 같은 바이트 위치끼리 모아둔 것을 원래 행 순서로 되돌린다.
    저장된 형태: buf[i * n_row + j]  ->  복원: out[j * row_size + i]
    """
    out = bytearray(row_size * n_row)
    for i in range(row_size):
        base = i * n_row
        out[i::row_size] = data[base:base + n_row]
    return bytes(out)


def read_chunks(blob: bytes):
    """파일 전체를 (type, data) 청크 목록으로 쪼갠다."""
    if blob[:4] != b'EPHE':
        raise ValueError('not an eph file')
    (version,) = struct.unpack_from('<i', blob, 4)
    if version != 2:
        raise ValueError('unsupported eph file version: %d' % version)
    ofs = 8
    while ofs < len(blob):
        ctype = blob[ofs:ofs + 4]
        (size,) = struct.unpack_from('<i', blob, ofs + 4)
        yield ctype, blob[ofs + 8:ofs + 8 + size]
        ofs += size + 12


def read_table(data: bytes):
    """DSO/STAR 청크 하나를 (columns, rows) 로 읽는다.

    columns: [(name, type, unit, start, size)]
    rows:    각 행의 raw bytes
    """
    ofs = 12  # 타일 헤더(version 4 + nuniq 8) 건너뜀
    flags, row_size, n_col, n_row = struct.unpack_from('<iiii', data, ofs)
    ofs += 16
    columns = []
    for i in range(n_col):
        name = data[ofs:ofs + 4].rstrip(b'\x00').decode('ascii')
        ctype = data[ofs + 4:ofs + 5].decode('ascii')
        unit, start, size = struct.unpack_from('<iii', data, ofs + 8)
        columns.append((name, ctype, unit, start, size))
        ofs += 20

    raw_size, comp_size = struct.unpack_from('<ii', data, ofs)
    payload = zlib.decompress(data[ofs + 8:ofs + 8 + comp_size], bufsize=raw_size)
    if flags & 1:
        payload = _unshuffle(payload, row_size, n_row)

    rows = [payload[j * row_size:(j + 1) * row_size] for j in range(n_row)]
    return columns, rows


def decode_value(row: bytes, col) -> object:
    name, ctype, unit, start, size = col
    chunk = row[start:start + size]
    if ctype == 's':
        return chunk.split(b'\x00')[0].decode('utf-8', 'replace')
    if ctype == 'f':
        return struct.unpack('<f', chunk)[0] if size == 4 else struct.unpack('<d', chunk)[0]
    if ctype == 'i':
        return struct.unpack('<i', chunk)[0]
    if ctype == 'Q':
        return struct.unpack('<Q', chunk)[0]
    raise ValueError('unknown column type: %r' % ctype)


def read_rows(blob: bytes, want_type: bytes):
    """파일에서 want_type(b'DSO ' 등) 청크의 행들을 dict 로 뽑아낸다."""
    for ctype, data in read_chunks(blob):
        if ctype != want_type:
            continue
        columns, rows = read_table(data)
        for row in rows:
            yield {c[0]: decode_value(row, c) for c in columns}
