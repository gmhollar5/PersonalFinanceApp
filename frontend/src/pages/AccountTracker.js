import React, { useState, useEffect, useMemo } from "react";

function AccountTracker({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("liquid");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch all account records
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/accounts/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAccounts([]);
    }
  };

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  // Add account balance
  const addAccount = async () => {
    if (!accountName || !balance) {
      alert("Please fill in account name and balance");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/accounts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          account_type: accountType,
          balance: parseFloat(balance),
          user_id: user.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error adding account");
      }
      await res.json();
      alert("Account balance recorded!");
      fetchAccounts();
      setAccountName("");
      setBalance("");
    } catch (err) {
      console.error(err);
      alert(`Error adding account: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get latest balance for each unique account
  const latestAccounts = useMemo(() => {
    const accountMap = {};
    // Sort by date descending, then group by name+type
    accounts
      .sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded))
      .forEach((account) => {
        const key = `${account.name}_${account.account_type}`;
        if (!accountMap[key]) {
          accountMap[key] = account;
        }
      });
    return Object.values(accountMap);
  }, [accounts]);

  // Calculate net worth
  const netWorth = useMemo(() => {
    const assets = latestAccounts
      .filter((a) => a.account_type === "liquid" || a.account_type === "investment")
      .reduce((sum, a) => sum + a.balance, 0);
    const debts = latestAccounts
      .filter((a) => a.account_type === "debt")
      .reduce((sum, a) => sum + a.balance, 0);
    return assets - debts;
  }, [latestAccounts]);

  // Group accounts by type
  const accountsByType = useMemo(() => {
    return {
      liquid: latestAccounts.filter((a) => a.account_type === "liquid"),
      investment: latestAccounts.filter((a) => a.account_type === "investment"),
      debt: latestAccounts.filter((a) => a.account_type === "debt"),
    };
  }, [latestAccounts]);

  // Net worth history (all records over time)
  const netWorthHistory = useMemo(() => {
    // Group all records by date
    const dateGroups = {};
    accounts.forEach((account) => {
      const date = new Date(account.date_recorded).toISOString().split("T")[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(account);
    });

    // Calculate net worth for each date
    return Object.entries(dateGroups)
      .map(([date, accts]) => {
        // Get most recent balance for each account on this date
        const accountMap = {};
        accts.forEach((a) => {
          const key = `${a.name}_${a.account_type}`;
          if (
            !accountMap[key] ||
            new Date(a.date_recorded) > new Date(accountMap[key].date_recorded)
          ) {
            accountMap[key] = a;
          }
        });

        const dayAccounts = Object.values(accountMap);
        const assets = dayAccounts
          .filter((a) => a.account_type === "liquid" || a.account_type === "investment")
          .reduce((sum, a) => sum + a.balance, 0);
        const debts = dayAccounts
          .filter((a) => a.account_type === "debt")
          .reduce((sum, a) => sum + a.balance, 0);

        return {
          date,
          netWorth: assets - debts,
          assets,
          debts,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // Last 10 entries
  }, [accounts]);

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  const containerStyle = { marginTop: "20px" };
  const cardStyle = {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const inputRowStyle = {
    display: "flex",
    flexDirection: "column",
    marginBottom: "15px",
  };

  const labelStyle = {
    fontWeight: "bold",
    marginBottom: "5px",
    color: "#333",
  };

  const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
  };

  const buttonStyle = {
    backgroundColor: loading ? "#ccc" : "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "10px",
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "10px" }}>Net Worth Tracker</h2>

      {/* Net Worth Card */}
      <div
        style={{
          ...cardStyle,
          background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
          color: "white",
          textAlign: "center",
          padding: "40px",
        }}
      >
        <div style={{ fontSize: "16px", marginBottom: "10px", opacity: 0.9 }}>
          Current Net Worth
        </div>
        <div style={{ fontSize: "56px", fontWeight: "bold", marginBottom: "10px" }}>
          {formatCurrency(netWorth)}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.8 }}>
          {netWorthHistory.length > 1 && (
            <>
              {netWorthHistory[netWorthHistory.length - 1].netWorth >
              netWorthHistory[netWorthHistory.length - 2].netWorth
                ? "↑"
                : "↓"}{" "}
              {formatCurrency(
                Math.abs(
                  netWorthHistory[netWorthHistory.length - 1].netWorth -
                    netWorthHistory[netWorthHistory.length - 2].netWorth
                )
              )}{" "}
              from last update
            </>
          )}
        </div>
      </div>

      {/* Input Form + Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Input Form */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
            Record Account Balance
          </h3>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Account Type *</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              style={inputStyle}
            >
              <option value="liquid">Liquid Asset (Cash, Checking, Savings)</option>
              <option value="investment">Investment (401k, Stocks, Real Estate)</option>
              <option value="debt">Debt (Loans, Credit Cards)</option>
            </select>
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Account Name *</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              style={inputStyle}
              placeholder="e.g., Chase Checking, 401k, Car Loan"
            />
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Current Balance *</label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>
          <button onClick={addAccount} style={buttonStyle} disabled={loading}>
            {loading ? "Recording..." : "Record Balance"}
          </button>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            Record your current balances regularly to track your net worth over time.
          </p>
        </div>

        {/* Quick Summary */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>Quick Summary</h3>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "5px" }}>
              Total Assets
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>
              {formatCurrency(
                accountsByType.liquid.reduce((sum, a) => sum + a.balance, 0) +
                  accountsByType.investment.reduce((sum, a) => sum + a.balance, 0)
              )}
            </div>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "5px" }}>
              Total Debt
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff4444" }}>
              {formatCurrency(accountsByType.debt.reduce((sum, a) => sum + a.balance, 0))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "5px" }}>
              Accounts Tracked
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196F3" }}>
              {latestAccounts.length}
            </div>
          </div>
        </div>
      </div>

      {/* Account Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {/* Liquid Assets */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#4CAF50", marginBottom: "15px" }}>
            💰 Liquid Assets
          </h3>
          {accountsByType.liquid.length === 0 ? (
            <p style={{ color: "#999" }}>No liquid accounts tracked</p>
          ) : (
            accountsByType.liquid.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: "12px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "5px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "3px" }}>{account.name}</div>
                <div style={{ fontSize: "18px", color: "#4CAF50", fontWeight: "bold" }}>
                  {formatCurrency(account.balance)}
                </div>
                <div style={{ fontSize: "11px", color: "#999" }}>
                  Updated: {new Date(account.date_recorded).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Investments */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#2196F3", marginBottom: "15px" }}>
            📈 Investments
          </h3>
          {accountsByType.investment.length === 0 ? (
            <p style={{ color: "#999" }}>No investment accounts tracked</p>
          ) : (
            accountsByType.investment.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: "12px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "5px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "3px" }}>{account.name}</div>
                <div style={{ fontSize: "18px", color: "#2196F3", fontWeight: "bold" }}>
                  {formatCurrency(account.balance)}
                </div>
                <div style={{ fontSize: "11px", color: "#999" }}>
                  Updated: {new Date(account.date_recorded).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Debt */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#ff4444", marginBottom: "15px" }}>💳 Debt</h3>
          {accountsByType.debt.length === 0 ? (
            <p style={{ color: "#999" }}>No debt accounts tracked</p>
          ) : (
            accountsByType.debt.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: "12px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "5px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "3px" }}>{account.name}</div>
                <div style={{ fontSize: "18px", color: "#ff4444", fontWeight: "bold" }}>
                  {formatCurrency(account.balance)}
                </div>
                <div style={{ fontSize: "11px", color: "#999" }}>
                  Updated: {new Date(account.date_recorded).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Net Worth History */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#333", marginBottom: "20px" }}>Net Worth History</h3>
        {netWorthHistory.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center" }}>
            No history yet. Start recording your account balances!
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Assets</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Debt</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Net Worth</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {netWorthHistory.map((entry, index) => {
                  const prevEntry = index > 0 ? netWorthHistory[index - 1] : null;
                  const change = prevEntry ? entry.netWorth - prevEntry.netWorth : 0;
                  return (
                    <tr key={entry.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px" }}>
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#4CAF50" }}>
                        {formatCurrency(entry.assets)}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#ff4444" }}>
                        {formatCurrency(entry.debts)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          fontWeight: "bold",
                          color: entry.netWorth >= 0 ? "#4CAF50" : "#ff4444",
                        }}
                      >
                        {formatCurrency(entry.netWorth)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          color: change >= 0 ? "#4CAF50" : "#ff4444",
                        }}
                      >
                        {prevEntry ? (
                          <>
                            {change >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(change))}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountTracker;