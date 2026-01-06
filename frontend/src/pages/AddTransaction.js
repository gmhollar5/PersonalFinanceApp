import React, { useState, useEffect } from "react";
import CSVUpload from "../components/CSVUpload";

// =============================================================================
// CATEGORY DEFINITIONS (matching backend constants.py)
// =============================================================================
const EXPENSE_CATEGORIES = [
  "Dining Out",
  "Entertainment",
  "Gas & Auto",
  "Gifts",
  "Recreation",
  "Education",
  "Groceries",
  "Health & Fitness",
  "Household",
  "Subscriptions",
  "Phone",
  "Rent",
  "Shopping",
  "Student Loan",
  "Travel",
  "Car Payment",
  "Utilities",
  "Other Expense"
];

const INCOME_CATEGORIES = [
  "Salary",
  "Interest",
  "Refund",
  "Gift",
  "Other Income"
];

// Tag suggestions by category
const CATEGORY_TAGS = {
  "Dining Out": ["restaurant", "food", "lunch", "dinner"],
  "Entertainment": ["movie", "concert", "show", "game"],
  "Gas & Auto": ["fuel", "car", "maintenance"],
  "Gifts": ["birthday", "holiday", "present"],
  "Recreation": ["golf", "sports", "hobby"],
  "Education": ["school", "tuition", "books"],
  "Groceries": ["food", "weekly", "shopping"],
  "Health & Fitness": ["gym", "health", "medical"],
  "Household": ["home", "supplies", "cleaning"],
  "Subscriptions": ["monthly", "streaming", "app"],
  "Travel": ["trip", "vacation", "flight"],
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Format store name to Title Case
const formatStore = (store) => {
  if (!store) return "";
  return store
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Utility function to format date strings without timezone conversion
const formatDateSafe = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString();
};

// Utility function to format timestamps with timezone abbreviation
const formatTimestampWithTimezone = (timestamp) => {
  if (!timestamp) return "-";
  
  let utcTimestamp = timestamp;
  if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
    utcTimestamp = timestamp + 'Z';
  }
  
  const date = new Date(utcTimestamp);
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  
  return date.toLocaleString('en-US', options);
};

function AddTransaction({ user, transactions, fetchTransactions }) {
  // Helper function to get today's date in local timezone
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
  
  // Smart tag suggestions
  const [suggestedTags, setSuggestedTags] = useState([]);
  
  // CSV Upload modal state
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  
  // Upload history state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Update suggested tags when category changes
  useEffect(() => {
    if (category && CATEGORY_TAGS[category]) {
      setSuggestedTags(CATEGORY_TAGS[category]);
    } else {
      setSuggestedTags([]);
    }
  }, [category]);

  // Auto-format store name when it loses focus
  const handleStoreBlur = () => {
    if (store) {
      setStore(formatStore(store));
    }
  };

  // Fetch upload history
  const fetchUploadHistory = async () => {
    try {
      const res = await fetch(`/upload-sessions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch upload history");
      const data = await res.json();
      const nonEmptySessions = data.filter(session => session.transaction_count > 0);
      setUploadHistory(Array.isArray(nonEmptySessions) ? nonEmptySessions : []);
    } catch (err) {
      console.error(err);
      setUploadHistory([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUploadHistory();
    }
  }, [user]);

  // Ensure manual session exists
  const ensureManualSession = async () => {
    if (currentSessionId) {
      return currentSessionId;
    }

    try {
      const existingSessions = await fetch(`/upload-sessions/user/${user.id}`);
      const sessions = await existingSessions.json();
      const manualSession = sessions.find(s => s.upload_type === "manual");
      
      if (manualSession) {
        setCurrentSessionId(manualSession.id);
        setSessionStartTime(manualSession.upload_date);
        return manualSession.id;
      }

      const res = await fetch("/upload-sessions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          upload_type: "manual",
          transaction_count: 0,
        }),
      });
      const newSession = await res.json();
      setCurrentSessionId(newSession.id);
      setSessionStartTime(newSession.upload_date);
      return newSession.id;
    } catch (err) {
      console.error("Error creating manual session:", err);
      return null;
    }
  };

  // Update session metadata
  const updateSession = async (sessionId, transactionDate, currentCount) => {
    try {
      const sessionRes = await fetch(`/upload-sessions/user/${user.id}`);
      const sessions = await sessionRes.json();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const newCount = currentCount + 1;
      const currentMax = session.max_transaction_date;
      const maxDate = !currentMax || new Date(transactionDate) > new Date(currentMax)
        ? transactionDate
        : currentMax;
      
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

    const sessionId = await ensureManualSession();
    if (!sessionId) {
      alert("Error creating upload session");
      return;
    }

    try {
      // Format store name before sending
      const formattedStore = formatStore(store);
      
      const res = await fetch("/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          store: formattedStore,
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
      
      const sessionRes = await fetch(`/upload-sessions/user/${user.id}`);
      const sessions = await sessionRes.json();
      const session = sessions.find(s => s.id === sessionId);
      const currentCount = session ? session.transaction_count : 0;
      
      await updateSession(sessionId, transactionDate, currentCount);
      fetchTransactions();
      
      // Clear form and reset date to today
      setCategory("");
      setAmount("");
      setDescription("");
      setStore("");
      setTag("");
      setSuggestedTags([]);
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
      if (!res.ok) throw new Error("Failed to delete session");
      
      alert("Upload session deleted!");
      fetchUploadHistory();
      fetchTransactions();
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setSessionStartTime(null);
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting session: ${err.message}`);
    }
  };

  // Get categories based on type
  const availableCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Styles
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "20px",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const inputRowStyle = { marginBottom: "15px" };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#333",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    width: "100%",
  };

  const csvButtonStyle = {
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };

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

  const tagButtonStyle = {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    border: "1px solid #1976d2",
    padding: "5px 10px",
    borderRadius: "15px",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "5px",
    marginBottom: "5px",
    display: "inline-block",
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
            <select 
              style={inputStyle} 
              value={type} 
              onChange={(e) => {
                setType(e.target.value);
                setCategory(""); // Reset category when type changes
              }}
            >
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
            <select
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">-- Select Category --</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Store */}
          <div style={inputRowStyle}>
            <label style={labelStyle}>Store *</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g., Target, Chipotle"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              onBlur={handleStoreBlur}
            />
            <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>
              Store name will be formatted to Title Case
            </div>
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
              placeholder="e.g., vacation, weekly"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            {suggestedTags.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "5px" }}>
                  Suggested tags:
                </div>
                {suggestedTags.map((suggestedTag) => (
                  <button
                    key={suggestedTag}
                    style={tagButtonStyle}
                    onClick={() => setTag(suggestedTag)}
                  >
                    {suggestedTag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div style={inputRowStyle}>
            <label style={labelStyle}>Description (Optional)</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Additional notes"
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
          {currentSessionId && sessionStartTime && (
            <div style={{
              backgroundColor: "#e8f5e9",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
              fontSize: "13px",
              color: "#2e7d32",
            }}>
              <strong>Active Session:</strong> Started {formatTimestampWithTimezone(sessionStartTime)}
            </div>
          )}
          {uploadHistory.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center" }}>No upload history yet</p>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {uploadHistory.map((session) => (
                <div
                  key={session.id}
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "12px",
                    borderRadius: "5px",
                    marginBottom: "10px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        {session.upload_type === "manual" ? "✍️ Manual Entry" : "📤 CSV Upload"}
                      </div>
                      <div style={{ color: "#666", fontSize: "12px" }}>
                        <div>Uploaded: {formatTimestampWithTimezone(session.upload_date)}</div>
                        <div>Transactions: {session.transaction_count}</div>
                        {session.min_transaction_date && session.max_transaction_date && (
                          <div>
                            Date Range: {formatDateSafe(session.min_transaction_date)} - {formatDateSafe(session.max_transaction_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteUploadSession(session.id)}
                      style={deleteButtonStyle}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <CSVUpload
          user={user}
          onClose={() => setShowCSVUpload(false)}
          onUploadComplete={() => {
            fetchTransactions();
            fetchUploadHistory();
          }}
        />
      )}
    </div>
  );
}

export default AddTransaction;