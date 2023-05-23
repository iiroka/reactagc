import { useContext } from 'react';
import AsmView from './asmview'
import RegsView from './regsview'
import { AgcContext } from '../AgcContext';
import { AgcConsts } from "../agc/agc"


interface AgcProperties {
    forced: boolean
}

export default function AgcView(props: AgcProperties) {

    const agc = useContext(AgcContext);

    return (
        <div className="container">
            <div className="row">
                <div className="col-sm">
                    <AsmView addr={agc.readMem(AgcConsts.REG_Z)} forced={props.forced} />
                </div>
                <div className="col-sm">
                    <RegsView/>
                </div>
            </div>
        </div>
    );
}
