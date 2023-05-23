import { useState, useContext, useEffect } from 'react';
import './asmview.css'
import { AgcContext } from '../AgcContext';
import { deassemble } from "../agc/agcdeasm";
import { HighlightWithinTextarea } from 'react-highlight-within-textarea'

interface AsmProperties {
    addr: number,
    forced: boolean
}

function AsmView(props: AsmProperties) {
    const [postContent, setPostContent] = useState('00000 00000\n00001 00000\n00002 00000')
    const [currentAddr, setAddr] = useState(0)
    const [lines, setLines] = useState(Array(128))
    const [hightlighted, setHighlighted] = useState([0,0])
    const agc = useContext(AgcContext);

    useEffect(() => {
        if (props.forced || props.addr < currentAddr || (currentAddr + 128) <= props.addr) {
            let content = ''
            let extra = false;
            let lineStarts: number[] = new Array(128);
            for (let i = 0; i < 128; i++) {
                const addr = props.addr + i;
                const cmd = agc.readMem(addr);
                let line = addr.toString(8).padStart(4, '0');
                const r = deassemble(addr, cmd, extra);
                line = line.concat(` ${cmd.toString(8).padStart(5, '0')}   `, r.deasm);
                extra = r.extraCode;
                lineStarts[i] = content.length;
                content = content.concat(line, "\n");
            } 
            setHighlighted([0, lineStarts[1]]);
            setLines(lineStarts);
            setPostContent(content);
            setAddr(props.addr);
        } else {
            const line = props.addr - currentAddr;
            const start = lines[line];
            const end = (line + 1 < lines.length) ? lines[line + 1] : postContent.length-1;
            if (hightlighted[0] !== start)
                setHighlighted([start, end]);
        }
        return () => {};
      }, [props.addr, props.forced, currentAddr, agc, postContent.length, lines]);

    return (
        // <textarea className='asmview'
        //     name='Assembly'
        //     value={postContent}
        //     rows={128}
        //     cols={30}
        //     readOnly={true}
        // />
        <div className='textarea'>
            <HighlightWithinTextarea
                value={postContent}
                highlight={hightlighted}
                readOnly={true}
            />
        </div>
    );
}

export default AsmView;