import { useContext, useEffect, useState } from 'react'
import './telemetry.css'
import { AgcContext } from '../AgcContext';

interface TelemetryProperties {
    counter: number
}

class TelemetryState {
    counter = 0
    wordOrderBit = false
    downlinkListCount = 0
    downlinkListZero = 0
    downlinkListExpected = 0
    downlinkListBuffer: number[] = new Array(260)
}

export default function Telemetry(props: TelemetryProperties) {

    const agc = useContext(AgcContext);
    const [state, setState] = useState(new TelemetryState())

    useEffect(() => {
        if (state.counter === props.counter) return () => {};

        const ch = agc.getChannelWritten();
        let value = 0;
        if (ch === 0o13) {
            console.log(`Telemetry effect 13`);
            value = agc.readIO(0o13);
            state.wordOrderBit = ((value & 0o100) !== 0);
            return () => {};
        } else if (ch === 0o34) {
            console.log(`Telemetry effect 34`);
            value = agc.readIO(0o34);
            if (0 !== (state.downlinkListCount & 1)) {
                console.log(`Downlink list of type ${state.downlinkListBuffer[0]} aborted at word-count ${state.downlinkListCount}`);
                state.downlinkListCount = 0;
                return () => {};
            }
            if (state.downlinkListCount !== 0 && !state.wordOrderBit && state.downlinkListCount !== state.downlinkListZero)
            {
                state.downlinkListCount = 0;
            }

            if (state.downlinkListCount === 0)
            {
                if (state.wordOrderBit) {
                    // Abort
                    console.log(`Downlink list of type ${state.downlinkListBuffer[0]} by wordOrderBit in zero`);
                    state.downlinkListCount = 0;
                    return () => {};
                }
                state.downlinkListZero = 100;
                if (value === 0o1776)		// LM erasable dump.
                {
                    state.downlinkListExpected = 260;
                    state.downlinkListZero = -1;
                }
                else if (value === 0o1777)	// CM erasable dump.
                {
                    state.downlinkListExpected = 260; 
                    state.downlinkListZero = -1;
                }
                else if (value === 0o77774)	// LM orbital maneuvers, CM powered list.
                    state.downlinkListExpected = 200;
                else if (value === 0o77777)	// LM or CM coast align
                    state.downlinkListExpected = 200;
                else if (value === 0o77775)	// LM or CM rendezvous/prethrust
                    state.downlinkListExpected = 200;
                else if (value === 0o77773)	// LM descent/ascent, CM program 22 list
                    state.downlinkListExpected = 200;
                else if (value === 0o77772)	// Lunar surface align
                    state.downlinkListExpected = 200;
                else if (value === 0o77776)	// LM AGS initialization/update, CM entry/update
                    state.downlinkListExpected = 200;
                else {
                    // Abort
                    console.log(`Downlink list of type ${state.downlinkListBuffer[0]} aborted by unknown code`);
                    state.downlinkListCount = 0;
                    return () => {};
                }
            }
    
        } else if (ch === 0o35) {
            console.log(`Telemetry effect 35`);
            value = agc.readIO(0o35);

            if (0 === (state.downlinkListCount & 1)) {
                // Abort
                console.log(`Downlink list of type ${state.downlinkListBuffer[0]} aborted at word-count ${state.downlinkListCount}`);
                state.downlinkListCount = 0;
                return () => {};
            }
            if (state.downlinkListCount === 1)
            { 
                if (value !== 0o77340) {	// sync word
                    // Abort
                    state.downlinkListCount = 0;
                    return () => {};
                }
                if (state.wordOrderBit) {
                    // Abort
                    state.downlinkListCount = 0;
                    return () => {};
                }
            } else {
                if (!state.wordOrderBit && state.downlinkListCount !==state.downlinkListZero + 1) {
                    // Abort
                    state.downlinkListCount = 0;
                    return () => {};
                }
            }
    
        } else {
            return () => {};           
        }

        if (state.downlinkListCount < 260) {
            state.downlinkListBuffer[state.downlinkListCount++] = value;
        }
    
        // End of the list!  Do something with the data.
        console.log(`Downlink ${state.downlinkListCount}/${state.downlinkListExpected}`);
        if (state.downlinkListCount >= state.downlinkListExpected) {
            switch (state.downlinkListBuffer[0]) {
                case 0o77777:
                    // if (CmOrLm)
                    //   PrintDownlinkList (DownlinkListSpecs[DL_CM_COAST_ALIGN]);
                    // else
                    //   PrintDownlinkList (DownlinkListSpecs[DL_LM_COAST_ALIGN]);
                    break;
            }
            state.downlinkListCount = 0;
        }

        return () => {};
      }, [props.counter, agc, state]);

    return (
        <textarea className="telemetry"
            rows={40}
            cols={80}
            readOnly={true}
        />
    );
}
