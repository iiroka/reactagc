import './regview.css'

interface RegName {
    name: string;
    value: number
}
export default function RegView(prop: RegName) {
    return (
        <span className='regview'>{prop.name}   {prop.value.toString(8).padStart(5, '0')}</span>
    );
}
