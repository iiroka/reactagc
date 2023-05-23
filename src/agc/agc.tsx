import { acgDecode, ArgcInstr } from './agcinstr'

export class AgcConsts {
    public static readonly REG_A = 0o00
    public static readonly REG_L = 0o01
    public static readonly REG_Q = 0o02
    public static readonly REG_EB = 0o03
    public static readonly REG_FB = 0o04
    public static readonly REG_Z = 0o05
    public static readonly REG_BB = 0o06
    public static readonly REG_ZERO = 0o07
    public static readonly REG_ARUPT = 0o10
    public static readonly REG_LRUPT = 0o11
    public static readonly REG_QRUPT = 0o12
    public static readonly REG_STIME2 = 0o13
    public static readonly REG_STIME1 = 0o14
    public static readonly REG_ZRUPT = 0o15
    public static readonly REG_BBRUPT = 0o16
    public static readonly REG_BRUPT = 0o17
    public static readonly REG_CYR = 0o20
    public static readonly REG_SR = 0o21
    public static readonly REG_CYL = 0o22
    public static readonly REG_EDOP = 0o23
    public static readonly REG_TIME2 = 0o24
    public static readonly REG_TIME1 = 0o25
    public static readonly REG_TIME3 = 0o26
    public static readonly REG_TIME4 = 0o27
    public static readonly REG_TIME5 = 0o30
    public static readonly REG_TIME6 = 0o31
    public static readonly REG_CDUX = 0o32
    public static readonly REG_CDUY = 0o33
    public static readonly REG_CDUZ = 0o34
    public static readonly REG_OPTX = 0o35
    public static readonly REG_OPTY = 0o36
    public static readonly REG_PIPAX = 0o37
    public static readonly REG_PIPAY = 0o40
    public static readonly REG_PIPAZ = 0o41
    public static readonly REG_RHCP = 0o42
    public static readonly REG_RHCY = 0o43
    public static readonly REG_RHCR = 0o44
    public static readonly REG_INLINK = 0o45
    public static readonly REG_RNRAD = 0o46
    public static readonly REG_GYROCMD = 0o47
    public static readonly REG_CDUXCMD = 0o50
    public static readonly REG_CDUYCMD = 0o51
    public static readonly REG_CDUZCMD = 0o52
    public static readonly REG_OPTYCMD = 0o53
    public static readonly REG_OPTXCMD = 0o54
    public static readonly REG_THRUST = 0o55
    public static readonly REG_LEMONM = 0o56
    public static readonly REG_OUTLINK = 0o57
    public static readonly REG_ALTM = 0o60

    public static readonly REG_AMOUNT = 0o61

    public static readonly UNWITCHABLE_ERASABLE_BASE        = 0o0000;
    public static readonly SWITCHABLE_ERASABLE_BASE         = 0o1400;
    public static readonly SWITCHABLE_ERASABLE_BANK_SIZE    = 0o0400;
    public static readonly SWITCHABLE_ERASABLE_BANK_COUNT   = 8;
    public static readonly COMMON_FIXED_BASE                = 0o2000;
    public static readonly COMMON_FIXED_BANK_SIZE           = 0o2000;
    public static readonly COMMON_FIXED_BANK_COUNT          = 40;
    public static readonly FIXED_FIXED_BASE                 = 0o4000;
    
    public static readonly IO_HISCALAR      = 0o0003;
    public static readonly IO_LOSCALAR      = 0o0004;
    public static readonly IO_PYJETS        = 0o0005;
    public static readonly IO_ROLLJETS      = 0o0006;
    public static readonly IO_SUPERBNK      = 0o0007;
    
    public static readonly NUM_IO_CHANNELS = 512;

    // Physical AGC timing was generated from a master 1024 KHz clock, divided by 12.
    // This resulted in a machine cycle of just over 11.7 microseconds.  Note that the
    // constant is unsigned long long.
    public static readonly AGC_PER_SECOND = ((1024000 + 6) / 12);

    public static readonly NUM_INTERRUPT_TYPES = 10;

}

// Some numerical constant, in AGC format. 
const AGC_P0 = 0;
const AGC_M0 = 0o77777;
const AGC_P1 = 1;
const AGC_M1 = 0o77776;


const SCALER_OVERFLOW = 80;
const SCALER_DIVIDER = 3;

const WARNING_FILTER_INCREMENT  =   15000;
const WARNING_FILTER_DECREMENT  =      15;
const WARNING_FILTER_MAX        =  140000;
const WARNING_FILTER_THRESHOLD  =   20000;


function is16Bit(address: number): boolean {
    return (address === AgcConsts.REG_A) || (address === AgcConsts.REG_Q);
}

function signExtend(value: number): number {
    return ((value & 0o77777) | ((value << 1) & 0o100000));
}

function overflowCorrected(value: number): number {
    return ((value & 0o37777) | ((value >> 1) & 0o40000));
}

function addSP16(addend1: number, addend2: number)
{
    let sum = addend1 + addend2;
    if ((sum & 0o200000) !== 0)
    {
        sum += AGC_P1;
        sum &= 0o177777;
    }
    return sum;
}

// Absolute value of an SP value.
function absSP(value: number): number
{
    if (0o40000 & value)
        return (0o77777 & ~value);
    return value;
}


function negateSP(val: number): number
{
    return (0o77777 & ~val);
}

function valueOverflowed(val: number): number
{
    switch (val & 0o140000) {
        case 0o040000:
            return 1;
        case 0o100000:
            return 0o77776;
        default:
            return 0;
    }
}

//-----------------------------------------------------------------------------
// Compute the "diminished absolute value".  The input data and output data
// are both in AGC 1's-complement format.

function dabs (Input: number): number
{
    if (0 !== (0o40000 & Input))
        Input = 0o37777 & ~Input;	// Input was negative, but now is positive.
    if (Input > 1)		// "diminish" it if >1.
        Input--;
    else
        Input = 0;
    return Input;
}

// Same, but for 16-bit registers.
function odabs (Input: number): number
{
    if (0 !== (0o100000 & Input))
        Input = (0o177777 & ~Input);	// Input was negative, but now is positive.
    if (Input > 1)		// "diminish" it if >1.
        Input--;
    else
        Input = 0;
    return Input;
}

//-----------------------------------------------------------------------------
// Convert an AGC-formatted word to CPU-native format. 

function agc2cpu (input: number): number
{
    if (0 !== (0o40000 & input))
        return (-(0o37777 & ~input));
    else
        return (0o37777 & input);
}

//-----------------------------------------------------------------------------
// Convert a native CPU-formatted word to AGC format. If the input value is
// out of range, it is truncated by discarding high-order bits.

function cpu2agc (input: number): number
{
    if (input < 0)
        return (0o77777 & ~(-input));
    else
        return (0o77777 & input);
}


function cpu2agc2 (input: number): number
{
    if (input < 0)
        return (0o3777777777 & ~(0o1777777777 & (-input)));
    else
        return (0o1777777777 & input);
}

//-----------------------------------------------------------------------------
// Double-length versions of the same. 

function agc2cpu2(input: number): number
{
  if (0 !== (0o2000000000 & input))
    return (-(0o1777777777 & ~input));
  else
    return (0o1777777777 & input);
}


//-----------------------------------------------------------------------------
// Here are functions to convert a DP into a more-decent 1's-
// complement format in which there's not an extra sign-bit to contend with.
// (In other words, a 29-bit format in which there's a single sign bit, rather
// than a 30-bit format in which there are two sign bits.)  And vice-versa.
// The DP value consists of two adjacent SP values, MSW first and LSW second,
// and we're given a pointer to the second word.  The main difficulty here
// is dealing with the case when the two SP words don't have the same sign,
// and making sure all of the signs are okay when one or more words are zero.
// A sign-extension is added a la the normal accumulator.

function spToDecent(lsbSP: number[]): number
{
    // int Value, Complement;
    let msb = lsbSP[0];
    let lsb = lsbSP[1];
    if (msb === AGC_P0 || msb === AGC_M0)	// Msb is zero.
    {
        // As far as the case of the sign of +0-0 or -0+0 is concerned,
        // we follow the convention of the DV instruction, in which the
        // overall sign is the sign of the less-significant word.
        let value = signExtend(lsb);
        if (value & 0o100000)
	        value |= ~0o177777;
        return (0o7777777777 & value);	// Eliminate extra sign-ext. bits.
    }
    // If signs of Msb and Lsb words don't match, then make them match.
    if ((0o40000 & lsb) !== (0o40000 & msb))
    {
        if (lsb === AGC_P0 || lsb === AGC_M0)	// Lsb is zero.
	    {
	        // Adjust sign of Lsb to match Msb.
	        if (0 === (0o40000 & msb))
	            lsb = AGC_P0;
	        else
	            lsb = AGC_M0;	// 2005-08-17 RSB.  Was "Msb".  Oops!
	    }
        else			// Lsb is not zero.
	    {
	        // The logic will be easier if the Msb is positive.
	        let complement = (0o40000 & msb) !== 0;
	        if (complement)
	        {
	            msb = (0o77777 & ~msb);
	            lsb = (0o77777 & ~lsb);
	        }
	        // We now have Msb positive non-zero and Lsb negative non-zero.
	        // Subtracting 1 from Msb is equivalent to adding 2**14 (i.e.,
	        // 0100000, accounting for the parity) to Lsb.  An additional 1 
	        // must be added to account for the negative overflow.
	        msb--;
	        lsb = ((lsb + 0o40000 + AGC_P1) & 0o77777);
	        // Restore the signs, if necessary.
	        if (complement)
	        {
	            msb = (0o77777 & ~msb);
	            lsb = (0o77777 & ~lsb);
	        }
	    }
    }
    // We now have an Msb and Lsb of the same sign; therefore,
    // we can simply juxtapose them, discarding the sign bit from the 
    // Lsb.  (And recall that the 0-position is still the parity.)
    let value = (0o3777740000 & (msb << 14)) | (0o37777 & lsb);
    // Also, sign-extend for further arithmetic.
    if (0o2000000000 & value)
        value |= 0o4000000000;
    return (value);
}

function decentToSp (decent: number, lsbSP: number[])
{
    let sign = (decent & 0o44000000000) !== 0;
    lsbSP[1] = (0o37777 & decent);
    if (sign)
        lsbSP[1] |= 0o40000;
    lsbSP[0] = overflowCorrected(0o177777 & (decent >> 14));	// Was 13.
}


export class Agc {

    private m_regs: number[] = new Array(AgcConsts.REG_AMOUNT); 
    private m_ram: number[][];
    private m_rom: number[][];
    private m_inputChannel: number[] = new Array(AgcConsts.NUM_IO_CHANNELS);
    private m_interruptRequests: number[] = new Array(AgcConsts.NUM_INTERRUPT_TYPES + 1);

    private m_initialized?: () => void = undefined;
    private m_substituteInstruction = false;
    private m_indexValue = 0;
    private m_extraCode = false;
    private m_intsEnabled = false;
    private m_inIsr = false;
    private m_downlink = 0;
    private m_downruptTime: bigint = BigInt(0);
    private m_downruptTimeValid = true;
    private m_cycleCounter: bigint = BigInt(0);
    private m_extraDelay = 0;
    private m_pendFlag = false;
    private m_pendDelay = 0;
    private m_scalerCounter = 0;
    private m_generatedWarning = false;
    private m_warningFilter = 0;

    getCycleCounter(): number {
        return Number(BigInt.asIntN(32, this.m_cycleCounter));
    }

    constructor() {
        console.log("** Agc **")
        this.m_regs = new Array(AgcConsts.REG_AMOUNT); 
        this.m_regs.fill(0);
        this.m_regs[AgcConsts.REG_Z] = 0o4000;

        this.m_ram = new Array(AgcConsts.SWITCHABLE_ERASABLE_BANK_COUNT);
        for (let i = 0; i < this.m_ram.length; i++) {
            this.m_ram[i] = new Array(AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE);
            this.m_ram[i].fill(0);
        }
        this.m_rom = new Array(AgcConsts.COMMON_FIXED_BANK_COUNT); 
        for (let i = 0; i < this.m_rom.length; i++) {
            this.m_rom[i] = new Array(AgcConsts.COMMON_FIXED_BANK_SIZE);
            this.m_rom[i].fill(0);
        }

        this.m_inputChannel.fill(0);
        this.m_inputChannel[0o30] = 0o37777;
        this.m_inputChannel[0o31] = 0o77777;
        this.m_inputChannel[0o32] = 0o77777;
        this.m_inputChannel[0o33] = 0o77777;
        this.m_interruptRequests.fill(0);

        this.m_downruptTimeValid = true;
        this.m_downruptTime = BigInt(0);
        this.m_downlink = 0;

        fetch("./luminary099.bin").then((resp) => {
            console.log(`Loaded: ${resp.statusText} ${resp.status}`);
            if (resp.status === 200) {
                resp.arrayBuffer().then((bfr) => {
                    console.log(`Datasize: ${bfr.byteLength}`);
                    this.loadRom(new Uint8Array(bfr));
                    if (this.m_initialized) this.m_initialized()
                });
            }
        });
    }

    public setInitilizedCallback(cb:  () => void) {
        this.m_initialized = cb;
    }

    public keyPressed(key: number) {
        console.log(`keyPressed ${key}`);
        this.m_inputChannel[0o15] = key;
        this.m_interruptRequests[5] = 1;
    }

    private loadRom(bfr: Uint8Array) {
        let counter = 0;
        for (let bank = 0; bank < AgcConsts.COMMON_FIXED_BANK_COUNT; bank++) {
    
            let tgtBank;
            if (bank === 0) tgtBank = 2;
            else if (bank === 1) tgtBank = 3;
            else if (bank === 2) tgtBank = 0;
            else if (bank === 3) tgtBank = 1;
            else tgtBank = bank;
    
            for (let offset = 0; offset < AgcConsts.COMMON_FIXED_BANK_SIZE; offset++, counter += 2) {
                if ((counter + 1) < bfr.byteLength) {
                    this.m_rom[tgtBank][offset] = (bfr[counter + 1] + (bfr[counter] << 8)) >> 1;
                } else {
                    this.m_rom[tgtBank][offset] = 0;
                }
            }
        }
    }

    step(): boolean {

        // For DOWNRUPT
        if (this.m_downruptTimeValid && this.m_cycleCounter >= this.m_downruptTime) {
            this.m_interruptRequests[8] = 1;	// Request DOWNRUPT
            this.m_downruptTimeValid = false;
        }

        this.m_cycleCounter++;

        //----------------------------------------------------------------------
        // Update the thingy that determines when 1/1600 second has passed.
        // 1/1600 is the basic timing used to drive timer registers.  1/1600
        // second happens to be 160/3 machine cycles.

        this.m_scalerCounter += SCALER_DIVIDER;
        // State->DskyTimer += SCALER_DIVIDER;

        //----------------------------------------------------------------------  
        // This stuff takes care of extra CPU cycles used by some instructions.

        // A little extra delay, needed sometimes after branch instructions that
        // don't always take the same amount of time.
        if (this.m_extraDelay > 0) {
            this.m_extraDelay--;
            return false;
        }

        // If an instruction that takes more than one clock-cycle is in progress,
        // we simply return.  We don't do any of the actual computations for such
        // an instruction until the last clock cycle for it is reached.  
        // (Except for a few weird cases dealt with by ExtraDelay as above.) 
        if (this.m_pendFlag && this.m_pendDelay > 0) {
            this.m_pendDelay--;
            return false;
        }

        //----------------------------------------------------------------------
        // Here we take care of counter-timers.  There is a basic 1/3200 second
        // clock that is used to drive the timers.  1/3200 second happens to
        // be SCALER_OVERFLOW/SCALER_DIVIDER machine cycles, and the variable
        // ScalerCounter has already been updated the correct number of 
        // multiples of SCALER_DIVIDER.  Note that incrementing a timer register
        // takes 1 machine cycle.

        // This can only iterate once, but I use 'while' just in case.
        while (this.m_scalerCounter >= SCALER_OVERFLOW)
        {
            this.handleTimers();
            if (this.m_extraDelay) {
                // Return, so as to account for the time occupied by updating the
                // counters and/or GOJAM.
                this.m_extraDelay--;
                return false;
            }
        }


        const addr = this.m_regs[AgcConsts.REG_Z];
        const cmd = this.readMem(addr) & 0x7FFF;
    
        let modCmd = 0;
        if (this.m_substituteInstruction)
            modCmd = this.m_regs[AgcConsts.REG_BRUPT];
        else
            modCmd = overflowCorrected(addSP16(signExtend(this.m_indexValue), signExtend(cmd)));
        modCmd &= 0o77777;
    
        const r = acgDecode(modCmd, this.m_extraCode);
    
        const overflow = (valueOverflowed(this.m_regs[AgcConsts.REG_A]) !== 0);

        // Handle interrupts.
        if ((this.m_intsEnabled && !this.m_pendFlag && !this.m_inIsr && !this.m_extraCode && !overflow && 
             modCmd !== 3 && modCmd !== 4 && modCmd !== 6 && this.m_indexValue === 0) || r.instr === `EDRUPT`) {

            let interruptRequested = false;

            // Interrupt vectors are ordered by their priority, with the lowest
            // address corresponding to the highest priority interrupt. Thus,
            // we can simply search through them in order for the next pending
            // request. There's two extra MCTs associated with taking an
            // interrupt -- one each for filling ZRUPT and BRUPT.
            // Search for the next interrupt request.
            for (let i = 1; i <= AgcConsts.NUM_INTERRUPT_TYPES; i++)
            {
                if (this.m_interruptRequests[i] /* && DebuggerInterruptMasks[i] */)
                {
                    // Clear the interrupt request.
                    this.m_interruptRequests[i] = 0;
                    this.m_interruptRequests[0] = i;
    
                    console.log(`IRQ ${i}`);
                    this.writeMem(AgcConsts.REG_Z, 0o4000 + 4 * i);
    
                    interruptRequested = true;
                    break;
                }
            }
    
            if (!interruptRequested && r.instr === `EDRUPT`) {
                console.log(`EDRUPT`);
                interruptRequested = true;
                this.writeMem(AgcConsts.REG_Z, 0);
            }
    
            if (interruptRequested)
            {
                // BacktraceAdd (State, i);
                // Set up the return stuff.
                this.writeMem(AgcConsts.REG_ZRUPT, addr + 1);
                this.writeMem(AgcConsts.REG_BRUPT, modCmd);
                // Clear various metadata. Extracode is cleared (this can only
                // really happen with EDRUPT), and the index value and substituted
                // instruction were both applied earlier and their effects were
                // saved in BRUPT.
                this.m_extraCode = false;
                this.m_indexValue = 0;
                this.m_substituteInstruction = false;
                // Vector to the interrupt.
                this.m_inIsr = true;
                this.m_extraDelay++;
                // goto AllDone;
                return true;
            }
    
        }
    
        // Add delay for multi-MCT instructions.  Works for all instructions 
        // except EDRUPT, BZF, and BZMF.  For BZF and BZMF, an extra cycle is added
        // AFTER executing the instruction -- not because it's more logically
        // correct, just because it's easier. EDRUPT's timing is handled with
        // the interrupt logic.
        if (!this.m_pendFlag) {
            if (r.count > 1) {
                this.m_pendFlag = true;
                this.m_pendDelay = r.count - 2;
                return false;
            } else 
            this.m_pendFlag = false;
        } else 
            this.m_pendFlag = false;

        this.m_indexValue = 0;

        this.m_regs[AgcConsts.REG_Z] += 1

        const imm12 = modCmd & 0xFFF;
        const imm10 = modCmd & 0x3FF;
        const imm9 = modCmd & 0x1FF;
    
        this.m_extraCode = false;
        this.m_substituteInstruction = false;

        switch (r.instr) {
            // The "Transfer Control" (or "Transfer Control setting up a Return") instruction calls a subroutine, first preparing for a later return to the instruction following the TC instruction.
            //
            // 1 MCT (about 11.7 µs)
            // The Overflow is not affected.  The Extracode flag is clear after the instruction.  The Q register is set up with the address following the instruction.
            case `TC`:

            // The "Execute Using L and Q" instruction is another name for "TC L".
            //
            // 1 MCT (about 11.7 µs)
            // The Overflow is not affected.  The Extracode flag is not affected (but is clear).  The Q register is set up with the address following the instruction (but see the notes).
            case `XLQ`:

            // The "Execute Extracode Using A, L, and Q" instruction is another name for "TC A".
            // The Overflow is not affected.  The Extracode flag is not affected (but is clear).  The Q register is set up with the address following the instruction (but see the notes).
            case `XXALQ`:

                this.m_regs[AgcConsts.REG_Q] = this.m_regs[AgcConsts.REG_Z] & 0o177777;
                this.m_regs[AgcConsts.REG_Z] = imm12;
                break;

            // The "Return from Subroutine" instruction.
            //
            // 2 MCT (about 23.4 µs) ???
            // The Overflow is not affected.  The Extracode flag is not affected (but is clear).  The Q register is loaded with 00003 (octal).
            case `RETURN`:
                this.m_regs[AgcConsts.REG_Z] = 2;
                break;

            // Release Interrupts.
            //
            // 1 MCT (about 11.7 µs)
            case `RELINT`:
                this.m_intsEnabled = true;
                break;

            // Disable Interrupts.
            //
            // 1 MCT (about 11.7 µs)
            case `INHINT`:
                this.m_intsEnabled = false;
                break;

            // Set the Extracode flag, so that the next instruction encountered is taken from the "extracode" instruction set rather than from the "basic" instruction set.
            //
            // 1 MCT (about 11.7 µs)
            case `EXTEND`:
                this.m_extraCode = true;
                break;

            // The "Count, Compare, and Skip" instruction stores a variable from erasable memory into the accumulator (which is decremented), 
            // and then performs one of several jumps based on the original value of the variable.  This is the only "compare" instruction in the AGC instruction set.
            //
            // 2 MCT (about 23.4 µs)
            // The operation of this instruction is rather complex:
            //   1. The "Diminished ABSolute value" of the contents of memory-location K is loaded into the A register.
            //      The diminished absolute value is defined as DABS(x)=|x|-1 if |x|>1, or +0 otherwise. 
            //      (If K is a 16-bit register like A, L, or Q, then its contents may contain + or - overflow; overflow correction is not performed prior to the operation.)
            //   2. After computing  the contents of the accumulator, the contents of K is "edited", if K is one of the registers CYR, SR, CYL, or EDOP, 
            //      but is otherwise unchanged from its original value. 
            //   3. A jump is performed, depending on the original (unedited) contents of K: If greater than +0 or positive overflow exists,
            //      execution continues at the next instruction after the CCS.  If equal to +0, execution continues at the 2nd instruction after the CCS.
            //      If less than -0 or negative overflow exists, execution continues at the 3rd instruction after the CCS.  If equal to -0, execution continues at the 4th instruction after the CCS.   (If K is 16 bits, then the original contents may contain + or - overflow; in this case, the value is treated as + or - non-zero, even if the sign-corrected value would have been 0.)
            //
            // A typical use of this instruction would be for loop control, with "CCS A".
            //
            // Note that the net effect of the way overflow is treated when K is A, L, or Q is to allow 16-bit loop counters rather than mere 15-bit loop counters.
            // For example, if A contains +1 with +overflow, then CCS A will place +0 with +overflow into A, and another CCS A will place 037777 without overflow into A,
            // and thus no anomaly is seen when decrementing from +overflow to no overflow. If K has negative overflow going into CCS, the absolute value operation will
            // change it into positive overflow. All overflow conditions are taken into account before this operation; thus, if a given K has negative overflow,
            // the negative branch of CCS is taken.
            case `CCS`: {
                let valK: number = 0;
                let op: number = 0;
                // Figure out where the data is stored, and fetch it.
                if (is16Bit(imm10)) {
                    valK = this.readMem(imm10) & 0o177777;
                    op = overflowCorrected(valK);
                    this.writeMem(AgcConsts.REG_A, odabs(valK));
                } else {			// K!=accumulator.
                    op = this.readMem(imm10) & 0o77777;
                    // Compute the "diminished absolute value", and save in accumulator.
                    this.writeMem(AgcConsts.REG_A, dabs(op));
                    // Assign back the read data in case editing is needed
                    this.writeMem(imm10, op);
                }
                // Now perform the actual comparison and jump on the basis
                // of it.  There's no explanation I can find as to what
                // happens if we're already at the end of the memory bank,
                // so I'll just pretend that that can't happen.  Note, 
                // by the way, that if the Operand is > +0, then NextZ
                // is already correct, and in the other cases we need to
                // increment it by 2 less because NextZ has already been 
                // incremented.
                if (is16Bit(imm10) && valueOverflowed(valK) === 1) {
                } else if (is16Bit(imm10) && valueOverflowed(valK) === 0o77776)
                    this.m_regs[AgcConsts.REG_Z] += 2;
                else if (op === 0)
                    this.m_regs[AgcConsts.REG_Z] += 1;
                else if (op === AGC_M0)
                    this.m_regs[AgcConsts.REG_Z] += 3;
                else if (0 !== (op & 0o40000))
                    this.m_regs[AgcConsts.REG_Z] += 2;
                break;
            }

            // The "Transfer Control to Fixed" instruction jumps to a memory location in fixed (as opposed to erasable) memory.
            //
            // 1 MCT (about 11.7 µs)
            // This instruction does not set up a later return.  Use the TC instruction instead for that.
            case `TCF`:
                this.m_regs[AgcConsts.REG_Z] = imm12;
                break;

            // The "Double Add to Storage" instruction does a double-precision (DP) add of the A,L register pair to a pair of variables in erasable memory.
            //
            // 3 MCT (about 35.1 µs)
            // A variant on this instruction is the case "DAS A"  Refer to the DDOUBL instruction for an explanation of this case.
            //
            // Prior to the instruction, the A,L register pair and the K,K+1 pair each contain a double precision (DP) value, with the more-significant word first and the less-significant word second.
            // The signs of the contents of A and L need not agree, nor need the signs of K and K+1.  (See above.)
            // 
            // 16-bit values (the A, L, and Q registers) are not overflow-corrected prior to the addition. The words of the sum are overflow-corrected when saved to 15-bit registers but not when 
            // saved to 16-bit registers. 
            // 
            // The two DP values are added together, and the result is stored back in the K,K+1 pair.  The signs of the resulting words need not agree; the sign of the less significant word is 
            // the same as the sign from an SP addition of the less-significant words.  Any overflow or underflow from addition of the less-significant words rolls over into the addition of the more-significant words.
            // 
            // If either of K or K+1 are editing registers (CYR, SR, CYL, or EDOP), then the appropriate editing occurs when K,K+1 are written.
            // 
            // Note that the normal result of AGC arithmetic such as (+1)+(-1) is -0.
            // 
            // After the addition, the L register is set to +0, and the A register is set to +1, -1, or +0, depending on whether there had been positive overflow, negative overflow, or no overflow during the addition.
            case `DAS`: {
                // We add the less-significant words (as SP values), and thus
                // the sign of the lower word of the output does not necessarily
                // match the sign of the upper word.
                let msw = 0, lsw = 0;
                if (imm10 === AgcConsts.REG_L) { // DDOUBL
                    let valL = this.readMem(AgcConsts.REG_L);
                    let valA = this.readMem(AgcConsts.REG_A);
                    lsw = addSP16(0o177777 & valL, 0o177777 & valL);
                    msw = addSP16(valA, valA);
                    if ((0o140000 & lsw) === 0o040000)
                        msw = addSP16(msw, AGC_P1);
                    else if ((0o140000 & lsw) === 0o100000)
                        msw = addSP16(msw, signExtend(AGC_M1));
                    lsw = overflowCorrected(lsw);
                    this.writeMem(AgcConsts.REG_A, 0o177777 & msw);
                    this.writeMem(AgcConsts.REG_L, 0o177777 & signExtend(lsw));
                } else {
                    let valL = this.readMem(AgcConsts.REG_L);
                    let valA = this.readMem(AgcConsts.REG_A);
                    let valK = this.readMem(imm10);
                    // WhereWord = FindMemoryWord (State, Address10);
                    if (is16Bit(imm10)) {
                        lsw = addSP16(0o177777 & valL, 0o177777 & valK);
                    } else {
                        lsw = addSP16(0o177777 & valL, signExtend(valK));
                    }
                    let valK1 = this.readMem(imm10-1);
                    if (is16Bit(imm10-1)) {
                        msw = addSP16(valA, 0o177777 & valK1);
                    } else {
                        msw = addSP16(valA, signExtend(valK1));
                    }

                    if ((0o140000 & lsw) === 0o040000)
                        msw = addSP16(msw, AGC_P1);
                    else if ((0o140000 & lsw) === 0o100000)
                        msw = addSP16(msw, signExtend (AGC_M1));
                    lsw = overflowCorrected(lsw);

                    if ((0o140000 & msw) === 0o100000)
                        this.writeMem(AgcConsts.REG_A, signExtend(AGC_M1));
                    else if ((0o140000 & msw) === 0o040000)
                        this.writeMem(AgcConsts.REG_A, AGC_P1);
                    else
                        this.writeMem(AgcConsts.REG_A, AGC_P0);
                    this.writeMem(AgcConsts.REG_L, AGC_P0);
                    // Save the results.
                    if (is16Bit(imm10))
                        this.writeMem(imm10, signExtend(lsw));
                    else
                        this.writeMem(imm10, lsw);
                    if (is16Bit(imm10-1))
                        this.writeMem(imm10-1, msw);
                    else
                        this.writeMem(imm10-1, overflowCorrected(msw));
                }
                break;
            }

            // The "Exchange L and K" instruction exchanges the value in the L register with a value stored in erasable memory.
            //
            // 2 MCT (about 23.4 µs)
            // If K is the accumulator or the Q register, then the values will be the full 16 bits of the sources.  
            // Otherwise, source data from 15-bit locations will be sign-extended to 16 bits prior to storage in L, 
            // and the data from L will be overflow-corrected to 15 bits prior to storage in K.
            case `LXCH`:
                if (imm10 === AgcConsts.REG_L) { // Hmmm...
                } else if (imm10 === AgcConsts.REG_ZERO) { //ZL
                    this.writeMem(AgcConsts.REG_L, 0);
                } else if (is16Bit(imm10)) {
                    let valL = this.readMem(AgcConsts.REG_L);
                    let valK = this.readMem(imm10);
                    this.writeMem(AgcConsts.REG_L, overflowCorrected(valK));
                    this.writeMem(imm10, signExtend(valL));
                } else {
                    let valL = this.readMem(AgcConsts.REG_L);
                    let valK = this.readMem(imm10);
                    this.writeMem(AgcConsts.REG_L, valK);
                    this.writeMem(imm10, valL);
                }
                break;

            // The "Increment" instruction increments an erasable-memory location in-place by +1.
            //
            // 2 MCT (about 23.4 µs)
            // If K is a 16-bit register like A, L, or Q, then non-overflow-corrected value is incremented.  
            // In other words, in A, L, or Q, one can increment 0, 1, ..., 037777, 040000 (with + overflow), 040001 (with + overflow), .... 077777 (with + overflow).  
            // For 15-bit registers, one can only increment as high as 037777.
            //
            // If K is one of the counter registers which triggers an interrupt upon overflow, then an oveflow caused by INCR will trigger the interrupt also.
            // These registers include TIME3-TIME6.  Furthermore, if K is the TIME1 counter and the INCR causes an overflow, the TIME2 counter will be incremented.
            // Some of the counter registers such as CDUX-CDUZ are formatted in 2's-complement format, but the INCR instruction is insensitive to this distinction
            // and always uses normal 1's-complement arithmetic.
            case `INCR`:
                if (is16Bit(imm12)) {
                    this.writeMem(imm12, addSP16(1, this.readMem(imm12)));
                } else {
                    this.writeMem(imm12, overflowCorrected(addSP16(1, signExtend(this.readMem(imm12)))));
                    // InterruptRequests (State, Address10, Sum);
                }
                break;

            // The "Add to Storage" instruction adds the accumulator to an erasable-memory location (and vice-versa).
            //
            // 2 MCT (about 23.4 µs)
            // The contents of the accumulator and K are added together, and the result is stored both in the accumulator and in K.
            // The accumulator is neither overflow-corrected prior to the addition nor after it.  However, the sum is overflow-corrected prior to being saved at K if K is a 15-bit register.
            // If K is a 16-bit register like L or Q, then the sum is not overflow corrected before storage.
            //
            // Note that the normal result of AGC arithmetic such as (+1)+(-1) is -0.
            //
            // If the destination register is 16-bits (L or Q register), then the non-overflow-corrected values added.
            case `ADS`: {
                let acc = this.readMem(AgcConsts.REG_A);
                if (imm10 === AgcConsts.REG_A) {
                    acc = addSP16(acc, acc);
                } else if (is16Bit(imm10)) {
                    acc = addSP16(acc, 0o177777 & this.readMem(imm10));
                } else {
                    acc = addSP16(acc, signExtend(this.readMem(imm10)));
                }
                this.writeMem(AgcConsts.REG_A, acc);
                if (imm10 === AgcConsts.REG_A) {
                } else if (is16Bit(imm10)) {
                    this.writeMem(imm10, acc);
                } else {
                    this.writeMem(imm10, overflowCorrected(acc));
                }
                break;
            }

            // The "Clear and Add" (or "Clear and Add Erasable" or "Clear and Add Fixed") instruction moves the contents of a memory location into the accumulator.
            //
            // 2 MCT (about 23.4 µs)
            // Flags: The Overflow is cleared, unless K is the accumulator or the Q register.  The Extracode flag remains clear. 
            // A side-effect of this instruction is that K is rewritten after its value is written to the accumulator; this means that if K is CYR, SR, CYL, or EDOP, 
            // then it is re-edited. 
            //
            // Note that if the source register contains 16-bits (like the L or Q register), then all 16 bits will be transferred to the accumulator, 
            // and thus the overflow will be transferred into A.  On the other hand, if the source register is 15 bits, then it will be sign-extended 
            // to 16 bits when placed in A.
            //
            // For the special case "CA A", refer instead to the NOOP instruction.
            case `CA`:
                if (imm12 === AgcConsts.REG_A) { // NOOP
                } else if (is16Bit(imm12)) {
                    this.m_regs[AgcConsts.REG_A] = this.readMem(imm12);
                } else {
                    const val = this.readMem(imm12);
                    this.m_regs[AgcConsts.REG_A] = signExtend(val);
                    this.writeMem(imm12, val);
                }
                break;

            // The "Clear and Subtract" instruction moves the 1's-complement (i.e., the negative) of a memory location into the accumulator.
            //
            // A side-effect of this instruction is that K is rewritten with its original value after the accumulator is written; this means that if 
            // K is CYR, SR, CYL, or EDOP, then it is re-edited.
            //
            // Note that if the source register contains 16 bits (the A or Q register), then all 16 bits will be complemented and transferred to the accumulator,
            // and thus the overflow in the source register will be inverted and transferred into A.  (For example, +overflow in Q will turn into -overflow in A.)
            // On the other hand, if the source register is 15 bits, then it will be complemented and sign-extended to 16 bits when placed in A.
            //
            // For the special case "CS A", refer instead to the COM instruction.
            case `CS`:
                if (imm12 === AgcConsts.REG_A) {
                    // The "Complement the Contents of A" bitwise complements the accumulator
                    let acc = this.readMem(AgcConsts.REG_A);
                    this.writeMem(AgcConsts.REG_A, ~acc);
                } else {
                    let val = this.readMem(imm12);
                    this.writeMem(AgcConsts.REG_A, signExtend(negateSP(val)));
                    this.writeMem(imm12, val);
                }
                break;

            // The "Index Next Instruction" instruction causes the next instruction to be executed in a modified way from its actual representation in memory.
            case `INDEX`:
                if (imm10 === 0o17) {
                    // RESUME
                    this.writeMem(AgcConsts.REG_Z, this.readMem(AgcConsts.REG_ZRUPT) - 1);
                    this.m_inIsr = false;
                    this.m_substituteInstruction = true;
                } else if (is16Bit(imm10)) {
                    this.m_indexValue = overflowCorrected(this.readMem(imm10));
                } else {
                    this.m_indexValue = this.readMem(imm10);
                }
                break;

            // The "Double Exchange" instruction exchanges the double-precision (DP) value in the register-pair A,L with a value stored in the erasable memory variable pair K,K+1.
            //
            // The accumulator is stored at address K, while the value in K is stored into the accumulator.  The value from the L register is stored into K+1, 
            // and vice-versa.  If K or K+1 is an editing register (CYR, SR, CYL, EDOP), then the value from the A or L register is edited whilst being stored into 
            // K or K+1.
            //
            // If K is Q, then the full 16-bit values of A and Q are exchanged.  Otherwise, A is overflow-corrected before being stored in K, and K is sign-extended 
            // when placed in A.
            //
            // In the case of the "DXCH L" instruction (in which the source and destination ranges overlap, Q  (full 16 bits, including overflow) goes into A, A
            // goes into L, and L goes into Q.
            //
            // Note:  The final contents of the L register will be overflow-corrected.
            case `DXCH`:
                // DTCF, DTCB
                if (imm10 === AgcConsts.REG_L) {

                } else {
                    if (is16Bit(imm10)) {
                        let val = this.readMem(imm10);
                        this.writeMem(imm10, signExtend(this.readMem(AgcConsts.REG_L)));
                        this.writeMem(AgcConsts.REG_L, overflowCorrected(val));
                    } else {
                        let val = this.readMem(imm10);
                        this.writeMem(imm10, this.readMem(AgcConsts.REG_L));
                        this.writeMem(AgcConsts.REG_L, val);
                    }
                    if (is16Bit(imm10-1)) {
                        let val = this.readMem(imm10-1);
                        this.writeMem(imm10-1, this.readMem(AgcConsts.REG_A));
                        this.writeMem(AgcConsts.REG_A, val);
                    } else {
                        let val = this.readMem(imm10-1);
                        this.writeMem(imm10-1, overflowCorrected(this.readMem(AgcConsts.REG_A)));
                        this.writeMem(AgcConsts.REG_A, signExtend(val));
                    }
                }
                break;

            // The "Transfer to Storage" instruction copies the accumulator into memory ... and so much more.
            //
            // The special case "TS A" acts somewhat differently; refer to the OVSK instruction instead.
            //
            // The value of the accumulator (overflow-corrected if K is not the 16-bit L or Q register) is copied into K, at the same time being edited if K is CYR, SR, CYL, or EDOP.
            //
            // The action of the TS instruction differs, depending on whether or not the accumulator had originally contained overflow:
            //   If the contents of the accumulator contained overflow, then load the accumulator with +1 or -1, depending on whether the overflow had been positive or negative, 
            //   respectively.  Also, skip over the next instruction.  (In other words, the program counter is incremented by 2 rather than by the normal 1.)
            //   If, on the other hand, the contents of the accumulator had no overflow, retain the contents of the accumulator unchanged and continue to the next instruction.
            case `TS`: {
                let acc = this.readMem(AgcConsts.REG_A);
                let overflow = valueOverflowed(acc) !== 0;
                if (imm10 === AgcConsts.REG_A) {
                    // OVSK
                    // The "Overflow Skip" instruction skips the next instruction if the accumulator contains overflow.
                    if (overflow)
                        this.m_regs[AgcConsts.REG_Z] += 1;
                } else if (imm10 === AgcConsts.REG_Z)	{
                    // TCAA
                    // "Transfer Control to Address in A"
                    this.m_regs[AgcConsts.REG_Z] = acc & 0o77777;
                    if (overflow)
                        this.writeMem(AgcConsts.REG_A, signExtend(valueOverflowed(acc)));
                } else {	// Not OVSK or TCAA.
                    if (is16Bit(imm10)) {
                        this.writeMem(imm10, acc);
                    } else {
                        this.writeMem(imm10, overflowCorrected(acc));
                    }
                    if (overflow) {
                        this.writeMem(AgcConsts.REG_A, signExtend(valueOverflowed(acc)));
                        this.m_regs[AgcConsts.REG_Z] += 1;
                    }
                }
                break;
            }

            // The "Exchange A and K" instruction exchanges the value in the A register with a value stored in erasable memory.
            //
            // The accumulator is stored at address K, while the value in K is stored into the accumulator.  If K is the 16-bit L or Q register (or the 16-bit A register), 
            // then the full contents of the registers (including overflow) are exchanged; otherwise, the value of A is overflow-corrected before being stored in K, 
            // and the value of K is sign-extended to 16 bits before being stored in A.  If K is an editing register (CYR, SR, CYL, EDOP), 
            // then the value from the accumulator is edited whilst being stored into K.
            case `XCH`:
                if (imm10 === AgcConsts.REG_A) break; // Hmmm...
                if (is16Bit(imm10)) {
                    const valA = this.m_regs[AgcConsts.REG_A];
                    this.m_regs[AgcConsts.REG_A] = this.readMem(imm10);
                    this.writeMem(imm10, valA);
                } else {
                    const valA = this.m_regs[AgcConsts.REG_A];
                    this.m_regs[AgcConsts.REG_A] = signExtend(this.readMem(imm10));
                    this.writeMem(imm10, overflowCorrected(valA));
                }
                break;

            // The "Add" instruction adds the contents of a memory location into the accumulator.
            //
            // The accumulator is not overflow-corrected prior to the addition.
            // The contents of K are added to the accumulator, which retains any overflow that resulted from the addition.
            //
            // A side-effect of this instruction is that K is rewritten after its value is written to the accumulator; this means that if K is CYR, SR, CYL, or EDOP, then it is re-edited.
            //
            // Note that the normal result of AGC arithmetic such as (+1)+(-1) is -0.
            //
            // For the special case "AD A", refer instead to the DOUBLE instruction.
            case `AD`: {
                let acc = this.readMem(AgcConsts.REG_A);
                if (imm12 === AgcConsts.REG_A) { // DOUBLE
                    // The "Double the Contents of A" instruction adds the accumulator to itself.
                    acc = addSP16(acc, acc);
                } else if (is16Bit(imm12)) {
                    acc = addSP16(acc, this.readMem(imm12) & 0o177777);
                } else {
                    let val = this.readMem(imm12);
                    acc = addSP16(acc, signExtend(val));
                    this.writeMem(imm12, val);
                }
                this.writeMem(AgcConsts.REG_A, acc);
                break;
            }
            
            // The "Mask A by K" instruction logically ANDs the contents of a memory location bitwise into the accumulator.
            //
            // If K is a 16-bit register (L or Q), then the full 16 bits of K and A are logically anded and stored in the accumulator.
            // Otherwise, the source register is 15 bits, and the accumulator is overflow-adjusted prior to the operation.
            // The contents of K (which remains unchanged) are then logically ANDed bitwise to the accumulator, and sign-extended to 16 bits for storage in the accumulator.
            case `MASK`:
                if (is16Bit(imm12)) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_A) & this.readMem(imm12));
                } else {
                    let acc = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    let val = this.readMem(imm12);
                    this.writeMem(AgcConsts.REG_A, signExtend(acc & val));
                }
                break;

            // The "Read Channel KC" instruction moves the contents of an i/o channel into the accumulator.
            //
            // If the source is the 16-bit Q register, then the full 16-bit value is moved into A.  Otherwise, the 15-bit source is sign-extended to 16 bits before storage in A.
            case `READ`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_Q));
                } else {
                    this.writeMem(AgcConsts.REG_A, signExtend(this.readIO(imm9)));
                }
                break;

            // WRITE
            case `WRITE`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_Q, this.readMem(AgcConsts.REG_A));
                } else {
                    this.writeIO(imm9, overflowCorrected(this.readMem(AgcConsts.REG_A)));
                }
                break;

            // The "Read and Mask" instruction logically bitwise ANDs the contents of an i/o channel into the accumulator.
            //
            // If the source is the 16-bit Q register, then the full 16-bit value is logically ANDed with A.
            // Otherwise, the 15-bit source is logically ANDed with the overflow-corrected accumulator, and the result is sign-extended to 16 bits before storage in A.
            case `RAND`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_A) & this.readMem(AgcConsts.REG_Q));
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    op &= this.readIO(imm9);
                    this.writeMem(AgcConsts.REG_A, signExtend(op));
                }
                break;

            // The "Write and Mask" instruction bitwise logically-ANDs the contents of the accumulator into an i/o channel, and vice-versa.
            //
            // The bitwise logical-AND of the accumulator and the i/o channel is copied into both the accumulator and the i/o channel.
            //
            // If the destination is the 16-bit Q register, then the full 16-bit value is logically ANDed with A and stored at both A and K.
            // Otherwise, the 15-bit destination is logically ANDed with the overflow-corrected accumulator and stored to K, and the result is sign-extended to 16 bits before storage in A.
            case `WAND`:
                if (imm9 === AgcConsts.REG_Q) {
                    let val = this.readMem(AgcConsts.REG_A) & this.readMem(AgcConsts.REG_Q);
                    this.writeMem(AgcConsts.REG_A, val);
                    this.writeMem(AgcConsts.REG_Q, val);
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    op &= this.readIO(imm9);
                    this.writeIO(imm9, op);
                    this.writeMem(AgcConsts.REG_A, signExtend(op));
                }
                break;

            // The "Read and Superimpose" instruction logically bitwise ORs the contents of an i/o channel into the accumulator.
            //
            // If the source is the 16-bit Q register, then the full 16-bit value is logically ORed with A.
            // Otherwise, the 15-bit source is logically ORed with the overflow-corrected accumulator, and the result is sign-extended to 16 bits before storage in A.
            case `ROR`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_A) | this.readMem(AgcConsts.REG_Q));
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    op |= this.readIO(imm9);
                    this.writeMem(AgcConsts.REG_A, signExtend(op));
                }
                break;
            
            // The "Write and Superimpose" instruction bitwise logically-ORs the contents of the accumulator into an i/o channel, and vice-versa.
            //
            // 2 MCT (about 23.4 µs)
            // The bitwise logical-OR of the accumulator and the i/o channel is copied into both the accumulator and the i/o channel.
            //
            // If the destination is the 16-bit Q register, then the full 16-bit value is logically ORed with A and stored at both A and K.
            // Otherwise, the 15-bit destination is logically ANDed with the overflow-corrected accumulator and stored to K, and the result is sign-extended to 16 bits before storage in A.
            case `WOR`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_A) | this.readMem(AgcConsts.REG_Q));
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    op |= this.readIO(imm9);
                    this.writeIO(imm9, op);
                    this.writeMem(AgcConsts.REG_A, signExtend(op));
                }
                break;

            // The "Read and Invert" instruction logically bitwise exclusive-ORs the contents of an i/o channel into the accumulator.
            //
            // 2 MCT (about 23.4 µs)
            case `RXOR`:
                if (imm9 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, this.readMem(AgcConsts.REG_A) ^ this.readMem(AgcConsts.REG_Q));
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_A));
                    op ^= this.readIO(imm9);
                    this.writeMem(AgcConsts.REG_A, signExtend(op));
                }
                break;

            // EDRUPT

            // The "Divide" instruction performs a division, giving a remainder and a quotient.
            //
            // 6 MCT (about 70.2 µs)
            case `DV`: {
                // uint16_t accPair[2], AbsK, div16;
                // int Dividend, Divisor, Quotient, Remainder;

                let acc = this.readMem(AgcConsts.REG_A);
                let accPair = [0, 0];
                accPair[0] = overflowCorrected(acc);
                accPair[1] = this.readMem(AgcConsts.REG_L);
                let dividend = spToDecent(accPair);
                decentToSp(dividend, accPair);
                // Check boundary conditions.
                let absA = absSP(accPair[0]);
                let absL = absSP(accPair[1]);

                let div16 = 0;
                if (imm10 === AgcConsts.REG_A) {
                    // DV modifies A before reading the divisor, so in this
                    // case the divisor is -|A|.
                    div16 = this.readMem(AgcConsts.REG_A);
                    if ((this.readMem(AgcConsts.REG_A) & 0o100000) === 0)
                        div16 = 0o177777 & ~div16;
                } else if (imm10 === AgcConsts.REG_L) {
                    // DV modifies L before reading the divisor. L is first
                    // negated if the quotient A,L is negative according to
                    // DV sign rules. Then, 40000 is added to it.
                    div16 = this.readMem(AgcConsts.REG_L);
                    if (((absA === 0) && (0o100000 & this.readMem(AgcConsts.REG_L))) || ((absA !== 0) && (0o100000 & this.readMem(AgcConsts.REG_A))))
                        div16 = 0o177777 & ~div16;
                    // Make sure to account for L's built-in overflow correction
                    div16 = signExtend(overflowCorrected(addSP16(div16, 0o40000)));
                } else if (imm10 === AgcConsts.REG_Z) {
                    // DV modifies Z before reading the divisor. If the
                    // quotient A,L is negative according to DV sign rules,
                    // Z16 is set.
                    div16 = this.readMem(AgcConsts.REG_Z);
                    if (((absA === 0) && (0o100000 & this.readMem(AgcConsts.REG_L))) || ((absA !== 0) && (0o100000 & this.readMem(AgcConsts.REG_A))))
                        div16 |= 0o100000;
                } else if (is16Bit(imm10))
                    div16 = this.readMem(imm10);
                else
                    div16 = signExtend(this.readMem(imm10));

                // Fetch the values;
                let absK = absSP(overflowCorrected(div16));
                if (absA > absK || (absA === absK && absL !== AGC_P0) || valueOverflowed(div16) !== AGC_P0) {
                    // The divisor is smaller than the dividend, or the divisor has
                    // overflow. In both cases, we fall back on a slower simulation
                    // of the hardware registers, which will produce "total nonsense"
                    // (that nonetheless will match what the actual AGC would have gotten).
                    this.simulateDV(div16);

                } else if (absA === 0 && absL === 0) {

                    let op16 = 0;
                    // The dividend is 0 but the divisor is not. The standard DV sign
                    // convention applies to A, and L remains unchanged.
                    if ((0o40000 & this.readMem(AgcConsts.REG_L)) === (0o40000 & overflowCorrected(div16)))
                    {
                        if (absK === 0) op16 = 0o37777;	// Max positive value.
                        else op16 = AGC_P0;
                    }
                    else
                    {
                    if (absK === 0) op16 = (0o77777 & ~0o37777);	// Max negative value.
                    else op16 = AGC_M0;
                    }

                    this.writeMem(AgcConsts.REG_A, signExtend(op16));

                } else if (absA === absK && absL === AGC_P0) {

                    let op16 = 0;
                    // The divisor is equal to the dividend.
                    if (accPair[0] === overflowCorrected(div16))// Signs agree?
                    {
                        op16 = 0o37777;	// Max positive value.
                    }
                    else
                    {
                        op16 = (0o77777 & ~0o37777);	// Max negative value.
                    }
                    this.writeMem(AgcConsts.REG_L, signExtend(accPair[0]));
                    this.writeMem(AgcConsts.REG_A, signExtend(op16));
                } else {
                    // The divisor is larger than the dividend.  Okay to actually divide!
                    // Fortunately, the sign conventions agree with those of the normal
                    // C operators / and %, so all we need to do is to convert the
                    // 1's-complement values to native CPU format to do the division,
                    // and then convert back afterward.  Incidentally, we know we
                    // aren't dividing by zero, since we know that the divisor is
                    // greater (in magnitude) than the dividend.
                    dividend = agc2cpu2(dividend);
                    let divisor = agc2cpu(overflowCorrected(div16));
                    let quotient = dividend / divisor;
                    let remainder = dividend % divisor;
                    this.writeMem(AgcConsts.REG_A, signExtend(cpu2agc(quotient)));
                    if (remainder === 0) {
                        // In this case, we need to make an extra effort, because we
                        // might need -0 rather than +0.
                        if (dividend >= 0)
                            this.writeMem(AgcConsts.REG_L, AGC_P0);
                        else
                            this.writeMem(AgcConsts.REG_L, signExtend(AGC_M0));
                    } else
                        this.writeMem(AgcConsts.REG_L, signExtend(cpu2agc(remainder)));
                }
                break;
            }

            // The "Branch Zero to Fixed" instruction jumps to a memory location in fixed (as opposed to erasable) memory if the accumulator is zero.
            //
            // If the accumulator is non-zero, then control proceeds to the next instruction.  Only if the accumulator is plus zero or minus zero does the branch to address K occur.
            // The accumulator (and its stored overflow) are not actually modified.
            //
            // Note that if the accumulator contains overflow, then the accumulator is not treated as being zero, even if the sign-corrected value would be +0 or -0.
            //
            // This instruction does not set up a later return.  Use the TC instruction instead for that.
            case `BZF`: {
                let acc = this.readMem(AgcConsts.REG_A);
                if (acc === 0 || acc === 0o177777) {
                    this.m_regs[AgcConsts.REG_Z] = imm12;
                }
                break;
            }

            // The "Modular Subtract" instruction forms a normal signed 1's-complement difference from two unsigned 2's-complement values.
            case `MSU`: {
                let ui = 0, uj = 0;
                // WhereWord = FindMemoryWord (State, Address10);
                if (is16Bit(imm10)) {
                    ui = 0o177777 & this.readMem(AgcConsts.REG_A);
                    uj = 0o177777 & ~this.readMem(imm10);
                } else {
                    ui = (0o77777 & overflowCorrected(this.readMem(AgcConsts.REG_A)));
                    uj = (0o77777 & ~this.readMem(imm10));
                }
                let diff = ui + uj + 1; // Two's complement subtraction -- add the complement plus one
                // The AGC sign-extends the result from A15 to A16, then checks A16 to see if
                // one needs to be subtracted. We'll go in the opposite order, which also works
                if (diff & 0o40000) {
                    diff |= 0o100000; // Sign-extend A15 into A16
                    diff--; // Subtract one from the result
                }
                if (imm10 === AgcConsts.REG_Q) {
                    this.writeMem(AgcConsts.REG_A, 0o177777 & diff);
                } else {
                    let op16 = (0o77777 & diff);
                    this.writeMem(AgcConsts.REG_A, signExtend(op16));
                }
                this.writeMem(imm10, this.readMem(imm10));
                break;
            }

            // QXCH
            // The "Exchange Q and K" instruction exchanges the value in the Q register with a value stored in erasable memory.
            //
            // 2 MCT (about 23.4 µs)
            // If K is the accumulator or L register, then the full 16-bit values of A and Q are swapped.  Otherwise, the overflow-corrected value of Q is stored into K, 
            // and the contents of K are sign-extended to 16 bits before storage in Q.
            case `QXCH`:
                if (imm10 === AgcConsts.REG_Q) {
                } else if (imm10 === AgcConsts.REG_ZERO) {
                    this.writeMem(AgcConsts.REG_Q, 0);
                } else if (is16Bit(imm10)) {
                    let op = this.readMem(AgcConsts.REG_Q);
                    this.writeMem(AgcConsts.REG_Q, this.readMem(imm10));
                    this.writeMem(imm10, op);
                } else {
                    let op = overflowCorrected(this.readMem(AgcConsts.REG_Q));
                    this.writeMem(AgcConsts.REG_Q, signExtend(this.readMem(imm10)));
                    this.writeMem(imm10, op);
                }
                break;

            // AUG

            // DIM

            // The "Double Clear and Add" instruction moves the contents of a pair of memory locations into the A,L register pair.
            //
            // The value from K is transferred into the accumulator, while the value from K+1 is transferred into the L register.
            //
            // A side-effect of this instruction is that K,K+1 are rewritten after their values are written to the A,L register pair; 
            // this means that if K or K+1 is CYR, SR, CYL, or EDOP, then they are re-edited.  
            //
            // The instruction "DCA L" is an unusual case.   Since the less-significant word is processed first and then the more-significant word, 
            // the effect will be to first load the L register with the contents of the Q register, and then to load the A register with the contents of L.
            // In other words, A and L will both be loaded with the contents of the 16-bit register Q.
            //
            // On the other hand, the instruction "DCA Q" will cause the full 16-bit contents (including overflow) of Q to be loaded into A, 
            // and the 15-bit contents of EB to be loaded into L.
            case `DCA`:
                if (imm12 === AgcConsts.REG_L) {
                    this.writeMem(AgcConsts.REG_L, overflowCorrected(this.readMem(AgcConsts.REG_L)));
                } else {
                    // Do topmost word first.
                    let topVal = this.readMem(imm12);
                    if (is16Bit(imm12)) {
                        this.writeMem(AgcConsts.REG_L, overflowCorrected(topVal));
                    } else {                
                        this.writeMem(AgcConsts.REG_L, topVal);
                    }

                    // Now do bottom word.
                    let bottomVal = this.readMem(imm12-1);
                    if (is16Bit(imm12-1)) {
                        this.writeMem(AgcConsts.REG_A, bottomVal);
                    } else {                
                        this.writeMem(AgcConsts.REG_A, signExtend(bottomVal));
                    }
                    if (imm12 >= 0o20 && imm12 <= 0o23)
                        this.writeMem(imm12, topVal);
                    if (imm12 >= 0o20 + 1 && imm12 <= 0o23 + 1)
                        this.writeMem(imm12, bottomVal);
                }
                break;

            // The "Double Clear and Subtract" instruction moves the 1's-complement (i.e., the negative) of the contents of a pair of memory locations into the A,L register pair.
            //
            // 3 MCT (about 35.1 µs)
            case `DCS`:
                if (imm12 === AgcConsts.REG_L) { // DCOM
                    this.writeMem(AgcConsts.REG_A, ~this.readMem(AgcConsts.REG_A));
                    this.writeMem(AgcConsts.REG_L, overflowCorrected(~this.readMem(AgcConsts.REG_L)));
                    // c (RegL) = ~c (RegL);
                    // c (RegL) = SignExtend (OverflowCorrected (c (RegL)));
                } else {
                    let op1 = this.readMem(imm12);
                    // Do topmost word first.
                    if (is16Bit(imm12))
                        this.writeMem(AgcConsts.REG_L, overflowCorrected(~op1));
                    else
                        this.writeMem(AgcConsts.REG_L, ~op1);
                    // c (RegL) = SignExtend (OverflowCorrected (c (RegL)));
                    // Now do bottom word.
                    let op2 = this.readMem(imm12-1);
                    if (is16Bit(imm12-1))
                        this.writeMem(AgcConsts.REG_L, ~op2);
                    else
                        this.writeMem(AgcConsts.REG_L, signExtend(~op2));
                    this.writeMem(imm12, op1);
                    this.writeMem(imm12-1, op2);
                }
                break;

            // The "Index Extracode Instruction" instruction causes the next instruction to be executed in a modified way from its actual representation in memory.
            case `INDEX_2`:
                this.m_extraCode = true;
                if (imm12 === 0o17 << 1) {
                    this.writeMem(AgcConsts.REG_Z, this.readMem(AgcConsts.REG_ZRUPT) - 1);
                    this.m_inIsr = false;
                    this.m_substituteInstruction = true;
                } else if (is16Bit(imm12)) {
                    this.m_indexValue = overflowCorrected(this.readMem(imm12));
                } else {
                    this.m_indexValue = this.readMem(imm12);
                }
                break;

            // SU

            // The "Branch Zero or Minus to Fixed" instruction jumps to a memory location in fixed (as opposed to erasable) memory if the accumulator is zero or negative.
            //
            // 1 MCT (about 11.7 µs) if the accumulator is zero or negative, or 2 MCT (about 23.4 µs) if the accumulator is positive non-zero
            // If the accumulator is positive non-zero, then control proceeds to the next instruction.  Only if the accumulator is plus zero or negative does the branch to address K occur.
            // The accumulator and its stored oveflow are not actually modified.
            //
            // Note that if the accumulator contains +overflow, then the accumulator is not treated as being zero, even if the sign-corrected value would be +0.
            // If the accumulator contains negative overflow, then the value is treated as being negative non-zero, so the jump is taken.
            //
            // This instruction does not set up a later return.  Use the TC instruction instead for that.
            //
            // Indirect conditional branch:  For an indirect conditional branch, it is necessary to combine an INDEX instruction with a BZMF instruction.
            // Refer to the entry for the INDEX instruction.
            case `BZMF`: {
                let acc = this.readMem(AgcConsts.REG_A);
                if (acc === 0 || 0 !== (acc & 0o100000))
                {
                    // BacktraceAdd (State, 0);
                    this.writeMem(AgcConsts.REG_Z, imm12);
                    // JustTookBZMF = 1;
                }
                break;
            }

            // The "Multiply" instruction multiplies two single-precision (SP) values to give a double-precision (DP) value.
            //
            // 3 MCT (about 35.1 µs)
            // The accumulator is overflow-adjusted prior to the operation.  The single-precision (SP) contents of K are then multiplied by the SP contents of the accumulator, 
            // resulting in a double-precision (DP) value whose more-significant word is stored into the accumulator and whose less-significant word is stored into the L register.
            //
            // The sign of the resulting DP value is just what would be expected (i.e., positive when multiplying two factors with the same sign, and negative when multiplying two factors of opposite signs).  
            // If one of the factors is 0, determining the sign of the result (i.e., +0 or -0) is a little trickier, and is done according to the following rules:
            //   1. The result is +0, unless
            //   2. The factor in the accumulator had been ±0 and the factor in K had been non-zero of the opposite sign, in which case the result is -0.
            //
            // The sign of the value placed in the L register is set to agree with the sign of the value placed in the accumulator.
            //
            // It is important to remember that the AGC's SP and DP values represent numbers between (but not including) -1 and +1.  Therefore, the result of a multiplication is always less than either of the factors 
            // which are multiplied together.  While you can work with numbers larger than 1, such as calculating 2×2, the scaling of the the factors and the result must be carefully considered.  For example, 
            // if you wanted to use the MP instruction with A and K each containing the octal value 2 (which would really be the SP value 2×2-14), then you would indeed find a result of 4, but it would be in L 
            // register because it would be part of the DP value 4×2-28 rather than just the integer 4.
            // 
            // For the special case "MP A", refer instead to the SQUARE instruction.
            case `MP`: {
                let msWord = 0, lsWord = 0, otherOp16 = 0;
                let product = 0;
                // WhereWord = FindMemoryWord (State, Address12);
                let op16 = overflowCorrected(this.readMem(AgcConsts.REG_A));
                if (is16Bit(imm12))
                    otherOp16 = overflowCorrected(this.readMem(imm12));
                else
                    otherOp16 = this.readMem(imm12);
                if (otherOp16 === AGC_P0 || otherOp16 === AGC_M0)
                    msWord = lsWord = AGC_P0;
                else if (otherOp16 === AGC_P0 || op16 === AGC_M0)
                {
                    if ((op16 === AGC_P0 && 0 !== (0o40000 & otherOp16)) ||
                        (op16 === AGC_M0 && 0 === (0o40000 & otherOp16)))
                        msWord = lsWord = AGC_M0;
                    else
                        msWord = lsWord = AGC_P0;
                }
                else
                {
                    let wordPair = [0, 0];
                    product =
                        agc2cpu(signExtend(op16)) *
                        agc2cpu(signExtend(otherOp16));
                    product = cpu2agc2(product);
                    // Sign-extend, because it's needed for DecentToSp.
                    if (0o2000000000 & product)
                        product |= 0o04000000000;
                    // Convert back to DP.
                    decentToSp(product, wordPair);
                    msWord = wordPair[0];
                    lsWord = wordPair[1];
                }
                this.writeMem(AgcConsts.REG_A, msWord);
                this.writeMem(AgcConsts.REG_L, lsWord);
                break;
            }

            default:
                console.log(`Unhandled ${r.instr}`);

        }
    
        return true;
    }

    readMem(addr: number): number {
        if (addr < AgcConsts.REG_AMOUNT)
            return this.m_regs[addr];

        if (addr < AgcConsts.SWITCHABLE_ERASABLE_BASE) {
            // Unswitchable-erasable
            // Directly mapped to banks 0, 1, and 2
            if (addr < AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE)
                return this.m_ram[0][addr];
            else if (addr < 2* AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE)
                return this.m_ram[1][addr - AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE];
            return this.m_ram[2][addr - 2 * AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE];
        }
        if (addr < AgcConsts.COMMON_FIXED_BASE) {
            // Switchable-erasable
            const offset = addr - AgcConsts.SWITCHABLE_ERASABLE_BASE;
            const bank = (this.m_regs[AgcConsts.REG_EB] >> 8) & 0x7;
    
            return this.m_ram[bank][offset];
        }
        if (addr < AgcConsts.FIXED_FIXED_BASE) {
            // Common-fixed
            const offset = addr - AgcConsts.COMMON_FIXED_BASE;
            let bank = (this.m_regs[AgcConsts.REG_FB] >> 10) & 0x1F;
            if ((bank & 0o30) === 0o30 && (this.m_inputChannel[7] & 0o100) !== 0)
                bank += 0o10;
            return this.m_rom[bank][offset];
        }
        // Fixed-fixed
        // Banks 2 and 3
        const offset = addr - AgcConsts.FIXED_FIXED_BASE;
        if (offset < AgcConsts.COMMON_FIXED_BANK_SIZE)
            return this.m_rom[2][offset];
        return this.m_rom[3][offset - AgcConsts.COMMON_FIXED_BANK_SIZE];
    }


    writeMem(addr: number, value: number): void {
        if (addr === AgcConsts.REG_A || addr === AgcConsts.REG_Q) {
            this.m_regs[addr] = value & 0xFFFF;
            return;
        }
        if (addr === AgcConsts.REG_Z) {
            this.m_regs[addr] = value & 0x0FFF;
            return;
        }
        if (addr === AgcConsts.REG_EB) {
            this.m_regs[AgcConsts.REG_EB] = value & 0o03400;
            this.m_regs[AgcConsts.REG_BB] &= 0o76000;
            this.m_regs[AgcConsts.REG_BB] |= (value >> 8) & 7;
            return;
        }
        if (addr === AgcConsts.REG_FB) {
            this.m_regs[AgcConsts.REG_FB] = value & 0o76000;
            this.m_regs[AgcConsts.REG_BB] &= 0o00007;
            this.m_regs[AgcConsts.REG_BB] |= value & 0o76000;
            return;
        }
        if (addr === AgcConsts.REG_BB) {
            this.m_regs[AgcConsts.REG_BB] = value & 0o76007;
            this.m_regs[AgcConsts.REG_FB] = value & 0o76000;
            this.m_regs[AgcConsts.REG_EB] = (value & 7) << 8;
            return;
        }
        if (addr === AgcConsts.REG_ZERO) return;
        if (addr < AgcConsts.REG_AMOUNT) {
            this.m_regs[addr] = value & 0x7FFF;
            return;
        }

        if (addr < AgcConsts.SWITCHABLE_ERASABLE_BASE) {
            // Unswitchable-erasable
            // Directly mapped to banks 0, 1, and 2
            if (addr < AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE)
                this.m_ram[0][addr] = value & 0x7FFF;
            else if (addr < 2* AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE)
                this.m_ram[1][addr - AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE] = value & 0x7FFF;
            else
                this.m_ram[2][addr - 2 * AgcConsts.SWITCHABLE_ERASABLE_BANK_SIZE] = value & 0x7FFF;
        } else if (addr < AgcConsts.COMMON_FIXED_BASE) {
            // Switchable-erasable
            const offset = addr - AgcConsts.SWITCHABLE_ERASABLE_BASE;
            const bank = (this.m_regs[AgcConsts.REG_EB] >> 8) & 0x7;

            this.m_ram[bank][offset] = value & 0x7FFF;
        }
    }

    readIO(addr: number): number
    {
        if (addr < 0 || addr > AgcConsts.NUM_IO_CHANNELS)
            return 0;
        if (addr === AgcConsts.REG_L) return this.m_regs[AgcConsts.REG_L];
        if (addr === AgcConsts.REG_Q) return this.m_regs[AgcConsts.REG_Q];
        if (addr !== 7 && addr !== 0o10 && addr !== 0o11)
            console.log(`readIO ${addr.toString(8).padStart(5, '0')}`)
        return this.m_inputChannel[addr];
    }
    
    private writeIO(addr: number, val: number)
    {
        val &= 0o77777;
        if (addr < 0 || addr > AgcConsts.NUM_IO_CHANNELS)
            return;
        if (addr === AgcConsts.REG_L) {
            this.m_regs[AgcConsts.REG_L] = val;
        } else if (addr === AgcConsts.REG_Q) {
            this.m_regs[AgcConsts.REG_Q] = val;
        } else {
            this.m_inputChannel[addr] = val;
            if (addr !== 7)
                console.log(`writeIO ${addr.toString(8).padStart(5, '0')} ${val.toString(8).padStart(5, '0')}`)
    
            if (addr === 0o34)
                this.m_downlink |= 1;
            else if (addr === 0o35)
                this.m_downlink |= 2;
            if (this.m_downlink === 3)
            {
                this.m_downruptTimeValid = true;
                this.m_downruptTime = this.m_cycleCounter + BigInt((AgcConsts.AGC_PER_SECOND / 50) | 0);
                this.m_downlink = 0;
            }
    
        }
    }

    private handleTimers()
    {
        // First, update SCALER1 and SCALER2. These are direct views into
        // the clock dividers in the Scaler module, and so don't take CPU
        // time to 'increment'
        this.m_scalerCounter -= SCALER_OVERFLOW;
        this.m_inputChannel[AgcConsts.IO_LOSCALAR]++;
        if (this.m_inputChannel[AgcConsts.IO_LOSCALAR] === 0o40000) {
            this.m_inputChannel[AgcConsts.IO_LOSCALAR] = 0;
            this.m_inputChannel[AgcConsts.IO_HISCALAR] = (this.m_inputChannel[AgcConsts.IO_HISCALAR] + 1) & 0o37777;
        }
    
        // Check alarms first, since there's a chance we might go to standby
        if (0o4000 === (0o7777 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
            // The Night Watchman begins looking once every 1.28s
            console.log("NIGHT WATCHMAN");
    
        } else if (0o0000 === (0o7777 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
            // The standby circuit checks the SBY/PRO button state every 1.28s
            console.log("STANDBY CIRCUIT CHECK");
     
        } else if (0o0 === (0o7 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
            // Update the warning filter. Once every 160ms, if an input to the filter has been
            // generated (or if the light test is active), the filter is charged. Otherwise,
            // it slowly discharges. This is being modeled as a simple linear function right now,
            // and should be updated when we learn its real implementation details.
            if ((0o400 === (0o777 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) &&
                (this.m_generatedWarning || (this.m_inputChannel[0o13] & 0o1000)))
            {
                this.m_generatedWarning = false;
                this.m_warningFilter += WARNING_FILTER_INCREMENT;
                if (this.m_warningFilter > WARNING_FILTER_MAX)
                this.m_warningFilter = WARNING_FILTER_MAX;
            }
            else
            {
                if (this.m_warningFilter >= WARNING_FILTER_DECREMENT)
                    this.m_warningFilter -= WARNING_FILTER_DECREMENT;
                else
                    this.m_warningFilter = 0;
            }
        }
    
        // All the rest of this is switched off during standby.
        // if (!State->Standby)
        {
            if (0o400 === (0o777 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
                // The Rupt Lock alarm watches ISR state starting every 160ms
                console.log("RUPT LOCK ALARM");
            // } else if ((State->RuptLock || State->NoRupt) && 0300 == (0777 & m_inputChannel[AGCConsts::IO_LOSCALAR])) {
            }
    
            if (0o20 === (0o37 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
                // The TC Trap alarm watches executing instructions every 5ms
                console.log("TC Trap");
            }
    
    
            // Now that that's taken care of...
            // Update the 10 ms. timers TIME1 and TIME3.
            // Recall that the registers are in AGC integer format,
            // and therefore are actually shifted left one space.
            // When taking a reset, the real AGC would skip unprogrammed
            // sequences and go straight to GOJAM. The requests, however,
            // would be saved and the counts would happen immediately
            // after the first instruction at 4000, so doing them now
            // is not too inaccurate.
            if (0o20 === (0o37 & this.m_inputChannel[AgcConsts.IO_LOSCALAR])) {
                this.m_extraDelay++;
                if (this.counterPINC(AgcConsts.REG_TIME1)) {
                    this.m_extraDelay++;
                    this.counterPINC(AgcConsts.REG_TIME2);
                }
                this.m_extraDelay++;
                if (this.counterPINC(AgcConsts.REG_TIME3)) {
                    this.m_interruptRequests[3] = 1;
                }
            }
    
            // TIME5 is the same as TIME3, but 5 ms. out of phase.
            if (0o00 === (0o37 & this.m_inputChannel[AgcConsts.IO_LOSCALAR]))
            {
                this.m_extraDelay++;
                if (this.counterPINC(AgcConsts.REG_TIME5)) {
                    this.m_interruptRequests[2] = 1;
                }
            }
            // TIME4 is the same as TIME3, but 7.5ms out of phase
            if (0o10 === (0o37 & this.m_inputChannel[AgcConsts.IO_LOSCALAR]))
            {
                this.m_extraDelay++;
                if (this.counterPINC(AgcConsts.REG_TIME4)) {
                    this.m_interruptRequests[4] = 1;
                }
            }
            // TIME6 only increments when it has been enabled via CH13 bit 15.
            // It increments 0.3125ms after TIME1/TIME3
            if (0o40000 & this.m_inputChannel[0o13] && (this.m_inputChannel[AgcConsts.IO_LOSCALAR] & 0o1) === 0o1)
            {
                console.log("TIMER6");
            }
    
        }
    
    }    
 
    // 1's-complement increment
    private counterPINC (counter: number): boolean
    {
        let overflow = false;
        if (this.m_regs[counter] === 0o37777)
        {
            overflow = true;
            this.m_regs[counter] = 0;
        }
        else
        {
            overflow = false;
            // if (TrapPIPA)
            //     printf ("PINC: %o", i);
            this.m_regs[counter] = ((this.m_regs[counter] + 1) & 0o77777);
            // if (TrapPIPA)
            //     printf (" %o", i);
            if (this.m_regs[counter] === 0)	// Account for -0 to +1 transition.
                this.m_regs[counter]++;
            // if (TrapPIPA)
            //     printf (" %o\n", i);
        }
        return overflow;
    }

    //----------------------------------------------------------------------------
    // This function implements a model of what happens in the actual AGC hardware
    // during a divide -- but made a bit more readable / software-centric than the 
    // actual register transfer level stuff. It should nevertheless give accurate
    // results in all cases, including those that result in "total nonsense".
    // If A, L, or Z are the divisor, it assumes that the unexpected transformations
    // have already been applied to the "divisor" argument.
    private simulateDV(divisor: number)
    {
        let dividend_sign = 0;
        let divisor_sign = 0;
        let remainder;
        let remainder_sign = 0;
        let quotient_sign = 0;
        let quotient = 0;
        let sum = 0;
        let a = this.readMem(AgcConsts.REG_A);
        let l = this.readMem(AgcConsts.REG_L);
        let i = 0;

        // Assume A contains the sign of the dividend
        dividend_sign = a & 0o100000;

        // Negate A if it was positive
        if (!dividend_sign)
            a = ~a;
        // If A is now -0, take the dividend sign from L
        if (a === 0o177777)
            dividend_sign = l & 0o100000;
        // Negate L if the dividend is negative.
        if (dividend_sign)
            l = ~l;

        // Add 40000 to L
        l = addSP16(l, 0o40000);
        // If this did not cause positive overflow, add one to A
        if (valueOverflowed(l) !== AGC_P1)
            a = addSP16(a, 1);
        // Initialize the remainder with the current value of A
        remainder = a;

        // Record the sign of the divisor, and then take its absolute value
        divisor_sign = divisor & 0o100000;
        if (divisor_sign)
            divisor = ~divisor;
        // Initialize the quotient via a WYD on L (L's sign is placed in bits
        // 16 and 1, and L bits 14-1 are placed in bits 15-2).
        quotient_sign = l & 0o100000;
        quotient = quotient_sign | ((l & 0o37777) << 1) | (quotient_sign >> 15);

        for (i = 0; i < 14; i++)
        {
            // Shift up the quotient
            quotient = quotient << 1;
            // Perform a WYD on the remainder
            remainder_sign = remainder & 0o100000;
            remainder = remainder_sign | ((remainder & 0o37777) << 1);
            // The sign is only placed in bit 1 if the quotient's new bit 16 is 1
            if ((quotient & 0o100000) === 0)
                remainder |= (remainder_sign >> 15);
            // Add the divisor to the remainder
            sum = addSP16(remainder, divisor);
            if (sum & 0o100000)
            {
                // If the resulting sum has its bit 16 set, OR a 1 onto the
                // quotient and take the sum as the new remainder
                quotient |= 1;
                remainder = sum;
            }
        }
        // Restore the proper quotient sign
        a = quotient_sign | (quotient & 0o77777);

        // The final value for A is negated if the dividend sign and the
        // divisor sign did not match
        this.writeMem(AgcConsts.REG_A, (dividend_sign !== divisor_sign) ? ~a : a);
        // The final value for L is negated if the dividend was negative
        this.writeMem(AgcConsts.REG_L, (dividend_sign) ? remainder : ~remainder);
    }

    
}