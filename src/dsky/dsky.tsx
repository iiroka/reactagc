
import DSKYKeys from './dskykeys'
import DSKYLeftPanel from "./dskyleft"
import DSKYRightPanel from "./dskyright"
import './dsky.css'

interface DskyProperties {
    ch11bits: number
    a12bits: number
}

export default function DSKY(props: DskyProperties) {

    return (
        <div className="dsky-container">
            <div className="dsky-panel-container">
                <div className="left-panel"><DSKYLeftPanel ch11bits={props.ch11bits} a12bits={props.a12bits}/></div>
                <div className="right-panel"><DSKYRightPanel ch11bits={props.ch11bits}/></div>
            </div>
            <div className="keys"><DSKYKeys /></div>
        </div>
    );
}
