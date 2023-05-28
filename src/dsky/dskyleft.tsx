import { useState, useContext, useEffect } from 'react';
import { AgcContext } from '../AgcContext';
import './dskyleft.css'

interface DskyLeftProperties {
    counter: number
}

export default function DSKYLeftPanel(props: DskyLeftProperties) {

    const agc = useContext(AgcContext);
    const [prog, setProg] = useState(false)
    const [tracker, setTracker] = useState(false)
    const [ch11, setCh11] = useState(0)

    useEffect(() => {
        const ch = agc.getChannelWritten();
        if (ch === 0o10) {
            const value = agc.readIO(0o10);
            switch ((value >> 11) & 0xF) {
                case 12:
                    setTracker((value & 0x80) !== 0);
                    setProg((value & 0x100) !== 0);
                    break;
            }
        } else if (ch === 0o11)
            setCh11(agc.readIO(0o11));
        return () => {};
      }, [props.counter, agc]);

    return (
        <div className="left-container">
            <img className='uplink-acty' src={(ch11 & 0x04) ? "./UplinkActyOn.jpg" : "./UplinkActyOff.jpg"} alt="UplinkActy" />
            <img className='no-att' src="./NoAttOff.jpg" alt="NO ATT" />
            <img className='stby' src="./StbyOff.jpg" alt="STBY" />
            <img className='key-rel' src={(ch11 & 0x10) ? "./KeyRelOn.jpg" : "./KeyRelOff.jpg"} alt="KEY REL" />
            <img className='opr-err' src={(ch11 & 0x40) ? "./OprErrOn.jpg" : "./OprErrOff.jpg"} alt="OPR ERR" />
            <img className='prio-disp' src="./PrioDispOff.jpg" alt="PRIO DISP" />
            <img className='no-dap' src="./NoDapOff.jpg" alt="NO DAP" />
            <img className='temp' src={(ch11 & 0x08) ? "./TempOn.jpg" : "./TempOff.jpg"} alt="Temp" />
            <img className='gimbal-lock' src="./GimbalLockOff.jpg" alt="GIMBAL LOCK" />
            <img className='prog-light' src={prog ? "./ProgOn.jpg" : "./ProgOff.jpg"} alt="PROG" />
            <img className='restart' src="./RestartOff.jpg" alt="RESTART" />
            <img className='tracker' src={tracker ? "./TrackerOn.jpg" : "./TrackerOff.jpg"} alt="TRACKER" />
            <img className='alt' src="./AltOff.jpg" alt="ALT" />
            <img className='vel' src="./VelOff.jpg" alt="VEL" />
        </div>
    );
}
