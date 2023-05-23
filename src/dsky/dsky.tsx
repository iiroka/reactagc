
import DSKYKeys from './dskykeys'
import DSKYLeftPanel from "./dskyleft"
import DSKYRightPanel from "./dskyright"
import './dsky.css'

interface DskyProperties {
    counter: number
}

export default function DSKY(props: DskyProperties) {

    return (
        <div className="dsky-container">
            <div className="left-panel"><DSKYLeftPanel counter={props.counter}/></div>
            <div className="right-panel"><DSKYRightPanel counter={props.counter}/></div>
            <div className="keys"><DSKYKeys /></div>
        </div>
    );
}
