import './telemetry.css'

export default function Telemetry() {

    return (
        <textarea className="telemetry"
            rows={40}
            cols={80}
            readOnly={true}
        />
    );
}
