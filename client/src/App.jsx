import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = "http://localhost:5000/api";

  // Fetch databases on mount
  useEffect(() => {
    fetchDatabases();
  }, []);

  // Fetch tables when database is selected
  useEffect(() => {
    if (selectedDb) {
      fetchTables(selectedDb);
      setSelectedTable(null);
      setTableData(null);
      setColumns([]);
    }
  }, [selectedDb]);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/databases`);
      const data = await response.json();
      setDatabases(data.databases);
      setError(null);
    } catch (err) {
      setError("Failed to fetch databases: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (dbName) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${dbName}/tables`);
      const data = await response.json();
      setTables(data.tables || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch tables: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (dbName, tableName) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${dbName}/${tableName}`);
      const data = await response.json();
      setTableData(data.data || []);
      setColumns(data.columns || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch table data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    if (selectedDb) {
      fetchTableData(selectedDb, tableName);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Multi Database Viewer</h1>
        <p>View data from multiple MySQL databases</p>
      </header>

      <main className="app-main">
        {error && <div className="error-message">⚠️ {error}</div>}

        <div className="container">
          {/* Database Selection */}
          <section className="section">
            <h2>Select Database</h2>
            {loading && !databases.length && <p>Loading databases...</p>}
            <div className="button-group">
              {databases.map((db) => (
                <button
                  key={db}
                  className={`db-button ${selectedDb === db ? "active" : ""}`}
                  onClick={() => setSelectedDb(db)}
                >
                  📦 {db}
                </button>
              ))}
            </div>
          </section>

          {selectedDb && (
            <>
              {/* Table Selection */}
              <section className="section">
                <h2>Tables in {selectedDb}</h2>
                {loading && !tables.length && <p>Loading tables...</p>}
                {tables.length === 0 && !loading && <p>No tables found</p>}
                <div className="table-list">
                  {tables.map((table) => (
                    <button
                      key={table}
                      className={`table-button ${selectedTable === table ? "active" : ""}`}
                      onClick={() => handleTableSelect(table)}
                    >
                      📋 {table}
                    </button>
                  ))}
                </div>
              </section>

              {/* Table Data Display */}
              {selectedTable && (
                <section className="section">
                  <h2>
                    Data from {selectedDb}.{selectedTable}
                  </h2>
                  {loading && <p>Loading data...</p>}

                  {tableData && tableData.length > 0 && (
                    <div className="data-info">
                      <p>
                        <strong>Total rows:</strong> {tableData.length}
                      </p>
                    </div>
                  )}

                  {tableData && tableData.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {columns.map((col) => (
                              <th key={col.COLUMN_NAME}>
                                <div>
                                  <div className="col-name">
                                    {col.COLUMN_NAME}
                                  </div>
                                  <div className="col-type">
                                    {col.COLUMN_TYPE}
                                  </div>
                                  {col.COLUMN_KEY === "PRI" && (
                                    <span className="primary-key">PK</span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {columns.map((col) => (
                                <td key={col.COLUMN_NAME}>
                                  {row[col.COLUMN_NAME] !== null &&
                                  row[col.COLUMN_NAME] !== undefined ? (
                                    String(row[col.COLUMN_NAME]).substring(
                                      0,
                                      100,
                                    )
                                  ) : (
                                    <em className="null-value">NULL</em>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    tableData && !loading && <p>No data found in this table</p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
