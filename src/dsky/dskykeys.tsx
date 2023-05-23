import { useContext } from 'react';
import { AgcContext } from '../AgcContext';
import styles from './dskykeys.module.css'

export default function DSKYKeys() {

    const agc = useContext(AgcContext);

    function proPressed() {

    }

    return (
        <div className={styles.keyscontainer}>
            <button className={styles.verbkey} onClick={() => agc.keyPressed(17)}><img src="./VerbUp.jpg" alt="VERB"/></button>
            <button className={styles.nounkey} onClick={() => agc.keyPressed(31)}><img src="./NounUp.jpg" alt="NOUN"/></button>
            <button className={styles.pluskey} onClick={() => agc.keyPressed(26)}><img src="./PlusUp.jpg" alt="+"/></button>
            <button className={styles.minuskey} onClick={() => agc.keyPressed(27)}><img src="./MinusUp.jpg" alt="-"/></button>
            <button className={styles.zerokey} onClick={() => agc.keyPressed(16)}><img src="./0Up.jpg" alt="0"/></button>
            <button className={styles.sevenkey} onClick={() => agc.keyPressed(7)}><img src="./7Up.jpg" alt="7"/></button>
            <button className={styles.fourkey} onClick={() => agc.keyPressed(4)}><img src="./4Up.jpg" alt="4"/></button>
            <button className={styles.onekey} onClick={() => agc.keyPressed(1)}><img src="./1Up.jpg" alt="1"/></button>
            <button className={styles.eightkey} onClick={() => agc.keyPressed(8)}><img src="./8Up.jpg" alt="8"/></button>
            <button className={styles.fivekey} onClick={() => agc.keyPressed(5)}><img src="./5Up.jpg" alt="5"/></button>
            <button className={styles.twokey} onClick={() => agc.keyPressed(2)}><img src="./2Up.jpg" alt="2"/></button>
            <button className={styles.ninekey} onClick={() => agc.keyPressed(9)}><img src="./9Up.jpg" alt="9"/></button>
            <button className={styles.sixkey} onClick={() => agc.keyPressed(6)}><img src="./6Up.jpg" alt="6"/></button>
            <button className={styles.threekey} onClick={() => agc.keyPressed(3)}><img src="./3Up.jpg" alt="3"/></button>
            <button className={styles.clrkey} onClick={() => agc.keyPressed(30)}><img src="./ClrUp.jpg" alt="CLR"/></button>
            <button className={styles.prokey} onClick={proPressed}><img src="./ProUp.jpg" alt="PRO"/></button>
            <button className={styles.keyrelkey} onClick={() => agc.keyPressed(25)}><img src="./KeyRelUp.jpg" alt="KEYREL"/></button>
            <button className={styles.enterkey} onClick={() => agc.keyPressed(28)}><img src="./EntrUp.jpg" alt="ENTR"/></button>
            <button className={styles.resetkey} onClick={() => agc.keyPressed(18)}><img src="./RsetUp.jpg" alt="RSET"/></button>
        </div>
    );
}
