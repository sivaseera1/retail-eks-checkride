import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Server,
  Cloud,
  Laptop,
  Plus,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

export default function App() {
  const [orders, setOrders] = useState([]);
  const [health, setHealth] = useState("Checking");
  const [ready, setReady] = useState("Checking");
  const [version, setVersion] = useState("—");
  const [instance, setInstance] = useState("—");
  const [isReady, setIsReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const [customer, setCustomer] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");

  // Detect whether backend is running in Kubernetes Pod or Local machine
  const isCloud = instance.includes("retail-order-api") || instance.length > 15;

  async function fetchData() {
    setLoading(true);
    try {
      const [hRes, rRes, vRes, oRes] = await Promise.all([
        fetch(`${API}/health`).catch(() => null),
        fetch(`${API}/ready`).catch(() => null),
        fetch(`${API}/version`).catch(() => null),
        fetch(`${API}/orders`).catch(() => null),
      ]);

      setHealth(hRes && hRes.ok ? "Alive (200)" : hRes ? `Error (${hRes.status})` : "Offline");
      setReady(rRes && rRes.ok ? "Ready (200)" : rRes ? `Unready (${rRes.status})` : "Offline");
      setIsReady(rRes && rRes.ok);

      if (vRes && vRes.ok) {
        const v = await vRes.json();
        setVersion(v.version || "1.0.0");
        setInstance(v.instance || "local");
      }

      if (oRes && oRes.ok) {
        const o = await oRes.json();
        setOrders(o);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  async function toggleReadiness() {
    setToggling(true);
    try {
      await fetch(`${API}/ops/readiness?ready=${!isReady}`, { method: "POST" });
      await fetchData();
    } finally {
      setToggling(false);
    }
  }

  async function handleAddOrder(e) {
    e.preventDefault();
    if (!customer || !item || !amount) return;
    try {
      await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, item, amount: parseFloat(amount), status: "Processing" }),
      });
      setCustomer("");
      setItem("");
      setAmount("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="title-area">
          <div className="logo-badge">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1>Retail Reliability Console</h1>
            <p className="subtitle">Amazon EKS & Local Checkride Verification Dashboard</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Environment Indicator: Local vs Cloud */}
          <div className={`env-badge ${isCloud ? "env-cloud" : "env-local"}`}>
            {isCloud ? <Cloud size={16} /> : <Laptop size={16} />}
            <span>{isCloud ? "Running in Cloud (Amazon EKS - siva-p)" : "Running Locally (127.0.0.1:8080)"}</span>
          </div>

          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {/* Telemetry Cards */}
      <div className="grid-cards">
        <div className="card">
          <div className="card-header">
            <span>Target Environment</span>
            {isCloud ? <Cloud size={18} className="text-purple" /> : <Laptop size={18} className="text-blue" />}
          </div>
          <div className="card-value">{isCloud ? "Amazon EKS" : "Local Machine"}</div>
          <div className="card-meta">
            Host / Pod: <code>{instance}</code>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Liveness Probe (/health)</span>
            <Activity size={18} className={health.includes("200") ? "text-green" : "text-red"} />
          </div>
          <div className="card-value">
            <span className={`status-pill ${health.includes("200") ? "status-green" : "status-red"}`}>
              {health}
            </span>
          </div>
          <div className="card-meta">Kubelet container restart guard</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Readiness Probe (/ready)</span>
            <CheckCircle2 size={18} className={ready.includes("200") ? "text-green" : "text-red"} />
          </div>
          <div className="card-value">
            <span className={`status-pill ${ready.includes("200") ? "status-green" : "status-red"}`}>
              {ready}
            </span>
          </div>
          <div className="card-meta">Controls Service endpoint routing</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Application Version</span>
            <Server size={18} className="text-purple" />
          </div>
          <div className="card-value">v{version}</div>
          <div className="card-meta">Last sync: {lastUpdated || "connecting..."}</div>
        </div>
      </div>

      {/* Scenario Demo Box */}
      <div className="scenario-box">
        <div className="scenario-info">
          <h3>
            <AlertTriangle size={18} className="text-amber" /> Checkride Demonstration: Readiness Failure
          </h3>
          <p>
            Simulate a readiness outage (HTTP 503 on <code>/ready</code>) while keeping liveness healthy (HTTP 200 on <code>/health</code>).
            Kubernetes immediately isolates this Pod from receiving customer traffic without triggering a restart crash loop.
          </p>
        </div>
        <button
          className={`btn ${isReady ? "btn-danger" : "btn-success"}`}
          onClick={toggleReadiness}
          disabled={toggling}
        >
          {isReady ? "Simulate Readiness Failure (503)" : "Restore Pod Readiness (200)"}
        </button>
      </div>

      {/* Orders Management */}
      <div className="orders-section">
        <div className="orders-header">
          <h2>Active Retail Orders ({orders.length})</h2>
        </div>

        {/* Inline Add Order */}
        <form className="order-form" onSubmit={handleAddOrder}>
          <input
            type="text"
            placeholder="Customer Name"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Product / Item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={15} /> Add Order
          </button>
        </form>

        {/* Orders Table */}
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Tracking</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer}</td>
                  <td>{o.item}</td>
                  <td>₹{Number(o.amount).toLocaleString("en-IN")}</td>
                  <td><span className="tracking-code">{o.tracking || "—"}</span></td>
                  <td>
                    <span className={`status-badge status-${(o.status || "processing").toLowerCase()}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
