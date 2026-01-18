import { useEffect, useMemo, useState } from "react";

type Event = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
};

type Resource = {
  id: string;
  name: string;
  type: "EXCLUSIVE" | "SHAREABLE" | "CONSUMABLE";
  isGlobal: boolean;
  ownerOrgId: string | null;
  maxConcurrent: number | null;
  totalQuantity: number | null;
};

type Allocation = {
  id: string;
  eventId: string;
  resourceId: string;
  quantityUsed: number | null;
  resource?: Resource;
};

const API = "http://localhost:3000";

// ---- Report row types (minimal, based on your current backend outputs) ----
type RDoubleBooked = {
  user_id: string;
  full_name: string | null;
  email: string;
  event1_id: string;
  event1_title: string;
  event2_id: string;
  event2_title: string;
};

type RExclusiveViolation = {
  resource_id: string;
  resource_name: string;
  event1_id: string;
  event1_title: string;
  event2_id: string;
  event2_title: string;
};

type RShareableViolation = {
  resource_id: string;
  name: string;
  max_concurrent: number | string;
  event_id: string;
  title: string;
  startsAt: string;
  concurrent_count: number | string;
};

type RConsumableViolation = {
  resource_id: string;
  name: string;
  total_quantity: number | string;
  event_id: string;
  title: string;
  used_quantity: number | string;
};

type RResourceHours = {
  resource_id: string;
  owner_org_id: string;
  name: string;
  total_hours_used: number;
};

type RUnderutilized = {
  id: string;
  name: string;
  hours_used: number;
};

type RParentBoundary = {
  parent_id: string;
  parent_title: string;
  child_id: string;
  child_title: string;
};

type RExternalThreshold = {
  id: string;
  title: string;
  external_count: number | string;
};

type REventTree = {
  id: string;
  parentEventId: string | null;
  title: string;
  depth: number;
};

export default function App() {
  // ---- mocked org switcher ----
  const [orgId, setOrgId] = useState<number>(2);

  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // --- allocation form state ---
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [quantityUsed, setQuantityUsed] = useState<string>(""); // only used for CONSUMABLE
  const [msg, setMsg] = useState<string>("");

  // ---- reports state ----
  const [rDoubleBooked, setRDoubleBooked] = useState<RDoubleBooked[]>([]);
  const [rExclusive, setRExclusive] = useState<RExclusiveViolation[]>([]);
  const [rShareable, setRShareable] = useState<RShareableViolation[]>([]);
  const [rConsumable, setRConsumable] = useState<RConsumableViolation[]>([]);
  const [rResourceHours, setRResourceHours] = useState<RResourceHours[]>([]);
  const [rUnderutilized, setRUnderutilized] = useState<RUnderutilized[]>([]);
  const [rParent, setRParent] = useState<RParentBoundary[]>([]);
  const [rExternal, setRExternal] = useState<RExternalThreshold[]>([]);
  const [rTree, setRTree] = useState<REventTree[]>([]);
  const [reportsMsg, setReportsMsg] = useState<string>("");

  async function loadEvents() {
    const res = await fetch(`${API}/events?orgId=${orgId}`);
    const data = await res.json();
    setEvents(data);
  }

  async function loadResources() {
    const res = await fetch(`${API}/resources?orgId=${orgId}`);
    const data = await res.json();
    setResources(data);
  }

  async function loadAllocations(eventId: string) {
    if (!eventId) {
      setAllocations([]);
      return;
    }
    const res = await fetch(`${API}/allocations?eventId=${eventId}`);
    const data = await res.json();
    setAllocations(data);
  }

  async function createAllocation() {
    setMsg("");

    if (!selectedEventId || !selectedResourceId) {
      setMsg("Pick an event and a resource first.");
      return;
    }

    const picked = resources.find((r) => r.id === selectedResourceId);
    const body: any = {
      eventId: Number(selectedEventId),
      resourceId: Number(selectedResourceId),
    };

    // If consumable, allow quantityUsed
    if (picked?.type === "CONSUMABLE") {
      const q = quantityUsed.trim() === "" ? NaN : Number(quantityUsed);
      if (!Number.isFinite(q) || q <= 0) {
        setMsg("For CONSUMABLE resources, enter a positive quantityUsed.");
        return;
      }
      body.quantityUsed = q;
    }

    const res = await fetch(`${API}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setMsg(`Allocate failed (${res.status}). ${text}`);
      return;
    }

    setMsg("Allocated");
    setQuantityUsed("");
    await loadAllocations(selectedEventId);
  }

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === selectedResourceId),
    [resources, selectedResourceId]
  );

  // ---- reports loaders ----
  async function loadReportsAll() {
    setReportsMsg("");
    try {
      // (a)
      const a = await fetch(`${API}/reports/double-booked-users`).then((r) =>
        r.json()
      );
      setRDoubleBooked(a);

      // (b)
      const ex = await fetch(`${API}/reports/resource-violations/exclusive`).then(
        (r) => r.json()
      );
      setRExclusive(ex);

      const sh = await fetch(`${API}/reports/resource-violations/shareable`).then(
        (r) => r.json()
      );
      setRShareable(sh);

      const co = await fetch(`${API}/reports/resource-violations/consumables`).then(
        (r) => r.json()
      );
      setRConsumable(co);

      // (c)
      const rh = await fetch(
        `${API}/reports/resource-hours?ownerOrgId=${orgId}`
      ).then((r) => r.json());
      setRResourceHours(rh);

      const un = await fetch(`${API}/reports/underutilized?hours=2`).then((r) =>
        r.json()
      );
      setRUnderutilized(un);

      // (d)
      const pb = await fetch(`${API}/reports/parent-boundary-violations`).then(
        (r) => r.json()
      );
      setRParent(pb);

      // (e) (demo threshold=2)
      const et = await fetch(`${API}/reports/external-threshold?threshold=2`).then(
        (r) => r.json()
      );
      setRExternal(et);

      // recursive CTE
      const t = await fetch(`${API}/reports/event-tree`).then((r) => r.json());
      setRTree(t);

      setReportsMsg("Reports refreshed");
    } catch (e: any) {
      setReportsMsg(`Reports failed: ${String(e?.message ?? e)}`);
    }
  }

  async function refreshResourceHoursMV() {
    setReportsMsg("");
    try {
      const res = await fetch(`${API}/reports/refresh-resource-hours`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setReportsMsg(`MV refresh failed (${res.status}): ${text}`);
        return;
      }
      setReportsMsg("Materialized view refreshed");
      // re-fetch hours for selected org
      const rh = await fetch(
        `${API}/reports/resource-hours?ownerOrgId=${orgId}`
      ).then((r) => r.json());
      setRResourceHours(rh);
    } catch (e: any) {
      setReportsMsg(`MV refresh failed: ${String(e?.message ?? e)}`);
    }
  }

  // initial load
  useEffect(() => {
    loadEvents();
    loadResources();
  }, []);

  // reload when org changes
  useEffect(() => {
    loadEvents();
    loadResources();
    setSelectedEventId("");
    setSelectedResourceId("");
    setAllocations([]);
    // refresh org-scoped reports
    setRResourceHours([]);
  }, [orgId]);

  // set defaults once events/resources arrive
  useEffect(() => {
    if (!selectedEventId && events.length) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedResourceId && resources.length)
      setSelectedResourceId(resources[0].id);
  }, [resources, selectedResourceId]);

  // refresh allocations when event changes
  useEffect(() => {
    if (selectedEventId) loadAllocations(selectedEventId);
  }, [selectedEventId]);

  return (
    <div style={{ padding: 30, maxWidth: 1000 }}>
      <h1>Booking System</h1>

      {/* Mocked org switcher */}
      <div style={{ marginBottom: 18 }}>
        <b>Organization:</b>{" "}
        <select
          value={orgId}
          onChange={(e) => setOrgId(Number(e.target.value))}
          style={{ marginLeft: 8 }}
        >
          <option value={1}>Org 1</option>
          <option value={2}>Org 2</option>
        </select>
        <span style={{ marginLeft: 10, opacity: 0.75 }}>
          (mocked switcher)
        </span>
      </div>

      <h2>Events</h2>
      <button onClick={loadEvents}>Refresh Events</button>

      <ul>
        {events.map((e) => (
          <li key={e.id} style={{ marginTop: 10 }}>
            <b>{e.title}</b>
            <br />
            {new Date(e.startsAt).toLocaleString()} –{" "}
            {new Date(e.endsAt).toLocaleString()}
          </li>
        ))}
      </ul>

      <hr style={{ margin: "30px 0" }} />

      <h2>Resources</h2>
      <button onClick={loadResources}>Refresh Resources</button>

      <ul>
        {resources.map((r) => (
          <li key={r.id} style={{ marginTop: 10 }}>
            <b>{r.name}</b> ({r.type}){" "}
            {r.isGlobal ? (
              <span style={{ opacity: 0.7 }}>[global]</span>
            ) : (
              <span style={{ opacity: 0.7 }}>[org {r.ownerOrgId}]</span>
            )}
            <div style={{ opacity: 0.8 }}>
              {r.type === "SHAREABLE" && <>maxConcurrent: {r.maxConcurrent ?? "-"}</>}
              {r.type === "CONSUMABLE" && <>totalQuantity: {r.totalQuantity ?? "-"}</>}
              {r.type === "EXCLUSIVE" && <>exclusive</>}
            </div>
          </li>
        ))}
      </ul>

      <hr style={{ margin: "30px 0" }} />

      <h2>Allocations</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Event:{" "}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ marginLeft: 6 }}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id} — {e.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Resource:{" "}
          <select
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            style={{ marginLeft: 6 }}
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.name} ({r.type}){r.isGlobal ? " [global]" : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedResource?.type === "CONSUMABLE" && (
          <label>
            quantityUsed:{" "}
            <input
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              placeholder="e.g. 2"
              style={{ width: 90, marginLeft: 6 }}
            />
          </label>
        )}

        <button onClick={createAllocation}>Allocate</button>

        {msg && <span style={{ opacity: 0.85 }}>{msg}</span>}
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={() => loadAllocations(selectedEventId)}>Refresh Allocations</button>
      </div>

      <ul>
        {allocations.map((a) => (
          <li key={a.id} style={{ marginTop: 10 }}>
            <b>allocation #{a.id}</b>{" "}
            <span style={{ opacity: 0.8 }}>
              (event {a.eventId}, resource {a.resourceId}
              {a.quantityUsed != null ? `, qty=${a.quantityUsed}` : ""})
            </span>
            {a.resource && (
              <div style={{ opacity: 0.85 }}>
                resource: {a.resource.name} ({a.resource.type})
              </div>
            )}
          </li>
        ))}
      </ul>

      <hr style={{ margin: "30px 0" }} />

      {/* Reports dashboard */}
      <h2>Reports</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={loadReportsAll}>Refresh All Reports</button>
        <button onClick={refreshResourceHoursMV}>Refresh Materialized View</button>
        {reportsMsg && <span style={{ opacity: 0.85 }}>{reportsMsg}</span>}
      </div>

      <h3 style={{ marginTop: 18 }}>(a) Double-booked users</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Event 1</th>
            <th>Event 2</th>
          </tr>
        </thead>
        <tbody>
          {rDoubleBooked.map((r, i) => (
            <tr key={i}>
              <td>{r.full_name ?? r.user_id}</td>
              <td>{r.email}</td>
              <td>{r.event1_id} — {r.event1_title}</td>
              <td>{r.event2_id} — {r.event2_title}</td>
            </tr>
          ))}
          {!rDoubleBooked.length && (
            <tr><td colSpan={4} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18 }}>(b) Resource constraint violations</h3>

      <h4>Exclusive overlaps</h4>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Event 1</th>
            <th>Event 2</th>
          </tr>
        </thead>
        <tbody>
          {rExclusive.map((r, i) => (
            <tr key={i}>
              <td>{r.resource_id} — {r.resource_name}</td>
              <td>{r.event1_id} — {r.event1_title}</td>
              <td>{r.event2_id} — {r.event2_title}</td>
            </tr>
          ))}
          {!rExclusive.length && (
            <tr><td colSpan={3} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h4 style={{ marginTop: 12 }}>Shareable over-allocated</h4>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Event</th>
            <th>Start</th>
            <th>Concurrent</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {rShareable.map((r, i) => (
            <tr key={i}>
              <td>{r.resource_id} — {r.name}</td>
              <td>{r.event_id} — {r.title}</td>
              <td>{r.startsAt}</td>
              <td>{r.concurrent_count}</td>
              <td>{r.max_concurrent}</td>
            </tr>
          ))}
          {!rShareable.length && (
            <tr><td colSpan={5} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h4 style={{ marginTop: 12 }}>Consumables exceeded</h4>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Event</th>
            <th>Used</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rConsumable.map((r, i) => (
            <tr key={i}>
              <td>{r.resource_id} — {r.name}</td>
              <td>{r.event_id} — {r.title}</td>
              <td>{r.used_quantity}</td>
              <td>{r.total_quantity}</td>
            </tr>
          ))}
          {!rConsumable.length && (
            <tr><td colSpan={4} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18 }}>(c) Utilization</h3>

      <h4>Resource hours (from MV) — Org {orgId}</h4>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Total hours used</th>
          </tr>
        </thead>
        <tbody>
          {rResourceHours.map((r, i) => (
            <tr key={i}>
              <td>{r.resource_id} — {r.name}</td>
              <td>{r.total_hours_used}</td>
            </tr>
          ))}
          {!rResourceHours.length && (
            <tr><td colSpan={2} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h4 style={{ marginTop: 12 }}>Underutilized resources (hours &lt; 2)</h4>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Hours used</th>
          </tr>
        </thead>
        <tbody>
          {rUnderutilized.map((r, i) => (
            <tr key={i}>
              <td>{r.id} — {r.name}</td>
              <td>{Number(r.hours_used).toFixed(2)}</td>
            </tr>
          ))}
          {!rUnderutilized.length && (
            <tr><td colSpan={2} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18 }}>(d) Parent boundary violations</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Parent</th>
            <th>Child</th>
          </tr>
        </thead>
        <tbody>
          {rParent.map((r, i) => (
            <tr key={i}>
              <td>{r.parent_id} — {r.parent_title}</td>
              <td>{r.child_id} — {r.child_title}</td>
            </tr>
          ))}
          {!rParent.length && (
            <tr><td colSpan={2} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18 }}>(e) External attendees threshold (threshold=2)</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Event</th>
            <th>External count</th>
          </tr>
        </thead>
        <tbody>
          {rExternal.map((r, i) => (
            <tr key={i}>
              <td>{r.id} — {r.title}</td>
              <td>{r.external_count}</td>
            </tr>
          ))}
          {!rExternal.length && (
            <tr><td colSpan={2} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18 }}>Recursive CTE: Event tree</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Depth</th>
            <th>Event</th>
            <th>Parent</th>
          </tr>
        </thead>
        <tbody>
          {rTree.map((r, i) => (
            <tr key={i}>
              <td>{r.depth}</td>
              <td>{r.id} — {r.title}</td>
              <td>{r.parentEventId ?? "-"}</td>
            </tr>
          ))}
          {!rTree.length && (
            <tr><td colSpan={3} style={{ opacity: 0.7 }}>No rows</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

