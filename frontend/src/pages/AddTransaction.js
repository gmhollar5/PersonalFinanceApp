import React, { useState, useEffect } from "react";
import CSVUpload from "../components/CSVUpload";

// Utility function to format date strings without timezone conversion
const formatDateSafe = (dateString) => {
  if (!dateString) return "-";
  // Parse YYYY-MM-DD directly without timezone conversion
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString();
};

// Utility function to format timestamps with timezone abbreviation
const formatTimestampWithTimezone = (timestamp) => {
  if (!timestamp) return "-";
  
  // Ensure timestamp is treated as UTC by adding 'Z' if not present
  let utcTimestamp = timestamp;
  if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
    utcTimestamp = timestamp + 'Z';  // Add 'Z' to indicate UTC
  }
  
  const date = new Date(utcTimestamp);
  
  // Format with short timezone name (CST, EST, PST, etc.)
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'  // This gives us CST, EST, PST, etc.
  };
  
  return date.toLocaleString('en-US', options);
};

function AddTransaction({ user, transactions, fetchTransactions }) {
  // Helper function to get today's date in local timezone (not UTC)
  const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayLocal());
  
  // CSV Upload modal state
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  
  // Upload history state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Fetch upload history
  const fetchUploadHistory = async () => {
    try {
      const res = await fetch(`/upload-sessions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch upload history");
      const data = await res.json();
      // Filter out empty sessions (count = 0)
      const nonEmptySessions = data.filter(session => session.transaction_count > 0);
      setUploadHistory(Array.isArray(nonEmptySessions) ? nonEmptySessions : []);
    } catch (err) {
      console.error(err);
      setUploadHistory([]);
    }
  };

  // Load upload history on mount
  useEffect(() => {
    fetchUploadHistory();
    setSessionStartTime(new Date().toISOString());
  }, [user.id]);

  // Refresh upload history when transaction count changes
  useEffect(() => {
    if (user && user.id && transactions) {
      fetchUploadHistory();
    }
  }, [transactions.length]);

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
  const updateSession = async (sessionId, transactionDate, currentCount) => {
    try {
      // Get current session data
      const sessionRes = await fetch(`/upload-sessions/user/${user.id}`);
      const sessions = await sessionRes.json();
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        console.error("Session not found");
        return;
      }

      const newCount = currentCount + 1;
      
      // Update max date (most recent)
      const currentMax = session.max_transaction_date;
      const maxDate = !currentMax || new Date(transactionDate) > new Date(currentMax)
        ? transactionDate
        : currentMax;
      
      // Update min date (earliest)
      const currentMin = session.min_transaction_date;
      const minDate = !currentMin || new Date(transactionDate) < new Date(currentMin)
        ? transactionDate
        : currentMin;

      await fetch(`/upload-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_count: newCount,
          max_transaction_date: maxDate,
          min_transaction_date: minDate,
        }),
      });
      
      // Refresh upload history
      await fetchUploadHistory();
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
      const newTransaction = await res.json();
      alert("Transaction added!");
      
      // Get current count from the session
      const sessionRes = await fetch(`/upload-sessions/user/${user.id}`);
      const sessions = await sessionRes.json();
      const session = sessions.find(s => s.id === sessionId);
      const currentCount = session ? session.transaction_count : 0;
      
      // Update the session
      await updateSession(sessionId, transactionDate, currentCount);
      
      // Refresh transactions
      fetchTransactions();
      
      // Clear form and reset date to today
      setCategory("");
      setAmount("");
      setDescription("");
      setStore("");
      setTag("");
      setTransactionDate(getTodayLocal());
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
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting upload session: ${err.message}`);
    }
  };

  // Close CSV upload and refresh data
  const handleCSVUploadClose = () => {
    setShowCSVUpload(false);
    fetchUploadHistory();
    fetchTransactions();
  };

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

  const csvButtonStyle = {
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
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

  const headerWithButtonStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  };

  return (
    <div>
      <div style={headerWithButtonStyle}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Add Transaction</h2>
        <button onClick={() => setShowCSVUpload(true)} style={csvButtonStyle}>
          📤 Import CSV
        </button>
      </div>

      <div style={containerStyle}>
        {/* Left Column - Add Transaction Form */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
            New Transaction
          </h3>

          {/* Type */}
          <div style={inputRowStyle}>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
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

          <button onClick={addTransaction} style={buttonStyle}>
            Add Transaction
          </button>
        </div>

        {/* Right Column - Upload History */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
            Upload History
          </h3>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>
            Track your transaction uploads - both bulk CSV imports and manual entries.
          </p>

          {uploadHistory.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", padding: "40px 20px" }}>
              No upload history yet. Start adding transactions or import a CSV!
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={historyTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Upload Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Count</th>
                    <th style={thStyle}>Transaction Date Range</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.map((session) => (
                    <tr key={session.id}>
                      <td style={tdStyle}>
                        {formatTimestampWithTimezone(session.upload_date)}
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(session.upload_type)}>
                          {session.upload_type.toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>{session.transaction_count}</td>
                      <td style={tdStyle}>
                        {session.min_transaction_date && session.max_transaction_date ? (
                          session.min_transaction_date === session.max_transaction_date ? (
                            // Single date
                            formatDateSafe(session.min_transaction_date)
                          ) : (
                            // Date range
                            `${formatDateSafe(session.min_transaction_date)} - ${formatDateSafe(session.max_transaction_date)}`
                          )
                        ) : session.max_transaction_date ? (
                          formatDateSafe(session.max_transaction_date)
                        ) : (
                          "-"
                        )}
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

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <CSVUpload
          user={user}
          fetchTransactions={fetchTransactions}
          onClose={handleCSVUploadClose}
        />
      )}
    </div>
  );
}

export default AddTransaction;