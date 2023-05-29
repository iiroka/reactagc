import './dskyright.css'

interface DskyRightProperties {
    ch11bits: number
}

export default function DSKYRightPanel(props: DskyRightProperties) {

    return (
        <div className="right-container">
            <img className='comp-acty' src={(props.ch11bits & 0x002) ? "./CompActyOn.jpg" : "./CompActyOff.jpg"} alt="CompActy" />
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
