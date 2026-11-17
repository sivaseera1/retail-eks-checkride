import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  GitBranch,
  Layers,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Workflow,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";
const STATUS_OPTIONS = ["Processing", "Shipped", "Delivered", "Delayed"];

const nav = [
  ["OPERATIONS", [["Overview", LayoutDashboard], ["Orders", ShoppingBag], ["Shipment tracking", Truck]]],
  ["RELIABILITY", [["Application health", Activity], ["Deployments", GitBranch]]],
];

const headings = {
  Overview: ["Operations overview", "Live retail order tracking and application reliability telemetry."],
  Orders: ["Order management", "Create, search, inspect and update customer orders in real time."],
  "Shipment tracking": ["Shipment tracking", "Track live fulfilment milestones and delivery exceptions per order."],
  "Application health": ["Application reliability", "Monitor live API liveness/readiness probes, scaling policy and Pod controls."],
  Deployments: ["Deployments & recovery", "Manage zero-downtime rolling updates and automated rollback recovery."],
};

const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

function Status({ children }) {
  const c =
    children === "Delivered" || children === "Healthy" || children === "Ready" || children === "Succeeded" || children === "Configured"
      ? "green"
      : children === "Processing" || children === "Warning" || children === "Pending" || children === "Degraded"
      ? "amber"
      : children === "Failed" || children === "Unhealthy" || children === "Delayed"
      ? "red"
      : "blue";
  return (
    <span className={"status " + c}>
      <i /> {children}
    </span>
  );
}

function Metric({ label, value, icon: Icon, sub }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="metric-bottom">
        <span>{sub}</span>
      </div>
    </div>
  );
}

function Panel({ title, sub, action, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function HealthRow({ name, value, good }) {
  return (
    <div className="health-row">
      <span>{name}</span>
      <span className={good ? "good" : ""}>{value}</span>
    </div>
  );
}

function OrderTable({ rows, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ORDER</th>
            <th>CUSTOMER</th>
            <th>PRODUCT</th>
            <th>STATUS</th>
            <th>AMOUNT</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td><b>#{o.id}</b></td>
              <td>{o.customer}</td>
              <td>{o.item}</td>
              <td><Status>{o.status}</Status></td>
              <td><b>{money(o.amount)}</b></td>
              <td>
                <button className="row-action" onClick={() => onSelect(o.id)}>
                  Details <ChevronRight size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">No matching orders found.</div>}
    </div>
  );
}

function Timeline({ order }) {
  if (!order) return <div className="empty">Select an order to inspect shipment milestones.</div>;
  const stageIndex =
    order.status === "Delivered" ? 4 : order.status === "Shipped" ? 3 : order.status === "Delayed" ? 3 : 1;
  const steps = [
    ["Order placed", order.updated || "Recorded in API"],
    ["Payment & fulfilment confirmed", `Tracking ID: ${order.tracking}`],
    ["Dispatched from fulfilment centre", stageIndex >= 2 ? "Completed" : "Pending dispatch"],
    [order.status === "Delayed" ? "Carrier delay reported" : "In transit", stageIndex >= 3 ? order.status : "Awaiting carrier scan"],
    ["Delivered", order.status === "Delivered" ? "Completed" : "Pending delivery"],
  ];
  return (
    <div className="timeline">
      {steps.map(([a, b], i) => (
        <div className="timeline-item" key={a}>
          <i className={i <= stageIndex ? "done" : ""} />
          <div>
            <b>{a}</b>
            <small>{b}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Overview");
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [api, setApi] = useState("Checking");
  const [liveness, setLiveness] = useState("Checking");
  const [readiness, setReadiness] = useState("Checking");
  const [isReady, setIsReady] = useState(true);
  const [version, setVersion] = useState("—");
  const [instance, setInstance] = useState("—");
  const [orderDetail, setOrderDetail] = useState(null);
  const [trackedId, setTrackedId] = useState("");
  const [lastCheck, setLastCheck] = useState("Not checked yet");
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ id: "", customer: "", item: "", amount: "", status: "Processing" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function checkApi() {
    setApi("Checking");
    try {
      const signal = AbortSignal.timeout(2500);
      const [h, r, v, o] = await Promise.all([
        fetch(API + "/health", { signal }),
        fetch(API + "/ready", { signal }),
        fetch(API + "/version", { signal }),
        fetch(API + "/orders", { signal }),
      ]);
      const ver = v.ok ? await v.json() : null;
      if (ver) {
        setVersion(ver.version || "—");
        setInstance(ver.instance || "—");
      }
      if (o.ok) {
        const liveOrders = await o.json();
        if (Array.isArray(liveOrders)) {
          setOrders(liveOrders);
          if (!trackedId && liveOrders.length) {
            setTrackedId(liveOrders[0].id);
          }
        }
      }
      setLiveness(h.ok ? "Responding (200)" : `Error (${h.status})`);
      setReadiness(r.ok ? "Ready (200)" : `Unready (${r.status})`);
      setIsReady(r.ok);

      if (h.ok && r.ok) {
        setApi("Connected");
      } else if (h.ok && !r.ok) {
        setApi("Degraded");
      } else {
        setApi("Unhealthy");
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch {
      setApi("Offline");
      setLiveness("Unreachable");
      setReadiness("Unreachable");
      setVersion("—");
      setInstance("—");
      setLastCheck(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    checkApi();
    const t = setInterval(checkApi, 15000);
    return () => clearInterval(t);
  }, []);

  async function loadOrder(id) {
    try {
      const r = await fetch(API + "/orders/" + id, { signal: AbortSignal.timeout(2500) });
      if (!r.ok) throw Error();
      setOrderDetail(await r.json());
    } catch {
      setOrderDetail(orders.find((o) => o.id === id) || null);
    }
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    setFormError("");
    const amountNum = Number(form.amount);
    if (!form.customer.trim() || !form.item.trim() || !amountNum || amountNum <= 0) {
      setFormError("Enter a valid customer name, product item, and positive amount.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer: form.customer.trim(),
        item: form.item.trim(),
        amount: amountNum,
        status: form.status,
      };
      if (form.id.trim()) payload.id = form.id.trim();

      const res = await fetch(API + "/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.detail || "Unable to create order.");
      } else {
        setOrders((prev) => [data, ...prev]);
        setOrderDetail(data);
        setTrackedId(data.id);
        setForm({ id: "", customer: "", item: "", amount: "", status: "Processing" });
        setShowCreate(false);
      }
    } catch {
      setFormError("Unable to reach the Order API.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(orderId, newStatus) {
    try {
      const res = await fetch(API + "/orders/" + orderId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (orderDetail && orderDetail.id === orderId) {
        setOrderDetail(updated);
      }
    } catch {
      // ignore transient network failure; next refresh will sync
    }
  }

  async function toggleReadiness() {
    try {
      await fetch(`${API}/ops/readiness?ready=${!isReady}`, { method: "POST" });
      await checkApi();
    } catch {
      // handled by checkApi status
    }
  }

  const filtered = orders.filter((o) =>
    (o.id + o.customer + o.item + o.status).toLowerCase().includes(query.toLowerCase())
  );

  const totalCount = orders.length;
  const inTransitCount = orders.filter((o) => o.status === "Shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
  const processingCount = orders.filter((o) => o.status === "Processing").length;
  const delayedCount = orders.filter((o) => o.status === "Delayed").length;
  const trackedOrder = orders.find((o) => o.id === trackedId) || orders[0] || null;

  function csv() {
    const rows = [
      ["Order ID", "Customer", "Item", "Status", "Amount", "Tracking", "Updated"],
      ...orders.map((o) => [o.id, o.customer, o.item, o.status, o.amount, o.tracking, o.updated]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "retail-orders.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const heading = headings[page] || headings.Overview;
  const apiBadge =
    api === "Connected" ? "Healthy" : api === "Degraded" ? "Degraded" : api === "Checking" ? "Pending" : "Unhealthy";

  return (
    <div className="app-shell">
      <div className={"sidebar-backdrop " + (menu ? "show" : "")} onClick={() => setMenu(false)} />
      <aside className={"sidebar " + (menu ? "open " : "") + (collapsed ? "collapsed" : "")}>
        <div className="brand">
          <div className="brand-icon">N</div>
          {!collapsed && (
            <div>
              <b>northstar<span>.</span></b>
              <small>RETAIL RELIABILITY</small>
            </div>
          )}
          <button
            type="button"
            className="collapse-btn"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {!collapsed && (
          <>
            <button
              type="button"
              className="workspace workspace-btn"
              onClick={() => setShowWorkspaceInfo(!showWorkspaceInfo)}
              aria-expanded={showWorkspaceInfo}
            >
              <div className="workspace-logo">NR</div>
              <div>
                <b>Northstar Retail</b>
                <small>ap-south-1 · siva-p</small>
              </div>
              <ChevronDown size={14} />
            </button>
            {showWorkspaceInfo && (
              <div className="workspace-info">
                <div><span>Cluster</span><b>eks-training</b></div>
                <div><span>Region</span><b>ap-south-1</b></div>
                <div><span>Namespace</span><b>siva-p</b></div>
                <div><span>API</span><b>{api}</b></div>
              </div>
            )}
          </>
        )}
        {nav.map(([group, items]) => (
          <div className="nav-group" key={group}>
            {!collapsed && <label>{group}</label>}
            {items.map(([name, Icon]) => (
              <button
                key={name}
                title={name}
                className={"nav-item " + (page === name ? "active" : "")}
                onClick={() => {
                  setPage(name);
                  setMenu(false);
                }}
              >
                <Icon size={17} />
                {!collapsed && <span>{name}</span>}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenu(!menu)}>
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} /> <b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="environment">
              <i /> {api === "Connected" ? `LIVE API · v${version}` : api === "Degraded" ? `UNREADY · v${version}` : "API OFFLINE"}
            </span>
            <button className="icon-button" title="Refresh API status" onClick={checkApi}>
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">RETAIL APPLICATION PLATFORM</div>
              <h1>{heading[0]}</h1>
              <p>{heading[1]}</p>
            </div>
            <div className="heading-actions">
              <button className="button secondary" onClick={checkApi}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="button primary" onClick={csv}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {page === "Overview" && (
            <>
              <div className={"connection " + (api === "Connected" ? "connected" : "")}>
                <div className={"connection-icon " + (api !== "Connected" ? "warning" : "")}>
                  <Activity size={18} />
                </div>
                <div>
                  <b>
                    {api === "Connected"
                      ? "Order API connected & ready"
                      : api === "Degraded"
                      ? "API alive (/health 200) — Readiness failing (/ready 503)"
                      : api === "Checking"
                      ? "Checking application API"
                      : "Order API unreachable"}
                  </b>
                  <p>
                    {api === "Connected" || api === "Degraded"
                      ? `Version ${version} · Serving Instance ${instance} · Last checked ${lastCheck}`
                      : `Start the FastAPI backend at ${API} to load live orders and probe telemetry.`}
                  </p>
                </div>
                <Status>{apiBadge}</Status>
              </div>

              <div className="metrics">
                <Metric label="Total orders" value={totalCount} sub="Live backend records" icon={ShoppingBag} />
                <Metric label="Orders in transit" value={inTransitCount} sub="Status: Shipped" icon={Truck} />
                <Metric label="Delivered" value={deliveredCount} sub="Completed fulfilment" icon={CheckCircle2} />
                <Metric label="Needs attention" value={processingCount + delayedCount} sub={`${processingCount} processing · ${delayedCount} delayed`} icon={AlertTriangle} />
              </div>

              <div className="grid-main">
                <Panel
                  title="Recent orders"
                  sub="Live customer order records from the backend API"
                  action={
                    <button className="text-button" onClick={() => setPage("Orders")}>
                      Manage orders <ChevronRight size={13} />
                    </button>
                  }
                >
                  <OrderTable
                    rows={filtered.slice(0, 5)}
                    onSelect={(id) => {
                      loadOrder(id);
                      setPage("Orders");
                    }}
                  />
                </Panel>
                <Panel title="Reliability snapshot" sub="Live API probes & EKS control targets">
                  <div className="reliability-list">
                    <HealthRow name="API liveness (/health)" value={liveness} good={liveness.startsWith("Responding")} />
                    <HealthRow name="API readiness (/ready)" value={readiness} good={readiness.startsWith("Ready")} />
                    <HealthRow name="Serving instance" value={instance} good={instance !== "—"} />
                    <HealthRow name="Release version" value={version} good={version !== "—"} />
                    <HealthRow name="Kubernetes cluster" value="Requires live EKS context" />
                  </div>
                  <div className="note">
                    <ShieldCheck size={15} /> Live API health, readiness, version, and order counts come directly from the FastAPI service.
                  </div>
                </Panel>
              </div>

              <div className="grid-main lower">
                <Panel title="Reliability priorities" sub="Customer requirements mapped to AWS & EKS controls">
                  <div className="priority">
                    <span className="priority-icon purple"><Layers size={16} /></span>
                    <div>
                      <b>Keep customer traffic on healthy Pods</b>
                      <small>3 replicas · Topology spread · Readiness probe</small>
                    </div>
                    <Status>Configured</Status>
                  </div>
                  <div className="priority">
                    <span className="priority-icon blue"><Workflow size={16} /></span>
                    <div>
                      <b>Minimize release disruption</b>
                      <small>RollingUpdate · maxUnavailable 0 · preStop 5s</small>
                    </div>
                    <Status>Configured</Status>
                  </div>
                  <div className="priority">
                    <span className="priority-icon orange"><RefreshCw size={16} /></span>
                    <div>
                      <b>Recover from failed releases</b>
                      <small>Rollout + /ready smoke test · kubectl rollout undo</small>
                    </div>
                    <Status>Configured</Status>
                  </div>
                </Panel>
                <Panel title="Operations & recovery runbook" sub="Standard release verification workflow">
                  <div className="runstep"><b>01</b><div><strong>Verify healthy baseline</strong><small>3 replicas · /health, /ready, /version · live order lookup</small></div></div>
                  <div className="runstep"><b>02</b><div><strong>Isolate unready instances</strong><small>Readiness 503 removes endpoint while liveness stays 200</small></div></div>
                  <div className="runstep"><b>03</b><div><strong>Execute rolling deployment</strong><small>maxUnavailable 0 · maxSurge 1 · zero dropped requests</small></div></div>
                  <div className="runstep"><b>04</b><div><strong>Recover failed releases</strong><small>Automatic rollback + post-undo readiness verification</small></div></div>
                </Panel>
              </div>
            </>
          )}

          {page === "Orders" && (
            <Panel
              title="All customer orders"
              sub="Create new orders, search live records, or update fulfilment status."
              action={<span className="muted-tag">{filtered.length} records</span>}
            >
              <div className="toolbar">
                <div className="searchbox">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search order ID, customer, product, status..."
                  />
                </div>
                <div className="heading-actions">
                  <button className="button primary" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={14} /> {showCreate ? "Close Form" : "New Order"}
                  </button>
                  <button className="button secondary" onClick={csv}>
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>

              {showCreate && (
                <form className="order-form" onSubmit={handleCreateOrder}>
                  <input
                    placeholder="Order ID (optional)"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                  />
                  <input
                    placeholder="Customer name *"
                    required
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  />
                  <input
                    placeholder="Product item *"
                    required
                    value={form.item}
                    onChange={(e) => setForm({ ...form, item: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Amount (INR) *"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="button primary" type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Order"}
                  </button>
                </form>
              )}
              {formError && <p className="form-error">{formError}</p>}

              <OrderTable rows={filtered} onSelect={loadOrder} />

              {orderDetail && (
                <div className="detail-box">
                  <button className="close" onClick={() => setOrderDetail(null)}>×</button>
                  <b>Order #{orderDetail.id}</b>
                  <p>{orderDetail.customer} · {orderDetail.item}</p>
                  <Status>{orderDetail.status}</Status>
                  <p>
                    Tracking: {orderDetail.tracking} · Amount: {money(orderDetail.amount)} · Updated: {orderDetail.updated}
                  </p>
                  <div className="detail-actions">
                    <span>Update status:</span>
                    <select
                      value={orderDetail.status}
                      onChange={(e) => handleStatusUpdate(orderDetail.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Panel>
          )}

          {page === "Shipment tracking" && (
            <>
              <div className="metrics">
                <Metric label="In transit" value={inTransitCount} sub="Status: Shipped" icon={Truck} />
                <Metric label="Processing" value={processingCount} sub="Awaiting dispatch" icon={Package} />
                <Metric label="Delivered" value={deliveredCount} sub="Completed" icon={CheckCircle2} />
                <Metric label="Delayed" value={delayedCount} sub="Requires follow-up" icon={Clock} />
              </div>
              <div className="grid-main">
                <Panel
                  title={trackedOrder ? `Shipment timeline · Order #${trackedOrder.id}` : "Shipment timeline"}
                  sub={trackedOrder ? `${trackedOrder.customer} · ${trackedOrder.item}` : "Select an order"}
                  action={
                    <select
                      className="shipment-select"
                      value={trackedOrder ? trackedOrder.id : ""}
                      onChange={(e) => setTrackedId(e.target.value)}
                    >
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id} · {o.customer} ({o.status})
                        </option>
                      ))}
                    </select>
                  }
                >
                  <Timeline order={trackedOrder} />
                </Panel>
                <Panel title="Fulfilment status breakdown" sub="Computed live from current orders">
                  <HealthRow name="Processing" value={`${processingCount} orders`} />
                  <HealthRow name="In transit (Shipped)" value={`${inTransitCount} orders`} good={inTransitCount > 0} />
                  <HealthRow name="Delivered" value={`${deliveredCount} orders`} good={deliveredCount > 0} />
                  <HealthRow name="Delayed" value={`${delayedCount} orders`} />
                </Panel>
              </div>
            </>
          )}

          {page === "Application health" && (
            <>
              <div className={"connection " + (api === "Connected" ? "connected" : "")}>
                <div className={"connection-icon " + (api !== "Connected" ? "warning" : "")}>
                  <Activity size={18} />
                </div>
                <div>
                  <b>Application API: {api}</b>
                  <p>Backend: {API} · Instance: {instance} · Last checked: {lastCheck} · Version: {version}</p>
                </div>
                <div className="heading-actions">
                  <button className="button secondary" onClick={toggleReadiness} disabled={api === "Offline"}>
                    {isReady ? "Simulate Unready (503)" : "Restore Ready (200)"}
                  </button>
                  <button className="button secondary" onClick={checkApi}>Run checks</button>
                </div>
              </div>

              <div className="metrics">
                <Metric label="Desired replicas" value="3" sub="Deployment target" icon={Layers} />
                <Metric label="Liveness (/health)" value={liveness.startsWith("Responding") ? "200 OK" : liveness} sub="Process check" icon={CheckCircle2} />
                <Metric label="Min available (PDB)" value="2" sub="Voluntary disruption guard" icon={ShieldCheck} />
                <Metric label="HPA ceiling" value="8" sub="Target 70% CPU" icon={Activity} />
              </div>

              <div className="grid-main">
                <Panel title="Application health checks" sub="Live FastAPI probe responses">
                  <HealthRow name="GET /health · Startup & Liveness" value={liveness} good={liveness.startsWith("Responding")} />
                  <HealthRow name="GET /ready · Readiness" value={readiness} good={readiness.startsWith("Ready")} />
                  <HealthRow name="GET /version · Release identity" value={version} good={version !== "—"} />
                  <HealthRow name="Serving Pod / Host" value={instance} good={instance !== "—"} />
                  <HealthRow name="Kubernetes Pod status" value="Requires live EKS connection" />
                </Panel>
                <Panel title="Reliability controls" sub="How Kubernetes protects customer requests">
                  <div className="explain"><b>Startup probe (/health)</b><p>Shields slow-starting containers (up to 90s) before liveness or readiness checks act.</p></div>
                  <div className="explain"><b>Readiness probe (/ready)</b><p>Removes an unready Pod from Service endpoints so customer traffic stops immediately without restarting the process.</p></div>
                  <div className="explain"><b>Liveness probe (/health)</b><p>Restarts a hung container only after repeated failures (3 × 10s).</p></div>
                </Panel>
              </div>

              <div className="grid-main">
                <Panel title="Scaling & placement policy" sub="Configured in deploy/kubernetes/optional/hpa.yaml and base/deployment.yaml">
                  <HealthRow name="HPA replica range" value="3 – 8 Pods" />
                  <HealthRow name="CPU utilization target" value="70% (request 100m)" />
                  <HealthRow name="Topology spread" value="Zone + Hostname (maxSkew 1)" />
                  <HealthRow name="Graceful termination" value="30s grace + 5s preStop" />
                  <div className="note">HPA scales Pods (requires metrics-server), not worker nodes. Node autoscaling is a separate cluster-level capability.</div>
                </Panel>
                <Panel title="Operational alerts" sub="Signals monitored in production">
                  <HealthRow name="Readiness probe failures" value="Configured alert target" />
                  <HealthRow name="Deployment rollout timeout" value="Configured alert target" />
                  <HealthRow name="CPU / memory pressure" value="Configured alert target" />
                  <div className="note">Connect CloudWatch Container Insights or Prometheus in the target EKS cluster for live alert streams.</div>
                </Panel>
              </div>
            </>
          )}

          {page === "Deployments" && (
            <>
              <div className="metrics">
                <Metric label="Current version" value={version} sub="Live API version" icon={GitBranch} />
                <Metric label="Desired replicas" value="3" sub="Deployment configuration" icon={Layers} />
                <Metric label="Update strategy" value="Rolling" sub="maxUnavailable 0 · maxSurge 1" icon={Workflow} />
                <Metric label="Recovery method" value="Rollback" sub="Pipeline validation" icon={RefreshCw} />
              </div>
              <div className="grid-main">
                <Panel title="Release pipeline" sub="Build, deploy, validate and recover">
                  {[
                    "Run unit tests (pytest) and frontend build check",
                    "Assume AWS role via GitHub OIDC (no static keys)",
                    "Build non-root container tagged with commit SHA and push to ECR",
                    "Update EKS Deployment image in namespace siva-p",
                    "Wait for rollout status (180s) & run /ready smoke test",
                    "Trigger kubectl rollout undo + verify recovery on failure",
                  ].map((s, i) => (
                    <div className="runstep" key={s}>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <div>
                        <strong>{s}</strong>
                        <small>{i === 5 ? "Automatic rollback + post-undo status verification" : "GitHub Actions workflow stage"}</small>
                      </div>
                      <Status>Configured</Status>
                    </div>
                  ))}
                </Panel>
                <Panel title="Release safety policy" sub="Controls that eliminate deployment downtime">
                  <HealthRow name="Rolling update" value="Configured" good />
                  <HealthRow name="maxUnavailable" value="0" />
                  <HealthRow name="maxSurge" value="1" />
                  <HealthRow name="Progress deadline" value="180 sec" />
                  <HealthRow name="Revision history" value="5 revisions" />
                  <div className="note">
                    A Kubernetes Deployment pauses a stalled rollout, but does not automatically revert application-level failures. The CI/CD workflow explicitly runs rollback and verifies recovery.
                  </div>
                </Panel>
              </div>
              <Panel title="Failed release recovery" sub="Operational recovery sequence">
                <div className="runstep"><b>01</b><div><strong>Detect and inspect the failed release</strong><small>Check rollout status, Pod events, logs and ReplicaSets.</small></div></div>
                <div className="runstep"><b>02</b><div><strong>Restore the previous stable revision</strong><small>kubectl rollout undo deployment/retail-order-api -n siva-p</small></div></div>
                <div className="runstep"><b>03</b><div><strong>Verify service recovery</strong><small>Confirm rollout status, ready endpoints, /health, /ready and order lookup.</small></div></div>
              </Panel>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
