import React, { useState } from "react";
import CSVUpload from "../components/CSVUpload";

function AddTransaction({ user, transactions, fetchTransactions }) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  ); // Default to today
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // Add transaction
  const addTransaction = async () => {
    if (!category || !amount || !transactionDate) {
      alert("Please fill in category, amount, and date");
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
          transaction_date: transactionDate,
          user_id: user.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error adding transaction");
      }
      await res.json();
      alert("Transaction added!");
      fetchTransactions();
      // Clear form except date
      setCategory("");
      setAmount("");
      setDescription("");
      setStore("");
      // Keep the date for convenience
    } catch (err) {
      console.error(err);
      alert(`Error adding transaction: ${err.message}`);
    }
  };

  // Get transactions from the last week
  const getLastWeekTransactions = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return transactions
      .filter((t) => new Date(t.transaction_date) >= oneWeekAgo)
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  };

  const lastWeekTransactions = getLastWeekTransactions();

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
    ...buttonStyle,
    backgroundColor: "#2196F3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };

  const transactionItemStyle = {
    border: "1px solid #e0e0e0",
    borderRadius: "5px",
    padding: "15px",
    marginBottom: "10px",
    backgroundColor: "#fafafa",
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
        {/* Left side - Form */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
            New Transaction
          </h3>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Transaction Date *</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Category *</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
              placeholder="e.g., Groceries, Salary"
            />
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Store</label>
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              style={inputStyle}
              placeholder="e.g., Walmart, Company Name"
            />
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Amount *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>
          <div style={inputRowStyle}>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
              placeholder="Optional notes"
            />
          </div>
          <button onClick={addTransaction} style={buttonStyle}>
            Add Transaction
          </button>
        </div>

        {/* Right side - Last week's transactions */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
            Last Week's Transactions ({lastWeekTransactions.length})
          </h3>
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {lastWeekTransactions.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center" }}>
                No transactions in the last 7 days
              </p>
            ) : (
              lastWeekTransactions.map((t) => (
                <div key={t.id} style={transactionItemStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <strong style={{ fontSize: "16px" }}>
                      {t.type === "income" ? "➕" : "➖"} ${t.amount.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#999" }}>
                      {new Date(t.transaction_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ color: "#555" }}>
                    <strong>{t.category}</strong>
                    {t.store && <> • {t.store}</>}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: "13px", color: "#777", marginTop: "5px" }}>
                      {t.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <CSVUpload
          user={user}
          fetchTransactions={fetchTransactions}
          onClose={() => setShowCSVUpload(false)}
        />
      )}
    </div>
  );
}

export default AddTransaction;