import React, { useState, useEffect } from "react";

function AddTransaction({ user, transactions, fetchTransactions }) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // Upload history state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionTransactionCount, setSessionTransactionCount] = useState(0);

  // Fetch upload history
  const fetchUploadHistory = async () => {
    try {
      const res = await fetch(`/upload-sessions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch upload history");
      const data = await res.json();
      setUploadHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUploadHistory([]);
    }
  };

  // Create a new manual upload session when component mounts
  useEffect(() => {
    fetchUploadHistory();
  }, [user.id]);

  // Create manual session when user starts adding transactions
  const ensureManualSession = async () => {
    if (!currentSessionId) {
      try {
        const res = await fetch("/upload-sessions/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            upload_type: "manual",
            transaction_count: 0,
          }),
        });
        if (!res.ok) throw new Error("Failed to create session");
        const session = await res.json();
        setCurrentSessionId(session.id);
        return session.id;
      } catch (err) {
        console.error("Error creating manual session:", err);
        return null;
      }
    }
    return currentSessionId;
  };

  // Update session when transaction is added
  const updateSession = async (sessionId, transactionDate) => {
    try {
      const newCount = sessionTransactionCount + 1;
      
      // Get the most recent transaction date
      const currentMostRecent = uploadHistory.find(s => s.id === sessionId)?.most_recent_transaction_date;
      const mostRecentDate = !currentMostRecent || new Date(transactionDate) > new Date(currentMostRecent)
        ? transactionDate
        : currentMostRecent;

      await fetch(`/upload-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_count: newCount,
          most_recent_transaction_date: mostRecentDate,
        }),
      });
      
      setSessionTransactionCount(newCount);
      fetchUploadHistory();
    } catch (err) {
      console.error("Error updating session:", err);
    }
  };

  // Add transaction
  const addTransaction = async () => {
    if (!category || !store || !amount || !transactionDate) {
      alert("Please fill in category, store, amount, and date");
      return;
    }

    // Ensure we have a manual session
    const sessionId = await ensureManualSession();
    if (!sessionId) {
      alert("Error creating upload session");
      return;
    }

    try {
      const res = await fetch("/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          store,
          amount: parseFloat(amount),
          description,
          tag: tag || null,
          transaction_date: transactionDate,
          is_bulk_upload: false,
          upload_session_id: sessionId,
          user_id: user.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error adding transaction");
      }
      await res.json();
      alert("Transaction added!");
      
      // Update the session
      await updateSession(sessionId, transactionDate);
      
      fetchTransactions();
      
      // Clear form except date
      setCategory("");
      setAmount("");
      setDescription("");
      setStore("");
      setTag("");
    } catch (err) {
      console.error(err);
      alert(`Error adding transaction: ${err.message}`);
    }
  };

  // Delete upload session
  const deleteUploadSession = async (sessionId) => {
    if (!window.confirm("Are you sure? This will delete all transactions in this upload session.")) {
      return;
    }

    try {
      const res = await fetch(`/upload-sessions/${sessionId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error deleting upload session");
      }
      
      alert("Upload session deleted successfully!");
      fetchUploadHistory();
      fetchTransactions();
      
      // Reset current session if it was deleted
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setSessionTransactionCount(0);
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting upload session: ${err.message}`);
    }
  };

  // When component unmounts or user navigates away, finalize the session
  useEffect(() => {
    return () => {
      // This runs on cleanup
      if (currentSessionId && sessionTransactionCount > 0) {
        // Session will remain in database for history
      } else if (currentSessionId && sessionTransactionCount === 0) {
        // Optionally delete empty sessions
        fetch(`/upload-sessions/${currentSessionId}`, {
          method: "DELETE",
        }).catch(err => console.error("Error cleaning up empty session:", err));
      }
    };
  }, [currentSessionId, sessionTransactionCount]);

  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    marginTop: "20px",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  };

  const historyTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "15px",
  };

  const thStyle = {
    backgroundColor: "#1a1a2e",
    color: "white",
    padding: "10px",
    textAlign: "left",
    fontSize: "13px",
  };

  const tdStyle = {
    padding: "10px",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
  };

  const badgeStyle = (type) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "bold",
    backgroundColor: type === "bulk" ? "#2196F3" : "#9E9E9E",
    color: "white",
  });

  const deleteButtonStyle = {
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  };

  return (
    <div style={containerStyle}>
      {/* Left Column - Add Transaction Form */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Add Transaction</h2>

        {/* Type */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        {/* Category */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Category *</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g., Groceries, Salary"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* Store */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Store *</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g., Target, ABC Company"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          />
        </div>

        {/* Amount */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Amount *</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="0.00"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Tag */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Tag (Optional)</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g., vacation, holiday-gifts"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>

        {/* Description */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Description (Optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
            placeholder="Additional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Transaction Date */}
        <div style={inputRowStyle}>
          <label style={labelStyle}>Transaction Date *</label>
          <input
            type="date"
            style={inputStyle}
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>

        <button onClick={addTransaction} style={buttonStyle}>
          Add Transaction
        </button>
      </div>

      {/* Right Column - Upload History */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Upload History</h2>
        <p style={{ color: "#666", fontSize: "14px" }}>
          Track your transaction uploads - both bulk CSV imports and manual entries.
        </p>

        {uploadHistory.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "40px 20px" }}>
            No upload history yet. Start adding transactions!
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={historyTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Upload Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Count</th>
                  <th style={thStyle}>Latest Transaction</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((session) => (
                  <tr key={session.id}>
                    <td style={tdStyle}>
                      {new Date(session.upload_date).toLocaleString()}
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(session.upload_type)}>
                        {session.upload_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>{session.transaction_count}</td>
                    <td style={tdStyle}>
                      {session.most_recent_transaction_date
                        ? new Date(session.most_recent_transaction_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => deleteUploadSession(session.id)}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddTransaction;