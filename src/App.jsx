import React, { useState, useEffect, useCallback } from "react";
// import { getPgliteInstance } from './pgliteInstance';
import "./Styles.css";

function App() {
  const [pglite, setPglite] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("SELECT * FROM patients");
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [initError, setInitError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "male",
    email: "",
    phone: "",
    address: "",
  });

  const SYNC_CHANNEL = "patient-db-sync-v3";
  const BROADCAST_CHANNEL = "patient-db-broadcast";

  const refreshPatients = useCallback(async (db) => {
    try {
      const result = await db.query(
        "SELECT * FROM patients ORDER BY registered_at DESC"
      );
      setPatients(result.rows);
    } catch (err) {
      console.error("Error refreshing patients:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let dbInstance = null;
    let broadcastChannel = null;
    const initializeDatabase = async (retries = 3) => {
      try {
        console.log("Fetching fresh WASM...");
        const response = await fetch("/pglite.wasm", { cache: "no-store" });
        const wasmBinary = await response.arrayBuffer(); // must be fresh

        console.log("Creating new PGlite instance...");
        const { PGlite } = await import("@electric-sql/pglite");
        dbInstance = new PGlite("idb://patient-db", {
          persistence: "persistent",
          wasm: wasmBinary,
        });

        console.log("Testing DB connection...");
        await dbInstance.query("SELECT 1");

        console.log("Creating patients table...");
        await dbInstance.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        if (isMounted) {
          setPglite(dbInstance);
          setIsDbReady(true);
          await refreshPatients(dbInstance);
        }
      } catch (err) {
        if (retries > 0) {
          console.warn(`Retrying DB init... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return initializeDatabase(retries - 1);
        } else {
          console.error("Final DB init failure:", err);
          if (isMounted) {
            setInitError("DB init failed. Refresh the page.");
            setIsDbReady(false);
          }
        }
      }
    };

    const handleStorageChange = async (event) => {
      if (event.key === SYNC_CHANNEL && dbInstance) {
        console.log("Storage event detected, refreshing patients...");
        await refreshPatients(dbInstance);
      }
    };

    const setupBroadcastChannel = () => {
      if (broadcastChannel) {
        broadcastChannel.close(); // Close any existing channel
      }

      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);

      const handleBroadcastMessage = async (event) => {
        if (event.data?.type === "db-update" && dbInstance) {
          console.log("Received broadcast message, refreshing patients...");
          await refreshPatients(dbInstance);
        }
      };

      broadcastChannel.addEventListener("message", handleBroadcastMessage);

      return () => {
        console.log("Cleaning up broadcast channel...");
        broadcastChannel.removeEventListener("message", handleBroadcastMessage);
        broadcastChannel.close();
      };
    };

    const cleanupBroadcast = setupBroadcastChannel();
    window.addEventListener("storage", handleStorageChange);
    initializeDatabase();

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      cleanupBroadcast();
      if (broadcastChannel) broadcastChannel.close();
      if (dbInstance) dbInstance.close().catch(console.error);
    };
  }, [refreshPatients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pglite) return;

    try {
      await pglite.query(
        `INSERT INTO patients (name, age, gender, email, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          formData.name,
          parseInt(formData.age),
          formData.gender,
          formData.email,
          formData.phone,
          formData.address,
        ]
      );

      setFormData({
        name: "",
        age: "",
        gender: "male",
        email: "",
        phone: "",
        address: "",
      });
      await refreshPatients(pglite);

      localStorage.setItem(SYNC_CHANNEL, Date.now().toString());
      const newBroadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
      newBroadcastChannel.postMessage({ type: "db-update" });
      newBroadcastChannel.close();

      alert("Patient registered successfully!");
    } catch (err) {
      console.error("Error registering patient:", err);
      alert("Failed to register patient");
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!pglite) return;

    setQueryError(null);
    setQueryResult(null);

    try {
      const result = await pglite.query(query);
      setQueryResult(result.rows);
    } catch (err) {
      console.error("Error executing query:", err);
      setQueryError(err instanceof Error ? err.message : String(err));
    }
  };

  if (initError) {
    return (
      <div className="app">
        <div className="error-view">
          <h2>Initialization Error</h2>
          <p>{initError}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="app">
        <div className="loading-view">
          <h2>Initializing Database...</h2>
          <div className="spinner"></div>
          <p>Please wait while we set up the database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Patient Registration System</h1>
      </header>

      <main>
        <section className="registration-section">
          <h2>Register New Patient</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Age:</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Gender:</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Address:</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
            <button type="submit">Register Patient</button>
          </form>
        </section>

        <section className="query-section">
          <h2>SQL Query Interface</h2>
          <form onSubmit={handleQuerySubmit}>
            <div className="form-group">
              <label>SQL Query:</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={5}
              />
            </div>
            <button type="submit">Execute Query</button>
          </form>

          {queryError && (
            <div className="error-message">
              <h3>Error:</h3>
              <pre>{queryError}</pre>
            </div>
          )}

          {queryResult && (
            <div className="query-results">
              <h3>Results:</h3>
              <pre>{JSON.stringify(queryResult, null, 2)}</pre>
            </div>
          )}
        </section>

        <section className="patients-section">
          <h2>Registered Patients ({patients.length})</h2>
          {patients.length === 0 ? (
            <div className="empty-state">
              <p>No patients registered yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.id}</td>
                      <td>{patient.name}</td>
                      <td>{patient.age}</td>
                      <td>{patient.gender}</td>
                      <td>{patient.email}</td>
                      <td>{patient.phone}</td>
                      <td>
                        {new Date(patient.registered_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
