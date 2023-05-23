import { useContext } from 'react';
import './regsview.css'
import RegView from "./regview"
import { AgcContext } from '../AgcContext';
import { AgcConsts } from "../agc/agc"

function RegsView() {

    const agc = useContext(AgcContext);

    return (
        <>
            <div className='regitem'>
                <RegView name="A     " value={agc.readMem(AgcConsts.REG_A)} />
            </div>
            <div className='regitem'>
                <RegView name="L     " value={agc.readMem(AgcConsts.REG_L)} />
            </div>
            <div className='regitem'>
                <RegView name="Q     " value={agc.readMem(AgcConsts.REG_Q)} />
            </div>
            <div className='regitem'>
                <RegView name="EB    " value={agc.readMem(AgcConsts.REG_EB)} />
            </div>
            <div className='regitem'>
                <RegView name="FB    " value={agc.readMem(AgcConsts.REG_FB)} />
            </div>
            <div className='regitem'>
                <RegView name="Z     " value={agc.readMem(AgcConsts.REG_Z)} />
            </div>
            <div className='regitem'>
                <RegView name="BB    " value={agc.readMem(AgcConsts.REG_BB)} />
            </div>
            <div className='regitem'>
                <RegView name="ARUPT " value={agc.readMem(AgcConsts.REG_ARUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="LRUPT " value={agc.readMem(AgcConsts.REG_LRUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="QRUPT " value={agc.readMem(AgcConsts.REG_QRUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="ZRUPT " value={agc.readMem(AgcConsts.REG_ZRUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="BBRUPT " value={agc.readMem(AgcConsts.REG_BBRUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="BRUPT " value={agc.readMem(AgcConsts.REG_BRUPT)} />
            </div>
            <div className='regitem'>
                <RegView name="CYR   " value={agc.readMem(AgcConsts.REG_CYR)} />
            </div>
            <div className='regitem'>
                <RegView name="SR    " value={agc.readMem(AgcConsts.REG_SR)} />
            </div>
            <div className='regitem'>
                <RegView name="CYL   " value={agc.readMem(AgcConsts.REG_CYL)} />
            </div>
            <div className='regitem'>
                <RegView name="EDOP  " value={agc.readMem(AgcConsts.REG_EDOP)} />
            </div>
            <div className='regitem'>
                <RegView name="TIME2 " value={agc.readMem(AgcConsts.REG_TIME2)} />
            </div>
            <div className='regitem'>
                <RegView name="TIME1 " value={agc.readMem(AgcConsts.REG_TIME1)} />
            </div>
            <div className='regitem'>
                <RegView name="TIME3 " value={agc.readMem(AgcConsts.REG_TIME3)} />
            </div>
            <div className='regitem'>
                <RegView name="TIME4 " value={agc.readMem(AgcConsts.REG_TIME4)} />
            </div> 
            <div className='regitem'>
                <RegView name="TIME5 " value={agc.readMem(AgcConsts.REG_TIME5)} />
            </div>
            <div className='regitem'>
                <RegView name="TIME6 " value={agc.readMem(AgcConsts.REG_TIME6)} />
            </div>
        </>
    );
}

export default RegsView;