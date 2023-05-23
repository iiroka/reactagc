import { acgDecode, ArgcInstr } from './agcinstr'
import { AgcConsts} from './agc'

interface deasmResult {
    deasm: string
    extraCode: boolean
}

function decodeAddr(addr: number): string {
    if (addr === AgcConsts.REG_A) return "A";
    else if (addr === AgcConsts.REG_L) return "L";
    else if (addr === AgcConsts.REG_Q) return "Q";
    else if (addr === AgcConsts.REG_EB) return "EB";
    else if (addr === AgcConsts.REG_FB) return "FB";
    else if (addr === AgcConsts.REG_Z) return "Z";
    else if (addr === AgcConsts.REG_BB) return "BB";
    else if (addr === AgcConsts.REG_ZERO) return "ZERO";
    else if (addr === AgcConsts.REG_ARUPT) return "ARUPT";
    else if (addr === AgcConsts.REG_LRUPT) return "LRUPT";
    else if (addr === AgcConsts.REG_TIME4) return "TIME4";
    return addr.toString(8).padStart(4, '0');
}

function decodeIO(addr: number): string {
    return addr.toString(8).padStart(3, '0');
}

function deassembleInstr(instr: ArgcInstr, cmd: number, addr: number): string {
    const imm12 = cmd & 0xFFF;
    const imm10 = cmd & 0x3FF;
    const imm9 = cmd & 0x1FF;
    switch (instr) {
        case `XXALQ`: return "XXALQ";
        case `XLQ`: return "XLQ";
        case `RETURN`:  return "RETURN";
        case `RELINT`:  return "RELINT";
        case `INHINT`:  return "INHINT";
        case `EXTEND`:  return "EXTEND";
        case `TC`:      return `TC    ${decodeAddr(imm12)}`;
        case `CCS`:     return `CCS   ${decodeAddr(imm10)}`;
        case `TCF`:
            if (imm12 === addr) return `NOOP`;
            return `TCF   ${decodeAddr(imm12)}`;
        case `DAS`:
            if (imm10 === 1) return `DDOUBL`;
            return `DAS   ${decodeAddr(imm10-1)}`;
        case `LXCH`:
            if (imm10 === 7) return `ZL`;
            return `LXCH  ${decodeAddr(imm10)}`;
        case `INCR`:    return `INCR  ${decodeAddr(imm10)}`;
        case `ADS`:     return `ADS   ${decodeAddr(imm10)}`;
        case `CA`:
            if (imm12 === 0) return `NOOP`;
            return `CA    ${decodeAddr(imm12)}`;
        case `CS`:
            if (imm12 === 0) return `COM`;
            return `CS    ${decodeAddr(imm12)}`;
        case `INDEX`:
            if (imm10 === 0o17) return `RESUME`;
            return `INDEX ${decodeAddr(imm10)}`;
        case `DXCH`:
            if (imm10 === 5) return `DTCF`;
            if (imm10 === 6) return `DTCB`;
            return `DXCH  ${decodeAddr(imm10-1)}`;
        case `TS`:
            if (imm12 === 0) return `OVSK`;
            if (imm12 === 5) return `TCAA`;
            return `TS    ${decodeAddr(imm10)}`;
        case `XCH`:     return `XCH   ${decodeAddr(imm10)}`;
        case `AD`:
            if (imm12 === 0) return `DOUBLE`;
            return `AD    ${decodeAddr(imm12)}`;
        case `MASK`:     return `MASK  ${decodeAddr(imm12)}`;
        case `READ`:     return `READ  ${decodeIO(imm9)}`;
        case `WRITE`:    return `WRITE ${decodeIO(imm9)}`;
        case `RAND`:     return `RAND  ${decodeIO(imm9)}`;
        case `WAND`:     return `WAND  ${decodeIO(imm9)}`;
        case `ROR`:      return `ROR   ${decodeIO(imm9)}`;
        case `WOR`:      return `WOR   ${decodeIO(imm9)}`;
        case `RXOR`:     return `RXOR  ${decodeIO(imm9)}`;
        case `EDRUPT`:   return `EDRUPT ${decodeIO(imm9)}`;
        case `DV`:       return `DV    ${decodeAddr(imm10)}`;
        case `BZF`:      return `BZF   ${decodeAddr(imm12)}`;
        case `MSU`:      return `MSU   ${decodeAddr(imm10)}`;
        case `QXCH`:     return `QXCH  ${decodeAddr(imm10)}`;
        case `AUG`:      return `AUG   ${decodeAddr(imm10)}`;
        case `DIM`:      return `DIM   ${decodeAddr(imm10)}`;
        case `DCA`:      return `DCA   ${decodeAddr(imm12-1)}`;
        case `DCS`:      return `DCS   ${decodeAddr(imm12-1)}`;
        case `INDEX_2`:  return `INDEX ${decodeAddr(imm12)}`;
        case `SU`:       return `SU    ${decodeAddr(imm10)}`;
        case `BZMF`:     return `BZMF  ${decodeAddr(imm12)}`;
        case `MP`:
            if (imm12 === 0) return `SQUARE`;
            return `MP    ${decodeAddr(imm12)}`;
        default:
            console.log(`Unhandled ${instr}`)
    }
    return ''
}

export function deassemble(addr: number, cmd: number, extraCode: boolean): deasmResult {
    const res = acgDecode(cmd, extraCode);
    return { deasm: deassembleInstr(res.instr, cmd, addr), extraCode: res.extra}
}