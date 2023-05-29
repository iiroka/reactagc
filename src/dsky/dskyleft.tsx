import './dskyleft.css'

interface DskyLeftProperties {
    ch11bits: number
    a12bits: number
}

export default function DSKYLeftPanel(props: DskyLeftProperties) {

    return (
        <div className="left-container">
            <img className='uplink-acty' src={(props.ch11bits & 0x04) ? "./UplinkActyOn.jpg" : "./UplinkActyOff.jpg"} alt="UplinkActy" />
            <img className='no-att' src="./NoAttOff.jpg" alt="NO ATT" />
            <img className='stby' src="./StbyOff.jpg" alt="STBY" />
            <img className='key-rel' src={(props.ch11bits & 0x10) ? "./KeyRelOn.jpg" : "./KeyRelOff.jpg"} alt="KEY REL" />
            <img className='opr-err' src={(props.ch11bits & 0x40) ? "./OprErrOn.jpg" : "./OprErrOff.jpg"} alt="OPR ERR" />
            <img className='prio-disp' src="./PrioDispOff.jpg" alt="PRIO DISP" />
            <img className='no-dap' src="./NoDapOff.jpg" alt="NO DAP" />
            <img className='temp' src={(props.ch11bits & 0x08) ? "./TempOn.jpg" : "./TempOff.jpg"} alt="Temp" />
            <img className='gimbal-lock' src="./GimbalLockOff.jpg" alt="GIMBAL LOCK" />
            <img className='prog-light' src={(props.a12bits & 0x100) !== 0 ? "./ProgOn.jpg" : "./ProgOff.jpg"} alt="PROG" />
            <img className='restart' src="./RestartOff.jpg" alt="RESTART" />
            <img className='tracker' src={(props.a12bits & 0x80) !== 0 ? "./TrackerOn.jpg" : "./TrackerOff.jpg"} alt="TRACKER" />
            <img className='alt' src="./AltOff.jpg" alt="ALT" />
            <img className='vel' src="./VelOff.jpg" alt="VEL" />
        </div>
    );
}
