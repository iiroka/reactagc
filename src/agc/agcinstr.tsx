export type ArgcInstr =
    'TC' |
    'XXALQ' |
    'XLQ' |
    'RETURN' |
    'RELINT' |
    'INHINT' |
    'EXTEND' |
    'CCS' |
    'TCF' |
    'DAS' |
    'LXCH' |
    'INCR' |
    'ADS' |
    'CA' |
    'CS' |
    'INDEX' |
    'DXCH' |
    'TS' |
    'XCH' |
    'AD' |
    'MASK' |

    'READ' |
    'WRITE' |
    'RAND' |
    'WAND' |
    'ROR' |
    'WOR' |
    'RXOR' |
    'EDRUPT' |
    'DV' |
    'BZF' |
    'MSU' |
    'QXCH' |
    'AUG' |
    'DIM' |
    'DCA' |
    'DCS' |
    'INDEX_2' |
    'SU' |
    'BZMF' |
    'MP';

interface AcgDecodeResult {
    instr: ArgcInstr,
    extra: boolean,
    count: number
};

export function acgDecode(cmd: number, extra: boolean): AcgDecodeResult
{
    const code = (cmd >> 12) & 7;
    const qc = (cmd >> 10) & 3;
    const pc = (cmd >> 9) & 7;
    if (!extra) {
        switch (code) {
            case 0:
                if (cmd === 0) return { instr: `XXALQ`, extra: false, count: 1 }
                if (cmd === 1) return { instr: `XLQ`, extra: false, count: 1 }
                if (cmd === 2) return { instr: `RETURN`, extra: false, count: 2 }
                if (cmd === 3) return { instr: `RELINT`, extra: false, count: 1 }
                if (cmd === 4) return { instr: `INHINT`, extra: false, count: 1 }
                if (cmd === 6)  return { instr: `EXTEND`, extra: true, count: 1 }
                return { instr: `TC`, extra: false, count: 1 }
            case 1:
                if (qc === 0)
                    return { instr: `CCS`, extra: false, count: 2 }
                return { instr: `TCF`, extra: false, count: 1 }
            case 2:
                switch (qc) {
                    case 0: return { instr: `DAS`, extra: false, count: 3 }
                    case 1: return { instr: `LXCH`, extra: false, count: 2 }
                    case 2: return { instr: `INCR`, extra: false, count: 2 }
                    case 3: return { instr: `ADS`, extra: false, count: 2 }
                }
                break;
            case 3: return { instr: `CA`, extra: false, count: 2 }
            case 4: return { instr: `CS`, extra: false, count: 2 }
            case 5:
                switch (qc) {
                    case 0: return { instr: `INDEX`, extra: false, count: 2 }
                    case 1: return { instr: `DXCH`, extra: false, count: 3 }
                    case 2: return { instr: `TS`, extra: false, count: 2 }
                    case 3: return { instr: `XCH`, extra: false, count: 2 }
                }
                break;
            case 6: return { instr: `AD`, extra: false, count: 2 }
            case 7: return { instr: `MASK`, extra: false, count: 2 }
        }
    } else {
        extra = false;
        
        switch (code) {
            case 0:
                switch (pc) {
                    case 0: return { instr: `READ`, extra: false, count: 2 }
                    case 1: return { instr: `WRITE`, extra: false, count: 2 }
                    case 2: return { instr: `RAND`, extra: false, count: 2 }
                    case 3: return { instr: `WAND`, extra: false, count: 2 }
                    case 4: return { instr: `ROR`, extra: false, count: 2 }
                    case 5: return { instr: `WOR`, extra: false, count: 2 }
                    case 6: return { instr: `RXOR`, extra: false, count: 2 }
                    case 7: return { instr: `EDRUPT`, extra: false, count: 3 }
                }
                break;
            case 1:
                if (qc === 0)
                    return { instr: `DV`, extra: false, count: 6 }
                else
                    return { instr: `BZF`, extra: false, count: 1 }
            case 2:
                switch (qc) {
                    case 0: return { instr: `MSU`, extra: false, count: 2 }
                    case 1: return { instr: `QXCH`, extra: false, count: 2 }
                    case 2: return { instr: `AUG`, extra: false, count: 2 }
                    case 3: return { instr: `DIM`, extra: false, count: 2 }
                }
                break;
            case 3: return { instr: `DCA`, extra: false, count: 3 }
            case 4: return { instr: `DCS`, extra: false, count: 3 }
            case 5: return { instr: `INDEX_2`, extra: true, count: 2 }
            case 6: 
                if (qc === 0)
                    return { instr: `SU`, extra: false, count: 2 }
                else
                    return { instr: `BZMF`, extra: false, count: 1 }
            case 7: return { instr: `MP`, extra: false, count: 3 }
        }
    }
    throw new Error('Decodinhg error');
}