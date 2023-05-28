import { useState, useContext, useEffect } from 'react';
import { AgcContext } from '../AgcContext';
import './dskyright.css'

interface DskyRightProperties {
    counter: number
}

export default function DSKYRightPanel(props: DskyRightProperties) {

    const agc = useContext(AgcContext);
    const [ch11, setCh11] = useState(0)

    useEffect(() => {
        const ch = agc.getChannelWritten();
        if (ch === 0o10) {
            let ch = agc.readIO(0o10);
            const A =  (ch >> 11) & 0xF;
            const B =  (ch >> 10) & 1;
            const C =  (ch >> 5) & 0x1F;
            const D =  (ch >> 0) & 0x1F;
            switch (A) {
                case 0:
                    break;
                case 12:
                    break;
                default:
                    console.log(`A ${A} ${B} ${C} ${D}`)
                    break;
            }
        } else if (ch === 0o11) 
            setCh11(agc.readIO(0o11));
        return () => {};
      }, [props.counter, agc]);

    return (
        <div className="right-container">
            <img className='comp-acty' src={(ch11 & 0x002) ? "./CompActyOn.jpg" : "./CompActyOff.jpg"} alt="CompActy" />
            <img className='prog' src="./rProgOn.jpg" alt="PROG" />
            <img className='md1' src="./7Seg-0.jpg" alt="0" />
            <img className='md2' src="./7Seg-0.jpg" alt="0" />
            <img className='verb' src="./VerbOn.jpg" alt="VERB" />
            <img className='vd1' src="./7Seg-0.jpg" alt="0" />
            <img className='vd2' src="./7Seg-0.jpg" alt="0" />
            <img className='noun' src="./NounOn.jpg" alt="NOUN" />
            <img className='nd1' src="./7Seg-0.jpg" alt="0" />
            <img className='nd2' src="./7Seg-0.jpg" alt="0" />
            <img className='sep1' src="./SeparatorOn.jpg" alt="sep" />
            <img className='r1plusminus' src="./PlusMinusOff.jpg" alt="+" />
            <img className='r1d1' src="./7Seg-0.jpg" alt="0" />
            <img className='r1d2' src="./7Seg-0.jpg" alt="0" />
            <img className='r1d3' src="./7Seg-0.jpg" alt="0" />
            <img className='r1d4' src="./7Seg-0.jpg" alt="0" />
            <img className='r1d5' src="./7Seg-0.jpg" alt="0" />
            <img className='sep2' src="./SeparatorOn.jpg" alt="sep" />
            <img className='r2plusminus' src="./PlusMinusOff.jpg" alt="+" />
            <img className='r2d1' src="./7Seg-0.jpg" alt="0" />
            <img className='r2d2' src="./7Seg-0.jpg" alt="0" />
            <img className='r2d3' src="./7Seg-0.jpg" alt="0" />
            <img className='r2d4' src="./7Seg-0.jpg" alt="0" />
            <img className='r2d5' src="./7Seg-0.jpg" alt="0" />
            <img className='sep3' src="./SeparatorOn.jpg" alt="sep" />
            <img className='r3plusminus' src="./PlusMinusOff.jpg" alt="+" />
            <img className='r3d1' src="./7Seg-0.jpg" alt="0" />
            <img className='r3d2' src="./7Seg-0.jpg" alt="0" />
            <img className='r3d3' src="./7Seg-0.jpg" alt="0" />
            <img className='r3d4' src="./7Seg-0.jpg" alt="0" />
            <img className='r3d5' src="./7Seg-0.jpg" alt="0" />
        </div>
    );
}
