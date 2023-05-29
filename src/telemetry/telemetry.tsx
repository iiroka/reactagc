import { useCallback, useContext, useEffect, useState } from 'react'
import './telemetry.css'
import { AgcContext } from '../AgcContext';

interface TelemetryProperties {
    msg?: number[]
}

// Identifies the various downlink lists, except for erasable dumps.
const DL_CM_POWERED_LIST = 0;
const DL_LM_ORBITAL_MANEUVERS = 1;
const DL_CM_COAST_ALIGN = 2;
const DL_LM_COAST_ALIGN = 3;
const DL_CM_RENDEZVOUS_PRETHRUST = 4;
const DL_LM_RENDEZVOUS_PRETHRUST = 5;
const DL_CM_PROGRAM_22 = 6;
const DL_LM_DESCENT_ASCENT = 7;
const DL_LM_LUNAR_SURFACE_ALIGN = 8;
const DL_CM_ENTRY_UPDATE = 9;
const DL_LM_AGS_INITIALIZATION_UPDATE = 10;


enum Format_t {
    FMT_SP, FMT_DP, FMT_OCT, FMT_2OCT, FMT_DEC, FMT_2DEC, FMT_USP
};

interface FieldSpec_t {
    indexIntoList: number;	// if -1, then is a spacer.
    name?: string
    scale?: number
    format?: Format_t;
    formatter?: (indexIntoList: number, scale: number, format: Format_t, list: number[]) => string;
    row?: number;		// If 0,0, then just "next" position.
    col?: number;
};


interface DownlinkListSpec_t {
    title: string;
    fieldSpecs: FieldSpec_t[];
};

class TelemetryState {
    lastRow = 1
    lastCol = 0
}

const FLOAT_SCALE = (1.0 / 0o2000000000)
const S_FLOAT_SCALE = (1.0 / 0o40000)
const US_FLOAT_SCALE = (1.0 / 0o100000)
const PRINT_CSM = 1
const PRINT_LM = 2
const B0 = 0x1
const B1 = 0x2
const B2 = 0x4
const B3 = 0x8
const B4 = 0x10
const B5 = 0x20
const B6 = 0x40
const B7 = 0x80
const B8 = 0x100
const B9 = 0x200
const B10 = 0x400
const B11 = 0x800
const B12 = 0x1000
const B13 = 0x2000
const B14 = 0x4000
const B15 = 0x8000
const B16 = 0x10000
const B17 = 0x20000
const B18 = 0x40000
const B19 = 0x80000
const B20 = 0x100000
const B21 = 0x200000
const B22 = 0x400000
const B23 = 0x800000
const B24 = 0x1000000
const B25 = 0x2000000
const B26 = 0x4000000
const B27 = 0x8000000
const B28 = 0x10000000
const B29 = 0x20000000

//---------------------------------------------------------------------------
// Print a double-precision number.  I cut-and-pasted this from CheckDec.c,
// and modified trivially;

function GetDP(list: number[], index: number, scale: number): number
{
    let oct1 = list[index];
    let oct2 = list[index + 1];
    let sign = 1;
    if (0 !== (0o40000 & oct1))
    {
        oct1 = ~oct1;
        oct2 = ~oct2;
        sign = -1;
    }
    let i = ((oct1 & 0o37777) << 14) | (oct2 & 0o37777);
    let x = sign * i * FLOAT_SCALE * scale;
    return x;
}

function GetSP(list: number[], index: number, scale: number): number
{
    let oct = list[index];
    let sign = 1;
    if (0 !== (0o40000 & oct))
    {
        oct = ~oct;
        sign = -1;
    }
    let i = (oct & 0o37777);
    let x = sign * i * S_FLOAT_SCALE * scale;
    return x;
}

function GetUSP(list: number[], index: number, scale: number): number
{
    let oct = list[index] & 0o77777;
    let x = oct * US_FLOAT_SCALE * scale;
    return x;
}
//--------------------------------------------------------------------------
// Some specific formatting functions for wacky fields.

// LM Coast Align -- RR Range.
function FormatRrRange(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetSP(list, indexIntoList, 1);
    let radmodes = list[126];
    if (0o4 & radmodes)		// high scale
        x *= 75.04;
    else
        x *= 9.38;
    return x.toPrecision(5);
}

// LM Coast Align -- RR Range Rate.
function FormatRrRangeRate(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = (list[indexIntoList] - 0o17000) * (-0.6278);
    return x.toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", x);
//   return (DefaultFormatBuffer);
}

// LM Coast Align -- LR Vx
function FormatLrVx(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = (list[indexIntoList] - 12288.2) * (-0.6440);
    return x.toPrecision(5);
    // sprintf (DefaultFormatBuffer, "%.5g", x);
    // return (DefaultFormatBuffer);
}

// LM Coast Align -- LR Vy
function FormatLrVy(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = (list[indexIntoList] - 12288.2) * (1.212);
    return x.toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", x);
//   return (DefaultFormatBuffer);
}

// LM Coast Align -- LR Vz
function FormatLrVz(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = (list[indexIntoList] - 12288.2) * (0.8668);
    return x.toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", x);
//   return (DefaultFormatBuffer);
}

// LM Coast Align -- LR Range.
function FormatLrRange(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetSP(list, indexIntoList, 1);
    let Radmodes = list[126];
    if (0o400 & Radmodes)		// high scale
        x *= 5.395;
    else
        x *= 1.079;
    return x.toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", x);
//   return (DefaultFormatBuffer);
}

// LM AGS Initialization -- LM & CM Epoch
function FormatEpoch(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let data = [list[indexIntoList], list[indexIntoList + 4]];
//   int Data[2];
//   double x;
//   Data[0] = list[IndexIntoList];
//   Data[1] = list[IndexIntoList + 4];
    let x = GetDP (data, 0, scale);
    return x.toPrecision(10);
//   sprintf (DefaultFormatBuffer, "%.10g", x);
//   return (DefaultFormatBuffer);
}

// LM AGS Initialization -- Adjust SP scaling depending on 
// Earth vs. Moon.  Assumes that Scale is set for Earth-orbit,
// and adjusts it downward for Moon-orbit.  This is the usual
// situation where there is a difference in earth-moon scaling,
// so this function can be used in a number of cases.
function FormatEarthOrMoonSP(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let Flagword0 = list[76];
    if (0o4000 & Flagword0)	// MOONFLAG
        scale /= 4;
    let x = GetSP (list, indexIntoList, scale);
    return x.toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", x);
//   return (DefaultFormatBuffer);
}

// Similar, but different flag is used for earth vs. moon
function FormatEarthOrMoonDP(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let flagword8 = list[84];
    if (0o2000 & flagword8)	// LMOONFLG
        scale /= 4;
    let x = GetDP(list, indexIntoList, scale);
    return x.toPrecision(10);
//   sprintf (DefaultFormatBuffer, "%.10g", x);
//   return (DefaultFormatBuffer);
}

// LM Descent/Ascent --- HMEAS (LR RANGE)
function FormatHMEAS(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetDP(list, indexIntoList, scale);
    return (1.079 * x).toPrecision(10);
}

// LM Descent/Ascent --- FC
function FormatGtc(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetDP(list, indexIntoList, scale);
    return (2.817 * x).toPrecision(10);
//   sprintf (DefaultFormatBuffer, "%.10g", 2.817 * x);
//   return (DefaultFormatBuffer);
}


// CM (all) -- ADOT vs. OGARATE/OMEGAB, or WBODY vs. OMEGAC
function FormatAdotsOrOga(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    // static char Unknown[] = "(unknown)";
    // int Flagword6, Dapdatr1, Flagword9;
    // double fScale, x;
    let x = GetDP(list, indexIntoList, 1);
    let flagword6 = 0o60000 & list[84];
    let flagword9 = 0o400 & list[87];
    let dapdatr1 = 0o70000 & list[162];
    let fScale = 0.0;
    if (flagword6 === 0o20000)	// RCS DAP
        fScale = 450.0;
    else if (flagword6 === 0o40000)	// TVC DAP
    {
        if (indexIntoList === 20)	// OGARATE
            fScale = 16.0;
        else 			// OMEGAB pitch, yaw, or OMEGAC
        {
            if (dapdatr1 === 0o10000)
                fScale = 12.5;
            else if ((dapdatr1 & 0o30000) !== 0o20000)
                return "(unknown)";
            else if (flagword9 === 0)
                fScale = 1.0;	// Scaling here relies on data we don't have.
            else
                fScale = 6.25;
        }
    }
    else				// No DAP
        return "(unknown)";
    return (fScale * x).toPrecision(10);
    // sprintf (DefaultFormatBuffer, "%.10g", fScale * x);
    // return (DefaultFormatBuffer);
}

// CM Powered list -- DELVs
function FormatDELV(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
  let x = GetDP (list, indexIntoList, scale);
  return (5.85 * x).toPrecision(10);
//   sprintf (DefaultFormatBuffer, "%.10g", 5.85 * x);
//   return (DefaultFormatBuffer);
}

// CM Powered list -- PACTOFF or YACTOFF
function FormatXACTOFF(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
  let x = GetSP (list, indexIntoList, scale);
  return (85.41 * x).toPrecision(5);
//   sprintf (DefaultFormatBuffer, "%.5g", 85.41 * x);
//   return (DefaultFormatBuffer);
}

// CM Program 22 -- optics trunnion angle
function FormatOTRUNNION(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
//   int twos;
//   double x;
  // Fetch the value, which is in 2's complement.
    let twos = list[indexIntoList];
    if (0o40000 & twos)
        twos |= ~0o77777;
    let x = twos * S_FLOAT_SCALE * 45 + 19.7754;
    return x.toPrecision(5);
    // sprintf (DefaultFormatBuffer, "%.5g", x);
    // return (DefaultFormatBuffer);
}

// Scales by half.
function FormatHalfDP(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetDP(list, indexIntoList, scale);
    return (0.5 * x).toPrecision(10);
//   sprintf (DefaultFormatBuffer, "%.10g", x / 2);
//   return (DefaultFormatBuffer);
}

// CM Entry/Update -- RDOT..
function FormatRDOT(indexIntoList: number, scale: number, format: Format_t, list: number[]): string
{
    let x = GetDP(list, indexIntoList, scale);
    return (x * 2 * 25766.1973).toPrecision(10);
//   double x;
//   x = GetDP (&DownlinkListBuffer[IndexIntoList], 1);
//   sprintf (DefaultFormatBuffer, "%.10g", x * 2 * 25766.1973);
//   return (DefaultFormatBuffer);
}


//---------------------------------------------------------------------------
// Specifications for the DEFAULT downlink lists.  Changing the names or formats
// of the downlink-list fields, or changing their screen positions, is just
// a matter of editing the following lists.

const CmPoweredListSpec: DownlinkListSpec_t = {
    title: "LM Powered downlink list",
    fieldSpecs: [
    { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: -1 },
    { indexIntoList: 2, name: "RN=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 4, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 6, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: -1 },
    { indexIntoList: 8, name: "VN=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 10, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 12, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 14, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 16, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 17, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 18, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 19, name: "CDUT=", scale: B0, format: Format_t.FMT_2OCT },	// Confused about this one.
    { indexIntoList: 20, name: "ADOT=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: 22, name: "ADOT+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: 24, name: "ADOT+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: -1 },
    { indexIntoList: 26, name: "AK=", scale: 180, format: Format_t.FMT_SP },
    { indexIntoList: 27, name: "AK1=", scale: 180, format: Format_t.FMT_SP },
    { indexIntoList: 28, name: "AK2=", scale: 180, format: Format_t.FMT_SP }, 
    { indexIntoList: 29, name: "RCSFLAGS=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 30, name: "THETADX=", scale: 360, format: Format_t.FMT_USP },
    { indexIntoList: 31, name: "THETADY=", scale: 360, format: Format_t.FMT_USP },
    { indexIntoList: 32, name: "THETADZ=", scale: 360, format: Format_t.FMT_USP },
    { indexIntoList: 34, name: "TIG=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 36, name: "DELLT4=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 38, name: "RTARG=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 40, name: "RTARG+2=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 42, name: "RTARG+4=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 44, name: "TGO=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 46, name: "PIPTIME1=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: -1 }, { indexIntoList: -1 },
    { indexIntoList: 48, name: "DELV=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
    { indexIntoList: 50, name: "DELV+2=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
    { indexIntoList: 52, name: "DELV+4=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
    { indexIntoList: -1 },
    { indexIntoList: 54, name: "PACTOFF=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
    { indexIntoList: 55, name: "YACTOFF=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
    { indexIntoList: 56, name: "PCMD=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
    { indexIntoList: 57, name: "YCMD=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
    { indexIntoList: 58, name: "CSTEER=", scale: 4, format: Format_t.FMT_SP },
    { indexIntoList: 60, name: "DELVEET1=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: -1 }, { indexIntoList: -1 },
    { indexIntoList: 66, name: "REFSMMAT=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: 68, name: "REFSMMAT+2=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: 70, name: "REFSMMAT+4=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: 72, name: "REFSMMAT+6=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: 74, name: "REFSMMAT+8=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: 76, name: "REFSMMAT+10=", scale: 2, format: Format_t.FMT_DP },
    { indexIntoList: -1 }, { indexIntoList: -1 },
    { indexIntoList: 78, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 80, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 82, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 84, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 86, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: -1 },
    { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 102, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 104, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 106, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: -1 },
    { indexIntoList: 108, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 110, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 112, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 114, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 134, name: "RSBBQ=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 137, name: "CHAN77=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 138, name: "C31FLWRD=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: -1 },
    { indexIntoList: 139, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 140, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 141, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 142, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 143, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
    { indexIntoList: 144, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
    { indexIntoList: 145, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP },
    { indexIntoList: 146, name: "ELEV=", scale: 360, format: Format_t.FMT_DP },
    { indexIntoList: 148, name: "CENTANG=", scale: 360, format: Format_t.FMT_DP },
    { indexIntoList: 150, name: "OFFSET=", scale: B29, format: Format_t.FMT_DP },
    { indexIntoList: 152, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 154, name: "TEVENT=", scale: B28, format: Format_t.FMT_DP },
    { indexIntoList: 158, name: "OPTMODES=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 159, name: "HOLDFLAG=", scale: B0, format: Format_t.FMT_DEC },
    { indexIntoList: 160, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
    { indexIntoList: 161, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
    { indexIntoList: 162, name: "DAPDATR1=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 163, name: "DAPDATR2=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: -1 }, { indexIntoList: -1 },
    { indexIntoList: 164, name: "ERRORX=", scale: 180, format: Format_t.FMT_SP },
    { indexIntoList: 165, name: "ERRORY=", scale: 180, format: Format_t.FMT_SP },
    { indexIntoList: 166, name: "ERRORZ=", scale: 180, format: Format_t.FMT_SP },
    { indexIntoList: -1 },
    { indexIntoList: 168, name: "WBODY=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: 170, name: "WBODY+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: 172, name: "WBODY+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
    { indexIntoList: 174, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
    { indexIntoList: 175, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 176, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: 177, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
    { indexIntoList: -1 },
    { indexIntoList: 178, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: 179, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
    { indexIntoList: -1 },
    { indexIntoList: -1 },
    { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
    { indexIntoList: 188, name: "VGTIG=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 190, name: "VGTIG+2=",scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 192, name: "VGTIG+4=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: -1 },
    { indexIntoList: 194, name: "DELVEET2=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 196, name: "DELVEET2+2=", scale: B7, format: Format_t.FMT_DP },
    { indexIntoList: 98, name: "DELVEET2+4=", scale: B7, format: Format_t.FMT_DP }    
    ]
};

const LmOrbitalManeuversSpec: DownlinkListSpec_t = {
    title: "LM Orbital Maneuvers downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "DELLT4=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 18, name: "RTARGX=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 20, name: "RTARGY=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 22, name: "RTARGZ=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 24, name: "ELEV=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 26, name: "TEVENT=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 28, name: "REFSMMAT=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 30, name: "REFSMMAT+2=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 32, name: "REFSMMAT+4=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 34, name: "REFSMMAT+6=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 36, name: "REFSMMAT+8=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 38, name: "REFSMMAT+10=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 40, name: "TCSI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 42, name: "DELVEET1=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 44, name: "DELVEET1+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 46, name: "DELVEET1+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "VGTIG=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 50, name: "VGTIG+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 52, name: "VGTIG+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 54, name: "DNLRVELZ=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVz },
      { indexIntoList: 56, name: "DNLRALT=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrRange },
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: -1 },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 128, name: "POSTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 129, name: "NEGTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 130, name: "POSTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 131, name: "NEGTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 134, name: "TCDH=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 136, name: "DELVEET2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 138, name: "DELVEET2+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 140, name: "DELVEET2+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 142, name: "TTPI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 144, name: "DELVEET3=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 146, name: "DELVEET3+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 148, name: "DELVEET3+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 150, name: "DNRRANGE=", scale: B0, format: Format_t.FMT_SP, formatter: FormatRrRange },
      { indexIntoList: 151, name: "DNRRDOT=", scale: B0, format: Format_t.FMT_SP, formatter: FormatRrRangeRate },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 152, name: "DNLRVELX=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVx },
      { indexIntoList: 153, name: "DNLRVELY=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVy },
      { indexIntoList: 154, name: "DNLRVELZ=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVz },
      { indexIntoList: 155, name: "DNLRALT=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrRange },
      { indexIntoList: 156, name: "DIFFALT=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 162, name: "TIG=", scale: B28, format: Format_t.FMT_DP },    
      { indexIntoList: 164, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 188, name: "PIPTIME1=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 190, name: "DELV=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 192, name: "DELV+2=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 194, name: "DELV+4=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 198, name: "TGO=", scale: B28, format: Format_t.FMT_DP }
    ]
};
  
const CmCoastAlignSpec: DownlinkListSpec_t = {
    title: "CM Coast Align downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 17, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 18, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "CDUT=", scale: B0, format: Format_t.FMT_2OCT },	// Confused about this one.
      { indexIntoList: 20, name: "ADOT=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 22, name: "ADOT+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 24, name: "ADOT+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "AK=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 27, name: "AK1=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 28, name: "AK2=", scale: 180, format: Format_t.FMT_SP }, 
      { indexIntoList: 29, name: "RCSFLAGS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 30, name: "THETADX=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 31, name: "THETADY=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 32, name: "THETADZ=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 34, name: "TIG=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 36, name: "BESTI=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 37, name: "BESTJ=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 38, name: "MARKDOWN=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 40, name: "MARKDOWN+2=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 41, name: "MARKDOWN+3=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 42, name: "MARKDOWN+4=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 43, name: "MARKDOWN+5=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 44, name: "MARKDOWN+6=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 46, name: "MARK2DWN=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "MARK2DWN+2=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 49, name: "MARK2DWN+3=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 50, name: "MARK2DWN+4=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 51, name: "MARK2DWN+5=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 52, name: "MARK2DWN+6=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 54, name: "HAPOX=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 56, name: "HPERX=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 58, name: "DELTAR=", scale: 360, format: Format_t.FMT_DP },		// Differs between Colossus 1 & 3
      { indexIntoList: 58, name: "PACTOFF=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
      { indexIntoList: 59, name: "YACTOFF=", scale: B14, format: Format_t.FMT_SP, formatter: FormatXACTOFF },
      { indexIntoList: 60, name: "VGTIG=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 62, name: "VGTIG+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 64, name: "VGTIG+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 66, name: "REFSMMAT=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 68, name: "REFSMMAT+2=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 70, name: "REFSMMAT+4=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 72, name: "REFSMMAT+6=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 74, name: "REFSMMAT+8=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 76, name: "REFSMMAT+10=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 78, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 102, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 126, name: "OPTION1=", scale: B0, format: Format_t.FMT_OCT },	// Don't know what this is.
      { indexIntoList: 127, name: "OPTION2=", scale: B0, format: Format_t.FMT_OCT },	// .. or this
      { indexIntoList: 128, name: "TET=", scale: B28, format: Format_t.FMT_DP },	// ... or this
      { indexIntoList: 134, name: "RSBBQ=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 137, name: "CHAN77=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 138, name: "C31FLWRD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 139, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 140, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 141, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 142, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 143, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 144, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 145, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 146, name: "OGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 148, name: "IGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 150, name: "MGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 152, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 154, name: "TEVENT=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 156, name: "LAUNCHAZ=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 158, name: "OPTMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 159, name: "HOLDFLAG=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 160, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 161, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 162, name: "DAPDATR1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 163, name: "DAPDATR2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 164, name: "ERRORX=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "ERRORY=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "ERRORZ=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 168, name: "WBODY=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 170, name: "WBODY+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 172, name: "WBODY+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 174, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 175, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 178, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 179, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: -1 },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT }
    ]
};
  
const LmCoastAlignSpec: DownlinkListSpec_t = {
    title: "LM Coast Align downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "AGSK=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 18, name: "TALIGN=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 20, name: "POSTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 21, name: "NEGTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 22, name: "POSTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 23, name: "NEGTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 24, name: "DNRRANGE=", scale: B0, format: Format_t.FMT_SP, formatter: FormatRrRange },
      { indexIntoList: 25, name: "DNRRDOT=", scale: B0, format: Format_t.FMT_SP, formatter: FormatRrRangeRate },
      { indexIntoList: 26, name: "TEVENT=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 28, name: "REFSMMAT=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 30, name: "REFSMMAT+2=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 32, name: "REFSMMAT+4=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 34, name: "REFSMMAT+6=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 36, name: "REFSMMAT+8=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 38, name: "REFSMMAT+10=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 40, name: "AOTCODE=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 42, name: "RLS=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 44, name: "RLS+2=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 46, name: "RLS+4=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "DNLRVELX=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVx },
      { indexIntoList: 49, name: "DNLRVELY=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVy },
      { indexIntoList: 50, name: "DNLRVELZ=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrVz },
      { indexIntoList: 51, name: "DNLRALT=", scale: B27, format: Format_t.FMT_SP, formatter: FormatLrRange },
      { indexIntoList: 52, name: "VGTIG=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 54, name: "VGTIG+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 56, name: "VGTIG+4=", scale: B7, format: Format_t.FMT_DP },
      // Same as LM Orbital Maneuvers.
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      //  
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 128, name: "OGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 130, name: "IGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 132, name: "MGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 134, name: "BESTI=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 135, name: "BESTJ=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 136, name: "STARSAV1=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 138, name: "STARSAV1+2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 140, name: "STARSAV1+4=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 142, name: "STARSAV2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 144, name: "STARSAV2+2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 146, name: "STARSAV2+4=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 152, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 153, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 154, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 155, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 156, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 157, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 162, name: "TIG=", scale: B28, format: Format_t.FMT_DP },    
      { indexIntoList: -1 },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT }
    ]
};
  
const CmRendezvousPrethrustSpec: DownlinkListSpec_t = {
    title: "CM Rendezvous/Prethrust downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 17, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 18, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "CDUT=", scale: B0, format: Format_t.FMT_2OCT },	// Confused about this one.
      { indexIntoList: 20, name: "ADOT=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 22, name: "ADOT+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 24, name: "ADOT+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "AK=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 27, name: "AK1=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 28, name: "AK2=", scale: 180, format: Format_t.FMT_SP }, 
      { indexIntoList: 29, name: "RCSFLAGS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 30, name: "THETADX=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 31, name: "THETADY=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 32, name: "THETADZ=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 34, name: "TIG=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 36, name: "DELLT4=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 38, name: "RTARG=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 40, name: "RTARG+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 42, name: "RTARG+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 44, name: "VHFTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 46, name: "MARKDOWN=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "MARKDOWN+2=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 49, name: "MARKDOWN+3=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 50, name: "MARKDOWN+4=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 51, name: "MARKDOWN+5=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 52, name: "MARKDOWN+6=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 53, name: "RM=", scale: 100, format: Format_t.FMT_DEC },
      { indexIntoList: 54, name: "VHFCNT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 55, name: "TRKMKCNT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 56, name: "TTPI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 58, name: "ECSTEER=", scale: 4, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "DELVTPF=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 62, name: "TCDH=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 64, name: "TCSI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 66, name: "TPASS4=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 68, name: "DELVSLV=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 70, name: "DELVSLV+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 72, name: "DELVSLV+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 74, name: "RANGE=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 76, name: "RRATE=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 78, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 102, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 126, name: "OPTION1=", scale: B0, format: Format_t.FMT_OCT },	// Don't know what this is.
      { indexIntoList: 127, name: "OPTION2=", scale: B0, format: Format_t.FMT_OCT },	// .. or this
      { indexIntoList: 128, name: "TET=", scale: B28, format: Format_t.FMT_DP },	// ... or this
      { indexIntoList: 134, name: "RSBBQ=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 137, name: "CHAN77=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 138, name: "C31FLWRD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 139, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 140, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 141, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 142, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 143, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 144, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 145, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP }, 
      { indexIntoList: 146, name: "DIFFALT=", scale: B0, format: Format_t.FMT_2DEC },	// Don't yet know the scaling of this.
      { indexIntoList: 148, name: "CENTANG=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 152, name: "DELVEET3=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 154, name: "DELVEET3+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 156, name: "DELVEET3+4=", scale: B7, format: Format_t.FMT_DP },    
      { indexIntoList: 158, name: "OPTMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 159, name: "HOLDFLAG=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 160, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 161, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 162, name: "DAPDATR1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 163, name: "DAPDATR2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 164, name: "ERRORX=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "ERRORY=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "ERRORZ=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 168, name: "WBODY=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 170, name: "WBODY+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 172, name: "WBODY+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 174, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 175, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 178, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 179, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: -1 },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 188, name: "RTHETA=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 190, name: "LAT(SPL)=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 192, name: "LNG(SPL)=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 194, name: "VPRED=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 196, name: "GAMMAEI=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 198, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT }
    ]
};
  
const LmRendezvousPrethrustSpec: DownlinkListSpec_t = {
    title: "LM Rendezvous/Prethrust downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "RANGRDOT=", scale: B0, format: Format_t.FMT_2OCT },	// Look at this later.
      { indexIntoList: -1 }, { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 18, name: "AIG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "AMG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 20, name: "AOG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 21, name: "TRKMKCNT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 22, name: "TANGNB=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 23, name: "TANGNB+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 24, name: "MARKTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "DELLT4=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 28, name: "RTARGX=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 30, name: "RTARGY=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 32, name: "RTARGZ=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 34, name: "DELVSLV=", scale: B7, format: Format_t.FMT_DP },   
      { indexIntoList: 36, name: "DELVSLV+2=", scale: B7, format: Format_t.FMT_DP },   
      { indexIntoList: 38, name: "DELVSLV+4=", scale: B7, format: Format_t.FMT_DP }, 
      { indexIntoList: -1 },
      { indexIntoList: 40, name: "TCSI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 42, name: "DELVEET1=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 44, name: "DELVEET1+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 46, name: "DELVEET1+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 50, name: "TTPF=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 52, name: "X789=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: 54, name: "X789+2=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: -1 },
      { indexIntoList: 56, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 57, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: -1 },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 128, name: "POSTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 129, name: "NEGTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 130, name: "POSTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 131, name: "NEGTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 134, name: "TCDH=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 136, name: "DELVEET2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 138, name: "DELVEET2+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 140, name: "DELVEET2+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 142, name: "TTPI=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 144, name: "DELVEET3=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 146, name: "DELVEET3+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 148, name: "DELVEET3+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 150, name: "ELEV=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 152, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 153, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 154, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 155, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 156, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 157, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 162, name: "TIG=", scale: B28, format: Format_t.FMT_DP },    
      { indexIntoList: 164, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 190, name: "CENTANG=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 192, name: "NN=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 194, name: "DIFFALT=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 196, name: "DELVTPF=", scale: B7, format: Format_t.FMT_DP }
    ]
};
  
const CmProgram22Spec: DownlinkListSpec_t = {
    title: "CM Program 22 downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 17, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 18, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "CDUT=", scale: B0, format: Format_t.FMT_2OCT },	// Confused about this one.
      { indexIntoList: 20, name: "ADOT=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 22, name: "ADOT+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 24, name: "ADOT+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "AK=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 27, name: "AK1=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 28, name: "AK2=", scale: 180, format: Format_t.FMT_SP }, 
      { indexIntoList: 29, name: "RCSFLAGS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 30, name: "THETADX=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 31, name: "THETADY=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 32, name: "THETADZ=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: -1 },
      { indexIntoList: 34, name: "SVMRKDAT=", scale: B28, format: Format_t.FMT_DP },	// 1st mark
      { indexIntoList: 36, name: "SVMRKDAT+2=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 37, name: "SVMRKDAT+3=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 38, name: "SVMRKDAT+4=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 39, name: "SVMRKDAT+5=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 40, name: "SVMRKDAT+6=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 41, name: "SVMRKDAT+7=", scale: B28, format: Format_t.FMT_DP },	// 2nd mark
      { indexIntoList: 43, name: "SVMRKDAT+9=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 44, name: "SVMRKDAT+10=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 45, name: "SVMRKDAT+11=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 46, name: "SVMRKDAT+12=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 47, name: "SVMRKDAT+13=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 48, name: "SVMRKDAT+14=", scale: B28, format: Format_t.FMT_DP },// 3rd mark
      { indexIntoList: 50, name: "SVMRKDAT+16=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 51, name: "SVMRKDAT+17=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 52, name: "SVMRKDAT+18=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 53, name: "SVMRKDAT+19=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 54, name: "SVMRKDAT+20=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 55, name: "SVMRKDAT+21=", scale: B28, format: Format_t.FMT_DP },// 4th mark
      { indexIntoList: 57, name: "SVMRKDAT+23=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 58, name: "SVMRKDAT+24=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 59, name: "SVMRKDAT+25=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 60, name: "SVMRKDAT+26=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 61, name: "SVMRKDAT+27=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 62, name: "SVMRKDAT+28=", scale: B28, format: Format_t.FMT_DP },// 5th mark
      { indexIntoList: 64, name: "SVMRKDAT+30=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 65, name: "SVMRKDAT+31=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 66, name: "SVMRKDAT+32=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 67, name: "SVMRKDAT+33=", scale: 45, format: Format_t.FMT_SP, formatter: FormatOTRUNNION },
      { indexIntoList: 68, name: "SVMRKDAT+34=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 70, name: "LANDMARK=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 78, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 102, name: "LAT=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "LONG=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "ALT=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 126, name: "OPTION1=", scale: B0, format: Format_t.FMT_OCT },	// Don't know what this is.
      { indexIntoList: 127, name: "OPTION2=", scale: B0, format: Format_t.FMT_OCT },	// .. or this
      { indexIntoList: 128, name: "TET=", scale: B28, format: Format_t.FMT_DP },	// ... or this
      { indexIntoList: 134, name: "RSBBQ=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 137, name: "CHAN77=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 138, name: "C31FLWRD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 139, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 140, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 141, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 142, name: "CDUS=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 143, name: "PIPAX=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 144, name: "PIPAY=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 145, name: "PIPAZ=", scale: B14, format: Format_t.FMT_SP },
      { indexIntoList: 146, name: "8NN=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 152, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 154, name: "RLS=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 156, name: "RLS+2=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 158, name: "RLS+4=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 158, name: "OPTMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 159, name: "HOLDFLAG=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 160, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 161, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 162, name: "DAPDATR1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 163, name: "DAPDATR2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 164, name: "ERRORX=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "ERRORY=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "ERRORZ=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 168, name: "WBODY=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 170, name: "WBODY+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 172, name: "WBODY+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 174, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 175, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 178, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 179, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: -1 },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
    ]
};
  
const LmDescentAscentSpec: DownlinkListSpec_t = {
    title: "LM Descent/Ascent downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "LRXCDUDL=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 3, name: "LRYCDUDL=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 4, name: "LRZCDUDL=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 6, name: "VSELECT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 8, name: "LRVTIMDL=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "VMEAS=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "MKTIME=", scale: B28, format: Format_t.FMT_DP }, 
      { indexIntoList: 14, name: "HMEAS=", scale: B28, format: Format_t.FMT_DP, formatter: FormatHMEAS },
      { indexIntoList: 16, name: "RANGRDOT=", scale: B0, format: Format_t.FMT_2OCT },	// Look at this later.
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 18, name: "AIG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "AMG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 20, name: "AOG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 21, name: "TRKMKCNT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 22, name: "TANGNB=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 23, name: "TANGNB+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 26, name: "TEVENT=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 28, name: "UNFC/2=", scale: B0, format: Format_t.FMT_DP },    
      { indexIntoList: 30, name: "UNFC/2+2=", scale: B0, format: Format_t.FMT_DP },    
      { indexIntoList: 32, name: "UNFC/2+4=", scale: B0, format: Format_t.FMT_DP },  
      { indexIntoList: -1 },  
      { indexIntoList: 34, name: "VGVECT=", scale: B7, format: Format_t.FMT_DP },    
      { indexIntoList: 36, name: "VGVECT+2=", scale: B0, format: Format_t.FMT_DP },    
      { indexIntoList: 38, name: "VGVECT+4=", scale: B0, format: Format_t.FMT_DP },  
      { indexIntoList: -1 },  
      { indexIntoList: 40, name: "TTF/8=", scale: B17, format: Format_t.FMT_DP },
      { indexIntoList: 42, name: "DELTAH=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 44, name: "RLS=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 46, name: "RLS+2=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "RLS+4=", scale: B27, format: Format_t.FMT_DP },
      { indexIntoList: 50, name: "ZDOTD=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 52, name: "X789=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: 54, name: "X789+2=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 56, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 57, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: -1 },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 128, name: "POSTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 129, name: "NEGTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 130, name: "POSTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 131, name: "NEGTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 132, name: "RGU=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: 134, name: "RGU+2=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: 136, name: "RGU+4=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 138, name: "VGU=", scale: B10, format: Format_t.FMT_DP },
      { indexIntoList: 140, name: "VGU+2=", scale: B10, format: Format_t.FMT_DP },
      { indexIntoList: 142, name: "VGU+4=", scale: B10, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 144, name: "LAND=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: 146, name: "LAND+2=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: 148, name: "LAND+4=", scale: B24, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 150, name: "AT=", scale: B9, format: Format_t.FMT_DP },
      { indexIntoList: 152, name: "TLAND=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 154, name: "FC=", scale: B14, format: Format_t.FMT_SP, formatter: FormatGtc },
      { indexIntoList: -1 },
      { indexIntoList: 156, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 157, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 162, name: "TIG=", scale: B28, format: Format_t.FMT_DP },    
      { indexIntoList: 164, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 188, name: "PIPTIME1=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 190, name: "DELV=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 192, name: "DELV+2=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 194, name: "DELV+4=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 196, name: "PSEUDO55=", scale: B14, format: Format_t.FMT_SP, formatter: FormatGtc },
      { indexIntoList: 198, name: "TTOGO=", scale: B28, format: Format_t.FMT_DP }
    ]
};
  
const LmLunarSurfaceAlignSpec: DownlinkListSpec_t = {
    title: "LM Lunar Surface Align downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "R-OTHER=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "R-OTHER+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "R-OTHER+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "V-OTHER=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "V-OTHER+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "V-OTHER+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "T-OTHER=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "RANGRDOT=", scale: B0, format: Format_t.FMT_2OCT },	// Look at this later.
      { indexIntoList: -1 }, { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 18, name: "AIG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "AMG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 20, name: "AOG=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 21, name: "TRKMKCNT=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 22, name: "TANGNB=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 23, name: "TANGNB+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 24, name: "MARKTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 26, name: "TALIGN=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 28, name: "REFSMMAT=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 30, name: "REFSMMAT+2=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 32, name: "REFSMMAT+4=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 34, name: "REFSMMAT+6=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 36, name: "REFSMMAT+8=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: 38, name: "REFSMMAT+10=", scale: B0, format: Format_t.FMT_DP },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 40, name: "YNBSAV=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: 42, name: "YNBSAV+2=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: 44, name: "YNBSAV+4=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 46, name: "ZNBSAV=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: 48, name: "ZNBSAV+2=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: 50, name: "ZNBSAV+4=", scale: B1, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 52, name: "X789=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: 54, name: "X789+2=", scale: B5, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonDP },
      { indexIntoList: 56, name: "LASTYCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 57, name: "LASTXCMD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 128, name: "OGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 130, name: "IGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 132, name: "MGC=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 134, name: "BESTI=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 135, name: "BESTJ=", scale: 6, format: Format_t.FMT_DEC },
      { indexIntoList: 136, name: "STARSAV1=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 138, name: "STARSAV1+2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 140, name: "STARSAV1+4=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 142, name: "STARSAV2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 144, name: "STARSAV2+2=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 146, name: "STARSAV2+4=", scale: 2, format: Format_t.FMT_DP },	// Fix later.  
      { indexIntoList: 148, name: "GSAV=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 150, name: "GSAV+2=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 152, name: "GSAV+4=", scale: 2, format: Format_t.FMT_DP },
      { indexIntoList: 154, name: "AGSK=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 162, name: "TIG=", scale: B28, format: Format_t.FMT_DP },    
      { indexIntoList: 164, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 165, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 188, name: "PIPTIME1=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 190, name: "DELV=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 192, name: "DELV+2=", scale: B14, format: Format_t.FMT_DP },
      { indexIntoList: 194, name: "DELV+4=", scale: B14, format: Format_t.FMT_DP }
    ]
};
  
const CmEntryUpdateSpec: DownlinkListSpec_t = {
    title: "CM Entry/Update downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 4, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 6, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 8, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 10, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 12, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 14, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 16, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 17, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 18, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 19, name: "CDUT=", scale: B0, format: Format_t.FMT_2OCT },	// Confused about this one.
      { indexIntoList: 20, name: "ADOT=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 22, name: "ADOT+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 24, name: "ADOT+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "AK=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 27, name: "AK1=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 28, name: "AK2=", scale: 180, format: Format_t.FMT_SP }, 
      { indexIntoList: 29, name: "RCSFLAGS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 30, name: "THETADX=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 31, name: "THETADY=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 32, name: "THETADZ=", scale: 360, format: Format_t.FMT_USP },
      { indexIntoList: 34, name: "CMDAPMOD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 35, name: "PREL=", scale: 1800, format: Format_t.FMT_SP },
      { indexIntoList: 36, name: "QREL=", scale: 1800, format: Format_t.FMT_SP },
      { indexIntoList: 37, name: "RREL=", scale: 1800, format: Format_t.FMT_SP },
      { indexIntoList: 38, name: "L/D1=", scale: B0, format: Format_t.FMT_DP, formatter: FormatHalfDP },
      { indexIntoList: 40, name: "UPBUFF=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 42, name: "UPBUFF+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 44, name: "UPBUFF+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 46, name: "UPBUFF+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 48, name: "UPBUFF+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 50, name: "UPBUFF+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 52, name: "UPBUFF+12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 54, name: "UPBUFF+14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 56, name: "UPBUFF+16=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 58, name: "UPBUFF+18=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 60, name: "COMPNUMB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 61, name: "UPOLDMOD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 62, name: "UPVERB=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 63, name: "UPCOUNT=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 64, name: "PAXERR1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "ROLLTM=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "LATANG=", scale: 4, format: Format_t.FMT_DP },
      { indexIntoList: 68, name: "RDOT=", scale: B0, format: Format_t.FMT_DP, formatter: FormatRDOT },
      { indexIntoList: 70, name: "THETAH=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 72, name: "LAT(SPL)=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 74, name: "LNG(SPL)=", scale: 360, format: Format_t.FMT_DP },
      { indexIntoList: 76, name: "ALFA/180=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 77, name: "BETA/180=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 78, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 102, name: "PIPTIME1=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 104, name: "DELV=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
      { indexIntoList: 106, name: "DELV+2=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
      { indexIntoList: 108, name: "DELV+4=", scale: B14, format: Format_t.FMT_DP, formatter: FormatDELV },
      { indexIntoList: -1 },
      { indexIntoList: 110, name: "TTE=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VIO=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "VPRED=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "OPTION1=", scale: B0, format: Format_t.FMT_OCT },	// Don't know what this is.
      { indexIntoList: 127, name: "OPTION2=", scale: B0, format: Format_t.FMT_OCT },	// .. or this
      { indexIntoList: 128, name: "TET=", scale: B28, format: Format_t.FMT_DP },	// ... or this
      { indexIntoList: -1 },
      { indexIntoList: 130, name: "ERRORX=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 131, name: "ERRORY=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: 132, name: "ERRORZ=", scale: 180, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 160, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 161, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 162, name: "DAPDATR1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 163, name: "DAPDATR2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 165, name: "ROLLC=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 166, name: "OPTMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 167, name: "HOLDFLAG=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: -1 },
      { indexIntoList: 168, name: "WBODY=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 170, name: "WBODY+2=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 172, name: "WBODY+4=", scale: 450, format: Format_t.FMT_DP, formatter: FormatAdotsOrOga },
      { indexIntoList: 174, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 175, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 176, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 178, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 179, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: -1 },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 188, name: "RSBBQ=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 191, name: "CHAN77=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 192, name: "C31FLWRD=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 193, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 194, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 195, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 196, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 196, name: "GAMMAEI=", scale: 360, format: Format_t.FMT_DP }
    ]
};
  
const LmAgsInitializationUpdateSpec: DownlinkListSpec_t = {
    title: "LM AGS initialization/update downlink list",
    fieldSpecs: [
      { indexIntoList: 0, name: "ID=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 1, name: "SYNC=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 100, name: "TIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 2,  name: "AGSBUFF=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 4,  name: "AGSBUF+2=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 6,  name: "AGSBUF+4=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 8,  name: "LM EPOCH=", scale: B18, format: Format_t.FMT_DP, formatter: FormatEpoch },
      { indexIntoList: 10, name: "AGSBUF+1=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 12, name: "AGSBUF+3=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 14, name: "AGSBUF+5=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 18, name: "AGSBUF+6=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 20, name: "AGSBUF+8=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 22, name: "AGSBUF+10=", scale: B25, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 24, name: "CM EPOCH=", scale: B18, format: Format_t.FMT_DP, formatter: FormatEpoch },
      { indexIntoList: -1 },
      { indexIntoList: 26, name: "AGSBUF+7=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 28, name: "AGSBUF+9=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: 30, name: "AGSBUF+11=", scale: B15, format: Format_t.FMT_SP, formatter: FormatEarthOrMoonSP },
      { indexIntoList: -1 },
      { indexIntoList: 34, name: "COMPNUMB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 35, name: "UPOLDMOD=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 36, name: "UPVERB=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 37, name: "UPCOUNT=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 38, name: "UPBUF=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 40, name: "UPBUF+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 42, name: "UPBUF+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 44, name: "UPBUF+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 46, name: "UPBUF+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 48, name: "UPBUF+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 50, name: "UPBUF+12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 52, name: "UPBUF+14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 54, name: "UPBUF+16=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 56, name: "UPBUF+18=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, 
      // Same as LM Orbital Maneuvers.
      { indexIntoList: 58, name: "REDOCTR=", scale: B0, format: Format_t.FMT_DEC },
      { indexIntoList: 59, name: "THETAD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 60, name: "THETAD+1=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 61, name: "THETAD+2=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 62, name: "RSBBQ=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 63, name: "RSBBQ+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 64, name: "OMEGAP=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 65, name: "OMEGAQ=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 66, name: "OMEGAR=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 68, name: "CDUXD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 69, name: "CDUYD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 70, name: "CDUZD=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      { indexIntoList: 72, name: "CDUX=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 73, name: "CDUY=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 74, name: "CDUZ=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 75, name: "CDUT=", scale: 360, format: Format_t.FMT_SP },
      { indexIntoList: 76, name: "STATE=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 78, name: "STATE+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 80, name: "STATE+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 82, name: "STATE+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 84, name: "STATE+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 86, name: "STATE+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 88, name: "DSPTB=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 90, name: "DSPTB+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 92, name: "DSPTB+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 94, name: "DSPTB+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 96, name: "DSPTB+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 98, name: "DSPTB+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 102, name: "RN=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 104, name: "RN+2=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: 106, name: "RN+4=", scale: B29, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 108, name: "VN=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 110, name: "VN+2=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 112, name: "VN+4=", scale: B7, format: Format_t.FMT_DP },
      { indexIntoList: 114, name: "PIPTIME=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: 116, name: "OMEGAPD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 117, name: "OMEGAQD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: 118, name: "OMEGARD=", scale: 45, format: Format_t.FMT_SP },
      { indexIntoList: -1 },
      // 
      { indexIntoList: 120, name: "CADRFLSH=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 121, name: "CADRFLSH+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 122, name: "CADRFLSH+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 123, name: "FAILREG=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 124, name: "FAILREG+1=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 125, name: "FAILREG+2=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: -1 },
      { indexIntoList: 126, name: "RADMODES=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 127, name: "DAPBOOLS=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 128, name: "POSTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 129, name: "NEGTORKU=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 130, name: "POSTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 131, name: "NEGTORKV=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 136, name: "AGSK=", scale: B28, format: Format_t.FMT_DP },
      { indexIntoList: -1 },
      { indexIntoList: 138, name: "UPBUF=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 140, name: "UPBUF+2=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 142, name: "UPBUF+4=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 144, name: "UPBUF+6=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 146, name: "UPBUF+8=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 148, name: "UPBUF+10=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 150, name: "UPBUF+12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 152, name: "UPBUF+14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 154, name: "UPBUF+16=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 156, name: "UPBUF+18=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: -1 }, { indexIntoList: -1 },
      { indexIntoList: 158, name: "LEMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 159, name: "CSMMASS=", scale: B16, format: Format_t.FMT_SP },
      { indexIntoList: 160, name: "IMODES30=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 161, name: "IMODES33=", scale: B0, format: Format_t.FMT_OCT },
      { indexIntoList: 176, name: "ALPHAQ=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 177, name: "ALPHAR=", scale: 90, format: Format_t.FMT_SP },
      { indexIntoList: 178, name: "POSTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 179, name: "NEGTORKP=", scale: 32, format: Format_t.FMT_DEC },
      { indexIntoList: 180, name: "CHN11,12=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 182, name: "CHN13,14=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 184, name: "CHN30,31=", scale: B0, format: Format_t.FMT_2OCT },
      { indexIntoList: 186, name: "CHN32,33=", scale: B0, format: Format_t.FMT_2OCT }
    ]
};
  

// The ACTUAL downlink lists used.  The following array can be modified
// at runtime to get different lists.  Or, the array can be used to get
// pointers to the default lists, which could be modified in-place
// (for example, to have different row,col coordinates).

// The following array entries must correspond to the numerical order
// of the DL_xxx constants.
const DownlinkListSpecs: DownlinkListSpec_t[] = [
    CmPoweredListSpec, LmOrbitalManeuversSpec,
    CmCoastAlignSpec, LmCoastAlignSpec,
    CmRendezvousPrethrustSpec, LmRendezvousPrethrustSpec,
    CmProgram22Spec, LmDescentAscentSpec,
    LmLunarSurfaceAlignSpec, CmEntryUpdateSpec,
    LmAgsInitializationUpdateSpec
];
  
const Swidth = 79;
// const SWIDTH = 160;
// const SHEIGHT = 100;


export default function Telemetry(props: TelemetryProperties) {

    const agc = useContext(AgcContext);
    const [state, setState] = useState(new TelemetryState())
    const [sbuffer, setSBuffer] = useState((' '.repeat(80) + '\n').repeat(40));

    const PrintField = useCallback((fieldSpec: FieldSpec_t, list: number[], buffer: string[][]) => {

        function insertStr(x: number, y: number, str: string) {
            for (let i = 0; i < str.length; i++) buffer[x][y+i] = str.charAt(i);
        }

        let row = fieldSpec.row ?? state.lastRow;
        let col = fieldSpec.col ?? state.lastCol;
        state.lastCol = col + 20;   
        if (state.lastCol < Swidth)
            state.lastRow = row;
        else {
            state.lastCol = 0;
            state.lastRow = row + 1;
        }
        if (fieldSpec.indexIntoList < 0)
            return;
        if (fieldSpec.formatter)
        {
            let s = fieldSpec.formatter(fieldSpec.indexIntoList, fieldSpec.scale??1, fieldSpec.format??Format_t.FMT_DP, list);
            insertStr(row, col, fieldSpec.name??'');
            col += fieldSpec.name?.length??0
            insertStr(row, col, s);
        } else {
            insertStr(row, col, fieldSpec.name??'');
            col += fieldSpec.name?.length??0
//       Ptr = &DownlinkListBuffer[FieldSpec->IndexIntoList];
            switch (fieldSpec.format)
	        {
	            case Format_t.FMT_SP:
                    insertStr(row, col, GetSP(list, fieldSpec.indexIntoList, fieldSpec.scale??1).toPrecision(5));
	                break;
                case Format_t.FMT_DP:
                    insertStr(row, col, GetDP(list, fieldSpec.indexIntoList, fieldSpec.scale??1).toPrecision(10));
                    break;
	            case Format_t.FMT_OCT:
                    insertStr(row, col, list[fieldSpec.indexIntoList].toString(8).padStart(5, '0'));
	                break;
                case Format_t.FMT_2OCT:
                    insertStr(row, col, list[fieldSpec.indexIntoList].toString(8).padStart(5, '0') + list[fieldSpec.indexIntoList + 1].toString(8).padStart(5, '0'));
                    break;
                case Format_t.FMT_DEC:
                    insertStr(row, col, (list[fieldSpec.indexIntoList] ^ 0).toString());
                    break;
                case Format_t.FMT_2DEC:
                    insertStr(row, col, (0o100000 * (list[fieldSpec.indexIntoList] ^ 0) + (list[fieldSpec.indexIntoList + 1] ^ 0)).toString());
                    break;
                case Format_t.FMT_USP:
                    insertStr(row, col, GetUSP(list, fieldSpec.indexIntoList, fieldSpec.scale??1).toPrecision(5));
                    break;
                default:
                    console.log(`Unhandled: ${fieldSpec.format}`);
	        }
        }
    }, [state]);

    const PrintDownlinkList = useCallback((spec: DownlinkListSpec_t, list: number[], buffer: string[][]) => {
        // This is a global pointer to a function which can override PrintDownlinkList().
        // The idea is that PrintDownlinkList() is the default processor, and can be
        // used for printing "raw" downlink data, but it can be overridden if the buffered
        // downlink list needs to be processed differently, for example to be printed on 
        // a simulated MSK CRT.
      //   if (ProcessDownlinkList != NULL)
      //     {
      //       (*ProcessDownlinkList) (Spec);
      //     }
      //   else
      //     {
      //       int i;
          // let bfr = (' '.repeat(SWIDTH) + '\n').repeat(SHEIGHT);
          for (let i = 0; i < spec.title.length; i++) buffer[0][i] = spec.title.charAt(i);
          for (let i = 0; i < spec.fieldSpecs.length; i++) {
              PrintField(spec.fieldSpecs[i], list, buffer);
          }
      //       Swrite ();
      //     }
  
      }, [PrintField]);
  
    useEffect(() => {
        if (props.msg) {
            console.log(`Telemetry ${props.msg[0].toString(8)}`)
            let buffer: string[][] = new Array(40);
            for (let i = 0; i < 40; i++) {
                buffer[i] = new Array(80);
                buffer[i].fill(' ');
            }
            switch (props.msg[0])
            {
	            case 0o1776:
	                //DecodeErasableDump (LMdump);
	                break;
	            case 0o1777:
	                //DecodeErasableDump (CMdump);
	                break;
	            case 0o77774:
	                // if (CmOrLm)
	                //     c (DownlinkListSpecs[DL_CM_POWERED_LIST]);
	                // else
	                //     PrintDownlinkList (DownlinkListSpecs[DL_LM_ORBITAL_MANEUVERS]);
            	  break;
	            case 0o77777:
	                // if (CmOrLm)
	                //     PrintDownlinkList (DownlinkListSpecs[DL_CM_COAST_ALIGN]);
	                // else
	                PrintDownlinkList(DownlinkListSpecs[DL_LM_COAST_ALIGN], props.msg, buffer);
	                break;
            	case 0o77775:
	                // if (CmOrLm)
	                //     PrintDownlinkList (DownlinkListSpecs[DL_CM_RENDEZVOUS_PRETHRUST]);
	                // else
	                //     PrintDownlinkList (DownlinkListSpecs[DL_LM_RENDEZVOUS_PRETHRUST]);
	                break;
	            case 0o77773:
	                // if (CmOrLm)
	                //     PrintDownlinkList (DownlinkListSpecs[v]);
	                // else
	                //     PrintDownlinkList (DownlinkListSpecs[DL_LM_DESCENT_ASCENT]);
	                break;
	            case 0o77772:
	                // PrintDownlinkList (DownlinkListSpecs[DL_LM_LUNAR_SURFACE_ALIGN]);
	                break;
	            case 0o77776:
	                // if (CmOrLm)
	                //     PrintDownlinkList (DownlinkListSpecs[DL_CM_ENTRY_UPDATE]);
	                // else
	                //     PrintDownlinkList (DownlinkListSpecs[DL_LM_AGS_INITIALIZATION_UPDATE]);
	                break;
	            default:
	                console.warn("Unknown list type downlinked.");
	                break;
            }
            let lines: string[] = buffer.map((x) => x.join(''));
            setSBuffer(lines.join('\n'));
        }
        return () => {};
    }, [props.msg, PrintDownlinkList]);

    
    return (
        <textarea className="telemetry"
            rows={40}
            cols={80}
            value={sbuffer}
            readOnly={true}
        />
    );
}
