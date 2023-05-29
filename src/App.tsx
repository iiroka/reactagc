import { useContext, useEffect, useState } from 'react';
import './App.css';
import AgcView from './agcview/agcview'
import { AgcContext } from './AgcContext';
import DSKY from './dsky/dsky'
import Telemetry from './telemetry/telemetry'

class AgcState {
    a12bits: number = 0
    ch11bits: number = 0
    wordOrderBit: boolean = false
    fullDownlinkList?: number[] = undefined
    fillingDownlinkList?: number[] = undefined
    downlinkListCount: number = 0
    downlinkType: number = 0
    downlinkListZero: number = 0
    downlinkListExpected: number = 0
}

export default function App() {

    const agc = useContext(AgcContext);
    const [value, setValue] = useState(0); // integer state
    const [isForced, setForced] = useState(false);
    const [debugging, setDebugging] = useState(false);
    const [timerId, setTimerId] = useState(0)
    const [state, _] = useState(new AgcState())

    function doStep() {
        setDebugging(true);
        while (!agc.step()) {}
        setForced(false);
        setValue(value => value + 1);
    }

    function doStepping() {
        setDebugging(true);
        let id = setInterval(() => doStep(), 10);
        setTimerId(+id);
    }

    function doRun() {
        setDebugging(false);
        let prev = Date.now();
        let id = setInterval(() => {
            let now = Date.now();
            let ticks = (now - prev) * 1000 / 11.9;
            // while (!agc.step()); 
            for (let i = 0; i < ticks; i++)
                agc.step();
            prev = now;
            setValue(value => value + 1);
        });
        setTimerId(+id);
    }

    function doStop() {
        if (timerId) clearInterval(timerId);
        setValue(value => value + 1);
    }

    function agcInitialized() {
        console.log("agcInitialized");
        setForced(true);
    }

    function io_handler(addr: number, value: number) {
        if (addr === 0o10) {
            let ch = agc.readIO(0o10);
            const A =  (ch >> 11) & 0xF;
            const B =  (ch >> 10) & 1;
            const C =  (ch >> 5) & 0x1F;
            const D =  (ch >> 0) & 0x1F;
            switch (A) {
                case 0:
                    break;
                case 12:
                    state.a12bits = value;
                    break;
                default:
                    console.log(`A ${A} ${B} ${C} ${D}`)
                    break;
            }

        } else if (addr === 0o11) {
            state.ch11bits = value;
        } else if (addr === 0o13) {
            state.wordOrderBit = ((value & 0o100) !== 0);
        } else if (addr === 0o34 || addr === 0o35) {
            do_downlink(addr, value);
        }
    }

    function do_downlink(addr: number, value: number) {
        if (addr === 0o34) {

            if (0 !== (state.downlinkListCount & 1)) {
                if (state.downlinkListCount !== 0) {
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted at count ${state.downlinkListCount}`);
                    state.downlinkListCount = 0;
                }
                state.fillingDownlinkList = undefined;
                return;
            }

            if (state.downlinkListCount !== 0 && !state.wordOrderBit && state.downlinkListCount !== state.downlinkListZero)
            {
                console.log(`RETRY====`);
                state.downlinkListCount = 0;
            }

            if (state.downlinkListCount === 0)
            {
                if (state.wordOrderBit) {
                    // Abort
                    // console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted at count ${state.downlinkListCount} word order`);
                    state.fillingDownlinkList = undefined;
                    return;
                }
                state.downlinkListZero = 100;
                state.downlinkType = value;
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
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted by unknown code`);
                    state.downlinkListCount = 0;
                    state.fillingDownlinkList = undefined;
                    return;
                }
                state.fillingDownlinkList = new Array(state.downlinkListExpected);
            }

        } else if (addr === 0o35) {

            if (0 === (state.downlinkListCount & 1)) {
                // Abort
                if (state.downlinkListCount !== 0) {
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted at word-count ${state.downlinkListCount}`);
                    state.downlinkListCount = 0;
                }
                state.fillingDownlinkList = undefined;
                return;
            }
            if (state.downlinkListCount === 1)
            { 
                if (value !== 0o77340) {	// sync word
                    // Abort
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted missing sync`);
                    state.downlinkListCount = 0;
                    state.fillingDownlinkList = undefined;
                    return;
                }
                if (state.wordOrderBit) {
                    // Abort
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted at word-count 1`);
                    state.downlinkListCount = 0;
                    state.fillingDownlinkList = undefined;
                    return;
                }
            } else {
                if (!state.wordOrderBit && state.downlinkListCount !==state.downlinkListZero + 1) {
                    // Abort
                    console.log(`Downlink list of type ${state.downlinkType.toString(8)} aborted at word-count ${state.downlinkListCount}`);
                    state.downlinkListCount = 0;
                    state.fillingDownlinkList = undefined;
                    return;
                }
            }

        }

        if (state.fillingDownlinkList) {
            if (state.downlinkListCount < 260) {
                state.fillingDownlinkList[state.downlinkListCount++] = value;
            }

            // End of the list!
            if (state.downlinkListCount >= state.downlinkListExpected) {
                console.log("=== COMPLETE ====")
                state.downlinkListCount = 0;
                state.fullDownlinkList = state.fillingDownlinkList;
                state.fillingDownlinkList = undefined;
            }
        }

    }

    agc.setInitilizedCallback(agcInitialized);
    agc.io_handler = io_handler;

    useEffect(() => {
        if (isForced) setForced(false);
        return () => {}
    }, [isForced]);

    return (
        <div className="container">
            <div className="row">
                <button className="step-button" onClick={doStep}>
                    Step
                </button>
                <button className="stepping-button" onClick={doStepping}>
                    Stepping
                </button>
                <button className="run-button" onClick={doRun}>
                    Run
                </button>
                <button className="stop-button" onClick={doStop}>
                    Stop
                </button>
            </div >
            <div className="row">
                {debugging && (
                    <div className="agcview">
                        <AgcView forced={isForced}/>
                    </div>
                )}
                <div className="spacing" />
                <div className="dskyview">
                    <DSKY ch11bits={state.ch11bits} a12bits={state.a12bits}/>
                </div>
                <div className="telemtry">
                    <Telemetry msg={state.fullDownlinkList}/>
                </div>
            </div>
        </div>
    );
}
