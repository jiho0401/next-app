export class ZipWriter {
    files: {
        name: string;
        nameBytes: Uint8Array;
        localHeader: Uint8Array;
        data: Uint8Array;
        crc: number;
        size: number;
        time: number;
        date: number;
        localOffset: number;
    }[] = [];
    offset = 0;

    static crcTable = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        return table;
    })();

    static crc32(u8: Uint8Array) {
        let c = 0 ^ (-1);
        for (let i = 0; i < u8.length; i++) {
            c = (c >>> 8) ^ ZipWriter.crcTable[(c ^ u8[i]) & 0xFF];
        }
        return (c ^ (-1)) >>> 0;
    }

    static getDosTimeDate(date = new Date()) {
        const time =
            (date.getHours() << 11) |
            (date.getMinutes() << 5) |
            ((date.getSeconds() / 2) | 0);
        const dt =
            ((date.getFullYear() - 1980) << 9) |
            ((date.getMonth() + 1) << 5) |
            (date.getDate());
        return { time, date: dt };
    }

    addFile(name: string, u8data: Uint8Array) {
        const { time, date } = ZipWriter.getDosTimeDate();
        const crc = ZipWriter.crc32(u8data);
        const size = u8data.length;
        const nameBytes = new TextEncoder().encode(name);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const dv = new DataView(localHeader.buffer);
        let p = 0;
        dv.setUint32(p, 0x04034b50, true); p += 4;
        dv.setUint16(p, 20, true); p += 2;
        dv.setUint16(p, 0, true); p += 2;
        dv.setUint16(p, 0, true); p += 2;
        dv.setUint16(p, time, true); p += 2;
        dv.setUint16(p, date, true); p += 2;
        dv.setUint32(p, crc, true); p += 4;
        dv.setUint32(p, size, true); p += 4;
        dv.setUint32(p, size, true); p += 4;
        dv.setUint16(p, nameBytes.length, true); p += 2;
        dv.setUint16(p, 0, true); p += 2;
        localHeader.set(nameBytes, 30);

        const localOffset = this.offset;
        this.offset += localHeader.length + size;

        this.files.push({
            name,
            nameBytes,
            localHeader,
            data: u8data,
            crc, size, time, date,
            localOffset
        });
    }

    build() {
        const localSize = this.files.reduce((sum, f) => sum + f.localHeader.length + f.data.length, 0);
        const centralParts = [];
        let centralSize = 0;

        for (const f of this.files) {
            const cdh = new Uint8Array(46 + f.nameBytes.length);
            const dv = new DataView(cdh.buffer);
            let p = 0;
            dv.setUint32(p, 0x02014b50, true); p += 4;
            dv.setUint16(p, 20, true); p += 2;
            dv.setUint16(p, 20, true); p += 2;
            dv.setUint16(p, 0, true); p += 2;
            dv.setUint16(p, 0, true); p += 2;
            dv.setUint16(p, f.time, true); p += 2;
            dv.setUint16(p, f.date, true); p += 2;
            dv.setUint32(p, f.crc, true); p += 4;
            dv.setUint32(p, f.size, true); p += 4;
            dv.setUint32(p, f.size, true); p += 4;
            dv.setUint16(p, f.nameBytes.length, true); p += 2;
            dv.setUint16(p, 0, true); p += 2;
            dv.setUint16(p, 0, true); p += 2;
            dv.setUint16(p, 0, true); p += 2;
            dv.setUint32(p, 0, true); p += 4;
            dv.setUint32(p, f.localOffset, true); p += 4;
            cdh.set(f.nameBytes, 46);
            centralParts.push(cdh);
            centralSize += cdh.length;
        }

        const eocd = new Uint8Array(22);
        const dv2 = new DataView(eocd.buffer);
        let p2 = 0;
        dv2.setUint32(p2, 0x06054b50, true); p2 += 4;
        dv2.setUint16(p2, 0, true); p2 += 2;
        dv2.setUint16(p2, 0, true); p2 += 2;
        dv2.setUint16(p2, this.files.length, true); p2 += 2;
        dv2.setUint16(p2, this.files.length, true); p2 += 2;
        dv2.setUint32(p2, centralSize, true); p2 += 4;
        dv2.setUint32(p2, localSize, true); p2 += 4;
        dv2.setUint16(p2, 0, true); p2 += 2;

        const outParts = [];
        outParts.push(...this.files.flatMap(f => [f.localHeader, f.data]));
        outParts.push(...centralParts);
        outParts.push(eocd);

        const total = localSize + centralSize + eocd.length;
        const out = new Uint8Array(total);
        let offset = 0;
        for (const part of outParts) {
            out.set(part, offset);
            offset += part.length;
        }
        return new Blob([out], { type: 'application/zip' });
    }
}
