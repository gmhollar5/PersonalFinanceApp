import React, { useState, useEffect, useMemo } from "react";

// Simple Line Chart Component
function LineChart({ data, width = 600, height = 300, color = "#4CAF50", title = "" }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        backgroundColor: "#fafafa", 
        borderRadius: "8px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#999" 
      }}>
        No data available
      </div>
    );
  }

  const padding = 50;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
    return { x, y, label: d.label || d.date, value: d.value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      {title && (
        <h4 style={{ margin: "0 0 10px 0", color: "#333", textAlign: "center" }}>{title}</h4>
      )}
      <svg width={width} height={height} style={{ backgroundColor: "#fafafa", borderRadius: "8px" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight * (1 - ratio);
          const value = minValue + valueRange * ratio;
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e0e0e0"
                strokeWidth="1"
              />
              <text x={padding - 10} y={y + 5} fontSize="11" fill="#999" textAnchor="end">
                ${(value / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        <path d={pathD} fill="none" stroke={color} strokeWidth="3" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            {i % Math.ceil(points.length / 8) === 0 && (
              <text
                x={p.x}
                y={height - padding + 20}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {new Date(p.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function AccountTracker({ user }) {
  const [accountDefinitions, setAccountDefinitions] = useState([]);
  const [accountRecords, setAccountRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Add account modal
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCategory, setNewAccountCategory] = useState("liquid");
  const [accountAddedMessage, setAccountAddedMessage] = useState("");
  
  // Create record modal
  const [showCreateRecordModal, setShowCreateRecordModal] = useState(false);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordBalances, setRecordBalances] = useState({});
  
  // View controls
  const [selectedGraphView, setSelectedGraphView] = useState("net_worth");
  const [showDetailedTable, setShowDetailedTable] = useState(false); // false = summary (default), true = detailed

  const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Format date from YYYY-MM-DD to local display (no timezone conversion)
  const formatDateLocal = (dateString) => {
    // Parse YYYY-MM-DD as a local date (not UTC) to avoid day shifting
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Get timezone name for display
  const getTimezone = () => {
    return "Local Date";
  };

  // Fetch data
  const fetchAccountDefinitions = async () => {
    try {
      const res = await fetch(`/account-definitions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch account definitions");
      const data = await res.json();
      setAccountDefinitions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAccountDefinitions([]);
    }
  };

  const fetchAccountRecords = async () => {
    try {
      const res = await fetch(`/account-records/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch account records");
      const data = await res.json();
      setAccountRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAccountRecords([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/account-records/analytics/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAccountDefinitions();
      fetchAccountRecords();
      fetchAnalytics();
    }
  }, [user]);

  // Get latest balances for each account
  const latestBalances = useMemo(() => {
    const latest = {};
    accountRecords.forEach((record) => {
      const key = `${record.account_definition_id}`;
      if (!latest[key] || new Date(record.record_date) > new Date(latest[key].record_date)) {
        latest[key] = record;
      }
    });
    return latest;
  }, [accountRecords]);

  // Group accounts by category with latest balances
  const accountsByCategory = useMemo(() => {
    const grouped = {
      liquid: [],
      investments: [],
      debt: []
    };

    accountDefinitions.forEach((acct) => {
      const latestBalance = latestBalances[acct.id]?.balance || 0;
      grouped[acct.category].push({
        ...acct,
        latestBalance
      });
    });

    // Sort by balance within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => b.latestBalance - a.latestBalance);
    });

    return grouped;
  }, [accountDefinitions, latestBalances]);

  // Add new account
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/account-definitions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccountName,
          category: newAccountCategory,
          user_id: user.id
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error adding account");
      }

      await fetchAccountDefinitions();
      
      // Show success message and clear form, but KEEP the category selection
      setAccountAddedMessage(`✅ "${newAccountName}" added successfully!`);
      setNewAccountName("");
      // NOTE: We do NOT reset newAccountCategory here - it stays the same
      
      // Clear success message after 3 seconds
      setTimeout(() => setAccountAddedMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert(`Error adding account: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (accountId, accountName) => {
    if (!window.confirm(`Are you sure you want to delete "${accountName}"? This will also delete all historical records for this account.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/account-definitions/${accountId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error deleting account");
      }

      await fetchAccountDefinitions();
      await fetchAccountRecords();
      await fetchAnalytics();
      alert(`"${accountName}" deleted successfully!`);
    } catch (err) {
      console.error(err);
      alert(`Error deleting account: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create new record
  const handleCreateRecord = async () => {
    if (accountDefinitions.length === 0) {
      alert("Please add some accounts first");
      return;
    }

    // Initialize balances with latest values
    const balances = {};
    accountDefinitions.forEach((acct) => {
      balances[acct.id] = latestBalances[acct.id]?.balance || 0;
    });
    setRecordBalances(balances);
    
    // Reset date to today
    setRecordDate(new Date().toISOString().split('T')[0]);
    
    setShowCreateRecordModal(true);
  };

  const handleSaveRecord = async () => {
    const records = accountDefinitions.map((acct) => ({
      account_definition_id: acct.id,
      balance: parseFloat(recordBalances[acct.id] || 0)
    }));

    setLoading(true);
    try {
      const res = await fetch("/account-records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_date: recordDate,
          user_id: user.id,
          records
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error creating record");
      }

      await fetchAccountRecords();
      await fetchAnalytics();
      setShowCreateRecordModal(false);
      setRecordBalances({});
      alert("Record created successfully!");
    } catch (err) {
      console.error(err);
      alert(`Error creating record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete all records for a specific date
  const handleDeleteRecord = async (date) => {
    if (!window.confirm(`Are you sure you want to delete all account records from ${formatDateLocal(date)}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Get all record IDs for this date
      const recordsToDelete = accountRecords.filter(r => r.record_date === date);
      
      // Delete each record
      for (const record of recordsToDelete) {
        const res = await fetch(`/account-records/${record.id}`, {
          method: "DELETE"
        });
        
        if (!res.ok) {
          throw new Error("Error deleting record");
        }
      }

      await fetchAccountRecords();
      await fetchAnalytics();
      alert("Records deleted successfully!");
    } catch (err) {
      console.error(err);
      alert(`Error deleting records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get graph data based on selected view
  const graphData = useMemo(() => {
    if (!analytics) return [];

    if (selectedGraphView === "net_worth") {
      return analytics.net_worth_history;
    } else if (selectedGraphView.startsWith("category_")) {
      const category = selectedGraphView.split("_")[1];
      return analytics.category_history[category] || [];
    } else if (selectedGraphView.startsWith("account_")) {
      const accountKey = selectedGraphView.replace("account_", "");
      return analytics.account_history[accountKey] || [];
    }
    return [];
  }, [analytics, selectedGraphView]);

  const graphColor = useMemo(() => {
    if (selectedGraphView === "net_worth") return "#4CAF50";
    if (selectedGraphView.includes("liquid")) return "#2196F3";
    if (selectedGraphView.includes("investments")) return "#9C27B0";
    if (selectedGraphView.includes("debt")) return "#ff4444";
    return "#4CAF50";
  }, [selectedGraphView]);

  // Summary table data - grouped by date with individual accounts and % changes
  const summaryTableData = useMemo(() => {
    const byDate = {};
    
    accountRecords.forEach((record) => {
      const dateKey = record.record_date;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          liquid: 0,
          investments: 0,
          debt: 0,
          accountBalances: {}, // Store individual account balances
          accounts: []
        };
      }
      
      if (record.category === "liquid") {
        byDate[dateKey].liquid += record.balance;
      } else if (record.category === "investments") {
        byDate[dateKey].investments += record.balance;
      } else if (record.category === "debt") {
        byDate[dateKey].debt += record.balance;
      }
      
      // Store individual account balance
      const accountKey = `${record.account_definition_id}`;
      byDate[dateKey].accountBalances[accountKey] = record.balance;
      
      byDate[dateKey].accounts.push(record);
    });
    
    const sorted = Object.values(byDate).map(row => ({
      ...row,
      netWorth: row.liquid + row.investments - row.debt
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate percentage changes from previous record
    return sorted.map((row, index) => {
      if (index === sorted.length - 1) {
        // First record (oldest), no previous to compare
        return { ...row, changes: {} };
      }
      
      const prevRow = sorted[index + 1];
      const changes = {
        liquid: prevRow.liquid !== 0 ? ((row.liquid - prevRow.liquid) / prevRow.liquid * 100) : 0,
        investments: prevRow.investments !== 0 ? ((row.investments - prevRow.investments) / prevRow.investments * 100) : 0,
        debt: prevRow.debt !== 0 ? ((row.debt - prevRow.debt) / prevRow.debt * 100) : 0,
        netWorth: prevRow.netWorth !== 0 ? ((row.netWorth - prevRow.netWorth) / prevRow.netWorth * 100) : 0,
        accounts: {}
      };
      
      // Calculate % change for each individual account
      Object.keys(row.accountBalances).forEach(accountKey => {
        const currentBalance = row.accountBalances[accountKey];
        const prevBalance = prevRow.accountBalances[accountKey] || 0;
        if (prevBalance !== 0) {
          changes.accounts[accountKey] = ((currentBalance - prevBalance) / prevBalance * 100);
        }
      });
      
      return { ...row, changes };
    });
  }, [accountRecords]);

  // Styles
  const containerStyle = { padding: "20px", maxWidth: "1400px", margin: "0 auto" };
  const cardStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };
  const buttonStyle = {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };
  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#2196F3",
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "20px" }}>Account Tracker</h2>

      {/* Top Row: Analytics Cards + Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "15px", marginBottom: "20px" }}>
        {/* Current Net Worth */}
        <div style={{...cardStyle, textAlign: "center"}}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Current Net Worth</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}>
            {analytics ? formatCurrency(analytics.current_net_worth) : "$0.00"}
          </div>
        </div>

        {/* Month over Month */}
        <div style={{...cardStyle, textAlign: "center"}}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Month over Month</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: analytics && analytics.month_over_month_change >= 0 ? "#4CAF50" : "#ff4444" }}>
            {analytics ? (
              <>
                {formatCurrency(analytics.month_over_month_change)}
                <div style={{ fontSize: "12px", marginTop: "3px" }}>
                  ({analytics.month_over_month_percent.toFixed(1)}%)
                </div>
              </>
            ) : "$0.00"}
          </div>
        </div>

        {/* Year over Year */}
        <div style={{...cardStyle, textAlign: "center"}}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Year over Year</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: analytics && analytics.year_over_year_change >= 0 ? "#4CAF50" : "#ff4444" }}>
            {analytics ? (
              <>
                {formatCurrency(analytics.year_over_year_change)}
                <div style={{ fontSize: "12px", marginTop: "3px" }}>
                  ({analytics.year_over_year_percent.toFixed(1)}%)
                </div>
              </>
            ) : "$0.00"}
          </div>
        </div>

        {/* All Time Change */}
        <div style={{...cardStyle, textAlign: "center"}}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>All Time Change</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: analytics && analytics.all_time_change >= 0 ? "#4CAF50" : "#ff4444" }}>
            {analytics ? formatCurrency(analytics.all_time_change) : "$0.00"}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
          <button onClick={handleCreateRecord} style={buttonStyle}>
            + New Record
          </button>
          <button onClick={() => setShowAddAccountModal(true)} style={secondaryButtonStyle}>
            + Add Account
          </button>
        </div>
      </div>

      {/* Middle Row: Account List + Graph */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "20px", height: "500px" }}>
        {/* Account List */}
        <div style={{...cardStyle, overflowY: "auto"}}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#333" }}>Accounts</h3>
          
          {/* Liquid Assets */}
          {accountsByCategory.liquid.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2196F3", marginBottom: "10px" }}>
                💰 Liquid ({formatCurrency(accountsByCategory.liquid.reduce((sum, a) => sum + a.latestBalance, 0))})
              </div>
              {accountsByCategory.liquid.map((acct) => (
                <div key={acct.id} style={{ 
                  padding: "8px", 
                  marginBottom: "5px", 
                  backgroundColor: "#f5f5f5", 
                  borderRadius: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>{acct.name}</span>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#2196F3", marginRight: "10px" }}>
                    {formatCurrency(acct.latestBalance)}
                  </span>
                  <button
                    onClick={() => handleDeleteAccount(acct.id, acct.name)}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#ff4444",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "4px 8px"
                    }}
                    title="Delete account"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Investments */}
          {accountsByCategory.investments.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#9C27B0", marginBottom: "10px" }}>
                📈 Investments ({formatCurrency(accountsByCategory.investments.reduce((sum, a) => sum + a.latestBalance, 0))})
              </div>
              {accountsByCategory.investments.map((acct) => (
                <div key={acct.id} style={{ 
                  padding: "8px", 
                  marginBottom: "5px", 
                  backgroundColor: "#f5f5f5", 
                  borderRadius: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>{acct.name}</span>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#9C27B0", marginRight: "10px" }}>
                    {formatCurrency(acct.latestBalance)}
                  </span>
                  <button
                    onClick={() => handleDeleteAccount(acct.id, acct.name)}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#ff4444",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "4px 8px"
                    }}
                    title="Delete account"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Debt */}
          {accountsByCategory.debt.length > 0 && (
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#ff4444", marginBottom: "10px" }}>
                💳 Debt ({formatCurrency(accountsByCategory.debt.reduce((sum, a) => sum + a.latestBalance, 0))})
              </div>
              {accountsByCategory.debt.map((acct) => (
                <div key={acct.id} style={{ 
                  padding: "8px", 
                  marginBottom: "5px", 
                  backgroundColor: "#f5f5f5", 
                  borderRadius: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>{acct.name}</span>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#ff4444", marginRight: "10px" }}>
                    {formatCurrency(acct.latestBalance)}
                  </span>
                  <button
                    onClick={() => handleDeleteAccount(acct.id, acct.name)}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#ff4444",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "4px 8px"
                    }}
                    title="Delete account"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {accountDefinitions.length === 0 && (
            <p style={{ color: "#999", textAlign: "center", marginTop: "50px" }}>
              No accounts yet. Click "Add Account" to get started!
            </p>
          )}
        </div>

        {/* Graph */}
        <div style={{...cardStyle, display: "flex", flexDirection: "column"}}>
          <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#333" }}>Trends</h3>
            <select 
              value={selectedGraphView} 
              onChange={(e) => setSelectedGraphView(e.target.value)}
              style={{ 
                padding: "8px 12px", 
                borderRadius: "5px", 
                border: "1px solid #ddd",
                fontSize: "13px"
              }}
            >
              <option value="net_worth">Net Worth</option>
              <optgroup label="Categories">
                <option value="category_liquid">Liquid Assets</option>
                <option value="category_investments">Investments</option>
                <option value="category_debt">Debt</option>
              </optgroup>
              {accountDefinitions.length > 0 && (
                <optgroup label="Individual Accounts">
                  {accountDefinitions.map((acct) => (
                    <option key={acct.id} value={`account_${acct.name}_${acct.category}`}>
                      {acct.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LineChart 
              data={graphData} 
              width={700} 
              height={400} 
              color={graphColor}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Summary Table with Toggle */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ margin: 0, color: "#333" }}>Account History</h3>
          <button 
            onClick={() => setShowDetailedTable(!showDetailedTable)}
            style={{...secondaryButtonStyle, padding: "8px 16px", fontSize: "13px"}}
          >
            {showDetailedTable ? "📊 Summary View" : "📋 Detailed View"}
          </button>
        </div>

        {summaryTableData.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>
            No records yet. Create your first record to start tracking!
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {!showDetailedTable ? (
              // SUMMARY VIEW - Aggregated Categories (DEFAULT)
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "13px" }}>
                      Date ({getTimezone()})
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "#2196F3" }}>
                      💰 Liquid
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "#9C27B0" }}>
                      📈 Investments
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "#ff4444" }}>
                      💳 Debt
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", fontWeight: "bold", color: "#4CAF50" }}>
                      Net Worth
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", width: "60px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaryTableData.map((row, rowIndex) => (
                    <tr key={row.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px", fontSize: "13px", fontWeight: "500" }}>
                        {formatDateLocal(row.date)}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#2196F3", fontSize: "13px" }}>
                        <div>{formatCurrency(row.liquid)}</div>
                        {row.changes?.liquid !== undefined && (
                          <div style={{ 
                            fontSize: "11px", 
                            color: row.changes.liquid >= 0 ? "#4CAF50" : "#ff4444",
                            marginTop: "2px"
                          }}>
                            {row.changes.liquid >= 0 ? "↑" : "↓"} {Math.abs(row.changes.liquid).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#9C27B0", fontSize: "13px" }}>
                        <div>{formatCurrency(row.investments)}</div>
                        {row.changes?.investments !== undefined && (
                          <div style={{ 
                            fontSize: "11px", 
                            color: row.changes.investments >= 0 ? "#4CAF50" : "#ff4444",
                            marginTop: "2px"
                          }}>
                            {row.changes.investments >= 0 ? "↑" : "↓"} {Math.abs(row.changes.investments).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#ff4444", fontSize: "13px" }}>
                        <div>{formatCurrency(row.debt)}</div>
                        {row.changes?.debt !== undefined && (
                          <div style={{ 
                            fontSize: "11px", 
                            color: row.changes.debt >= 0 ? "#ff4444" : "#4CAF50",
                            marginTop: "2px"
                          }}>
                            {row.changes.debt >= 0 ? "↑" : "↓"} {Math.abs(row.changes.debt).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: "12px", 
                        textAlign: "right", 
                        fontWeight: "bold", 
                        fontSize: "13px",
                        color: row.netWorth >= 0 ? "#4CAF50" : "#ff4444",
                        backgroundColor: "#f9f9f9"
                      }}>
                        <div>{formatCurrency(row.netWorth)}</div>
                        {row.changes?.netWorth !== undefined && (
                          <div style={{ 
                            fontSize: "11px", 
                            fontWeight: "normal",
                            marginTop: "2px"
                          }}>
                            {row.changes.netWorth >= 0 ? "↑" : "↓"} {Math.abs(row.changes.netWorth).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteRecord(row.date)}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#ff4444",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "4px"
                          }}
                          title="Delete this record"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // DETAILED VIEW - Individual Account Columns
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", position: "sticky", left: 0, backgroundColor: "#f5f5f5", zIndex: 2 }}>
                      Date ({getTimezone()})
                    </th>
                    {/* Individual account columns grouped by category */}
                    {accountsByCategory.liquid.length > 0 && (
                      <>
                        <th colSpan={accountsByCategory.liquid.length} style={{ 
                          padding: "10px", 
                          textAlign: "center", 
                          fontSize: "12px", 
                          backgroundColor: "#e3f2fd", 
                          color: "#2196F3",
                          fontWeight: "bold",
                          borderRight: "2px solid #ddd"
                        }}>
                          💰 Liquid Assets
                        </th>
                      </>
                    )}
                    {accountsByCategory.investments.length > 0 && (
                      <>
                        <th colSpan={accountsByCategory.investments.length} style={{ 
                          padding: "10px", 
                          textAlign: "center", 
                          fontSize: "12px", 
                          backgroundColor: "#f3e5f5", 
                          color: "#9C27B0",
                          fontWeight: "bold",
                          borderRight: "2px solid #ddd"
                        }}>
                          📈 Investments
                        </th>
                      </>
                    )}
                    {accountsByCategory.debt.length > 0 && (
                      <>
                        <th colSpan={accountsByCategory.debt.length} style={{ 
                          padding: "10px", 
                          textAlign: "center", 
                          fontSize: "12px", 
                          backgroundColor: "#ffebee", 
                          color: "#ff4444",
                          fontWeight: "bold",
                          borderRight: "2px solid #ddd"
                        }}>
                          💳 Debt
                        </th>
                      </>
                    )}
                    <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", backgroundColor: "#e8f5e9", color: "#4CAF50", fontWeight: "bold" }}>
                      Net Worth
                    </th>
                    <th style={{ padding: "10px", textAlign: "center", fontSize: "12px", width: "60px" }}>
                      Actions
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: "#fafafa", borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "6px 10px", fontSize: "11px", position: "sticky", left: 0, backgroundColor: "#fafafa", zIndex: 2 }}></th>
                    {/* Individual account names */}
                    {accountsByCategory.liquid.map((acct, idx) => (
                      <th key={acct.id} style={{ 
                        padding: "6px 8px", 
                        textAlign: "right", 
                        fontSize: "11px", 
                        color: "#2196F3",
                        borderRight: idx === accountsByCategory.liquid.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {acct.name}
                      </th>
                    ))}
                    {accountsByCategory.investments.map((acct, idx) => (
                      <th key={acct.id} style={{ 
                        padding: "6px 8px", 
                        textAlign: "right", 
                        fontSize: "11px", 
                        color: "#9C27B0",
                        borderRight: idx === accountsByCategory.investments.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {acct.name}
                      </th>
                    ))}
                    {accountsByCategory.debt.map((acct, idx) => (
                      <th key={acct.id} style={{ 
                        padding: "6px 8px", 
                        textAlign: "right", 
                        fontSize: "11px", 
                        color: "#ff4444",
                        borderRight: idx === accountsByCategory.debt.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {acct.name}
                      </th>
                    ))}
                    <th style={{ padding: "6px 8px", fontSize: "11px" }}></th>
                    <th style={{ padding: "6px 8px", fontSize: "11px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {summaryTableData.map((row, rowIndex) => (
                    <tr key={row.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px", fontSize: "12px", fontWeight: "500", position: "sticky", left: 0, backgroundColor: "white", zIndex: 1 }}>
                        {formatDateLocal(row.date)}
                      </td>
                      {/* Liquid account values */}
                      {accountsByCategory.liquid.map((acct, idx) => {
                        const balance = row.accountBalances[acct.id] || 0;
                        const change = row.changes?.accounts?.[acct.id];
                        return (
                          <td key={acct.id} style={{ 
                            padding: "10px 8px", 
                            textAlign: "right", 
                            color: "#2196F3",
                            borderRight: idx === accountsByCategory.liquid.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0"
                          }}>
                            <div>{formatCurrency(balance)}</div>
                            {change !== undefined && (
                              <div style={{ 
                                fontSize: "10px", 
                                color: change >= 0 ? "#4CAF50" : "#ff4444",
                                marginTop: "2px"
                              }}>
                                {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* Investment account values */}
                      {accountsByCategory.investments.map((acct, idx) => {
                        const balance = row.accountBalances[acct.id] || 0;
                        const change = row.changes?.accounts?.[acct.id];
                        return (
                          <td key={acct.id} style={{ 
                            padding: "10px 8px", 
                            textAlign: "right", 
                            color: "#9C27B0",
                            borderRight: idx === accountsByCategory.investments.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0"
                          }}>
                            <div>{formatCurrency(balance)}</div>
                            {change !== undefined && (
                              <div style={{ 
                                fontSize: "10px", 
                                color: change >= 0 ? "#4CAF50" : "#ff4444",
                                marginTop: "2px"
                              }}>
                                {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* Debt account values */}
                      {accountsByCategory.debt.map((acct, idx) => {
                        const balance = row.accountBalances[acct.id] || 0;
                        const change = row.changes?.accounts?.[acct.id];
                        return (
                          <td key={acct.id} style={{ 
                            padding: "10px 8px", 
                            textAlign: "right", 
                            color: "#ff4444",
                            borderRight: idx === accountsByCategory.debt.length - 1 ? "2px solid #ddd" : "1px solid #e0e0e0"
                          }}>
                            <div>{formatCurrency(balance)}</div>
                            {change !== undefined && (
                              <div style={{ 
                                fontSize: "10px", 
                                color: change >= 0 ? "#ff4444" : "#4CAF50",
                                marginTop: "2px"
                              }}>
                                {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* Net Worth */}
                      <td style={{ 
                        padding: "10px 8px", 
                        textAlign: "right", 
                        fontWeight: "bold",
                        color: row.netWorth >= 0 ? "#4CAF50" : "#ff4444",
                        backgroundColor: "#f9f9f9"
                      }}>
                        <div>{formatCurrency(row.netWorth)}</div>
                        {row.changes?.netWorth !== undefined && (
                          <div style={{ 
                            fontSize: "10px", 
                            fontWeight: "normal",
                            marginTop: "2px"
                          }}>
                            {row.changes.netWorth >= 0 ? "↑" : "↓"} {Math.abs(row.changes.netWorth).toFixed(1)}%
                          </div>
                        )}
                      </td>
                      {/* Delete button */}
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteRecord(row.date)}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#ff4444",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "4px"
                          }}
                          title="Delete this record"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "10px",
            width: "400px",
            maxWidth: "90%"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Add New Account</h3>
            
            {/* Success message */}
            {accountAddedMessage && (
              <div style={{
                backgroundColor: "#d4edda",
                color: "#155724",
                padding: "12px",
                borderRadius: "5px",
                marginBottom: "15px",
                fontSize: "14px",
                textAlign: "center",
                fontWeight: "bold"
              }}>
                {accountAddedMessage}
              </div>
            )}
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>
                Account Name
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleAddAccount();
                  }
                }}
                placeholder="e.g., Chase Checking, 401k"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>
                Category
              </label>
              <select
                value={newAccountCategory}
                onChange={(e) => setNewAccountCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              >
                <option value="liquid">💰 Liquid Assets</option>
                <option value="investments">📈 Investments</option>
                <option value="debt">💳 Debt</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleAddAccount} 
                disabled={loading}
                style={{...buttonStyle, flex: 1}}
              >
                {loading ? "Adding..." : "+ Add Another"}
              </button>
              <button 
                onClick={() => {
                  setShowAddAccountModal(false);
                  setNewAccountName("");
                  setNewAccountCategory("liquid");
                  setAccountAddedMessage("");
                }}
                style={{...secondaryButtonStyle, flex: 1, backgroundColor: "#4CAF50"}}
              >
                Done Adding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Record Modal */}
      {showCreateRecordModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          overflowY: "auto"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "10px",
            width: "600px",
            maxWidth: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
            margin: "20px"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Create New Record</h3>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>
                Record Date ({getTimezone()})
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>
                Enter balances for each account:
              </div>
              
              {Object.entries(accountsByCategory).map(([category, accounts]) => (
                accounts.length > 0 && (
                  <div key={category} style={{ marginBottom: "20px" }}>
                    <div style={{ 
                      fontSize: "13px", 
                      fontWeight: "bold", 
                      color: category === "liquid" ? "#2196F3" : category === "investments" ? "#9C27B0" : "#ff4444",
                      marginBottom: "10px" 
                    }}>
                      {category === "liquid" ? "💰 Liquid Assets" : 
                       category === "investments" ? "📈 Investments" : "💳 Debt"}
                    </div>
                    {accounts.map((acct) => (
                      <div key={acct.id} style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                        <label style={{ flex: 1, fontSize: "13px" }}>{acct.name}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={recordBalances[acct.id] || ""}
                          onChange={(e) => setRecordBalances({
                            ...recordBalances,
                            [acct.id]: e.target.value
                          })}
                          placeholder="0.00"
                          style={{
                            width: "150px",
                            padding: "8px",
                            borderRadius: "5px",
                            border: "1px solid #ddd",
                            fontSize: "13px",
                            textAlign: "right"
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleSaveRecord} 
                disabled={loading}
                style={{...buttonStyle, flex: 1}}
              >
                {loading ? "Saving..." : "Save Record"}
              </button>
              <button 
                onClick={() => {
                  setShowCreateRecordModal(false);
                  setRecordBalances({});
                }}
                style={{...secondaryButtonStyle, flex: 1, backgroundColor: "#999"}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountTracker;