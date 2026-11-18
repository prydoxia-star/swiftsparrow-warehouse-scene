import type { EntityDetailsViewModel } from "../store/entityDetails";

interface StatusPanelProps {
  details: EntityDetailsViewModel;
  onClose: () => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).format(date);
}

export function StatusPanel({ details, onClose }: StatusPanelProps) {
  return (
    <aside
      className="status-panel"
      aria-label="Selected object details"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="status-panel__topline">
        <span className="status-panel__eyebrow">OBJECT DETAILS</span>
        <button className="status-panel__close" onClick={onClose} aria-label="Close details panel">
          ×
        </button>
      </div>

      <div className="status-panel__heading">
        <div className="status-panel__icon" aria-hidden="true">◈</div>
        <div className="status-panel__titles">
          <span className="status-panel__kind">{details.kindLabel}</span>
          <h2>{details.name}</h2>
          <span className="status-panel__id">{details.id}</span>
        </div>
      </div>

      <div className="status-panel__divider" />

      <div className="status-panel__live-row">
        <span className="status-panel__section-label">CURRENT STATUS</span>
        <span className={`status-chip${details.isLive ? " status-chip--live" : ""}`}>
          {details.isLive && <i aria-hidden="true" />}
          {details.state}
        </span>
      </div>

      <dl className="status-panel__fields">
        <div className="status-panel__field">
          <dt>Current shipment</dt>
          <dd>{details.currentShipment}</dd>
        </div>
        <div className="status-panel__field">
          <dt>Last update time</dt>
          <dd>{formatTime(details.lastUpdatedAt)}</dd>
        </div>
      </dl>

      <div className="status-panel__footer">
        <span className={details.isLive ? "status-panel__pulse" : "status-panel__static-dot"} />
        {details.isLive ? "SIMULATED LIVE FEED · 2 SECOND INTERVAL" : "FACILITY RECORD"}
      </div>
    </aside>
  );
}
