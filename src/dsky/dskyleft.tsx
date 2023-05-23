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
        let ch = agc.readIO(0o10);
        switch ((ch >> 11) & 0xF) {
            case 12:
                setTracker((ch & 0x80) !== 0);
                setProg((ch & 0x100) !== 0);
                break;
        }
        setCh11(agc.readIO(0o11));
        return () => {};
      }, [props.counter, agc]);

    return (
        <div className="left-container">
            <img src={(ch11 & 0x04) ? "./UplinkActyOn.jpg" : "./UplinkActyOff.jpg"} alt="UplinkActy" />
            <img src={(ch11 & 0x08) ? "./TempOn.jpg" : "./TempOff.jpg"} alt="Temp" />
            <img src="./NoAttOff.jpg" alt="NO ATT" />
            <img src="./GimbalLockOff.jpg" alt="GIMBAL LOCK" />
            <img src="./StbyOff.jpg" alt="STBY" />
            <img src={prog ? "./ProgOn.jpg" : "./ProgOff.jpg"} alt="PROG" />
            <img src={(ch11 & 0x10) ? "./KeyRelOn.jpg" : "./KeyRelOff.jpg"} alt="KEY REL" />
            <img src="./RestartOff.jpg" alt="RESTART" />
            <img src={(ch11 & 0x40) ? "./OprErrOn.jpg" : "./OprErrOff.jpg"} alt="OPR ERR" />
            <img src={tracker ? "./TrackerOn.jpg" : "./TrackerOff.jpg"} alt="TRACKER" />
            <img src="./PrioDispOff.jpg" alt="PRIO DISP" />
            <img src="./AltOff.jpg" alt="ALT" />
            <img src="./NoDapOff.jpg" alt="NO DAP" />
            <img src="./VelOff.jpg" alt="VEL" />
        </div>
    );
}
