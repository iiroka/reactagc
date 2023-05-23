import { useContext, useEffect, useState } from 'react';
import './App.css';
import AgcView from './agcview/agcview'
import { AgcContext } from './AgcContext';
import DSKY from './dsky/dsky'
import Telemetry from './telemetry/telemetry'

export default function App() {

    const agc = useContext(AgcContext);
    const [value, setValue] = useState(0); // integer state
    const [isForced, setForced] = useState(false);
    const [debugging, setDebugging] = useState(false);
    const [timerId, setTimerId] = useState(0)

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
        let id = setInterval(() => { 
            while(!agc.step()); 
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

    agc.setInitilizedCallback(agcInitialized);

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
                <div className="monitors">
                    <div className="dskyview">
                        <DSKY counter={agc.getCycleCounter()}/>
                    </div>
                    <div className="telemtry">
                        <Telemetry />
                    </div>
                </div>
            </div>
        </div>
    );
}
