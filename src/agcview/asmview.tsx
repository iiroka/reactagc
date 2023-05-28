import React  from 'react';
import { useState, useContext, useEffect } from 'react';
import './asmview.css'
import { AgcContext } from '../AgcContext';
import { deassemble } from "../agc/agcdeasm";

interface AsmProperties {
    addr: number,
    forced: boolean
}

function AsmView(props: AsmProperties) {
    const [lines, setLines] = useState(Array(128))
    const [currentLine, setCurrentLine] = useState(0)
    const [currentAddr, setAddr] = useState(0)
    const agc = useContext(AgcContext);

    useEffect(() => {
        if (props.forced || props.addr < currentAddr || (currentAddr + 128) <= props.addr) {
            let extra = false;
            let lines: string[] = new Array(128);
            for (let i = 0; i < 128; i++) {
                const addr = props.addr + i;
                const cmd = agc.readMem(addr);
                let line = addr.toString(8).padStart(4, '0');
                const r = deassemble(addr, cmd, extra);
                line = line.concat(` ${cmd.toString(8).padStart(5, '0')}   `, r.deasm);
                extra = r.extraCode;
                lines[i] = line;
            } 
            setLines(lines);
            setCurrentLine(0);
            setAddr(props.addr);
        } else {
            const line = props.addr - currentAddr;
            if (currentLine !== line)
                setCurrentLine(line);
        }
        return () => {};
    }, [props.addr, props.forced, currentAddr, agc, currentLine, lines]);

    return (
        <>
            <div className='aslines'>
                {lines.map((l, index) => <p className='asmline' style={ {backgroundColor: (index === currentLine) ? 'cyan' : 'transparent' }}>{l}</p>)}
            </div>
        </>
    );
}

export default AsmView;