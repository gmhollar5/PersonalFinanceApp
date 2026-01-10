import React, { useState, useMemo, useEffect } from "react";

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

function ViewTransactions({ transactions, fetchTransactions }) {
  // Filter states
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Edit states
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Fetch categories from API on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/categories");
        const data = await res.json();
        setCategoryOptions(data.all || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        // Fallback to basic categories if API fails
        setCategoryOptions([
          "Salary", "Interest", "Refund", "Gift", "Transfer", "Side Income",
          "Tax Refund", "Other Income", "Dining", "Groceries", "Gas",
          "Shopping", "Subscriptions", "Utilities", "Rent", "Health & Fitness",
          "Entertainment", "Travel", "Education", "Credit Card Payment",
          "Loan Payment", "ATM/Cash", "Fees", "Services", "Internal Transfer",
          "Car Payment", "Phone", "Student Loan", "Household", "Gifts", "Other"
        ]);
      }
    };
    fetchCategories();
  }, []);

  // Get unique categories, stores, and tags
  const uniqueCategories = [...new Set(transactions.map((t) => t.category))].sort();
  const uniqueStores = [...new Set(transactions.map((t) => t.store).filter(Boolean))].sort();
  const uniqueTags = [...new Set(transactions.map((t) => t.tag).filter(Boolean))].sort();

  // Get min and max amounts
  const amounts = transactions.map((t) => t.amount);
  const globalMinAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
  const globalMaxAmount = amounts.length > 0 ? Math.max(...amounts) : 1000;

  // Delete transaction
  const deleteTransaction = async (transactionId) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      const res = await fetch(`/transactions/${transactionId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error deleting transaction");
      }
      
      alert("Transaction deleted successfully!");
      fetchTransactions(); // Refresh the transaction list
    } catch (err) {
      console.error(err);
      alert(`Error deleting transaction: ${err.message}`);
    }
  };

  // Edit transaction
  const handleEditTransaction = (transaction) => {
    setEditingTransaction({
      ...transaction,
      transaction_date: transaction.transaction_date.split('T')[0] // Format date for input
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction.category || !editingTransaction.store || !editingTransaction.amount) {
      alert("Please fill in category, store, and amount");
      return;
    }

    try {
      const res = await fetch(`/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editingTransaction.type,
          category: editingTransaction.category,
          store: editingTransaction.store,
          amount: parseFloat(editingTransaction.amount),
          description: editingTransaction.description || null,
          tag: editingTransaction.tag || null,
          transaction_date: editingTransaction.transaction_date,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error updating transaction");
      }

      alert("Transaction updated successfully!");
      setShowEditModal(false);
      setEditingTransaction(null);
      fetchTransactions(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert(`Error updating transaction: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Type filter
        if (typeFilter !== "all" && t.type !== typeFilter) return false;

        // Category filter
        if (categoryFilter && t.category !== categoryFilter) return false;

        // Store filter
        if (storeFilter && t.store !== storeFilter) return false;

        // Tag filter
        if (tagFilter && t.tag !== tagFilter) return false;

        // Description search
        if (
          descriptionSearch &&
          !t.description?.toLowerCase().includes(descriptionSearch.toLowerCase())
        ) {
          return false;
        }

        // Date range filter
        if (startDate || endDate) {
          // Parse transaction date safely (YYYY-MM-DD format)
          const [tYear, tMonth, tDay] = t.transaction_date.split('T')[0].split('-');
          const transDate = new Date(parseInt(tYear), parseInt(tMonth) - 1, parseInt(tDay));
          
          if (startDate) {
            const [sYear, sMonth, sDay] = startDate.split('-');
            const startDateObj = new Date(parseInt(sYear), parseInt(sMonth) - 1, parseInt(sDay));
            if (transDate < startDateObj) return false;
          }
          if (endDate) {
            const [eYear, eMonth, eDay] = endDate.split('-');
            const endDateObj = new Date(parseInt(eYear), parseInt(eMonth) - 1, parseInt(eDay));
            if (transDate > endDateObj) return false;
          }
        }

        // Amount range filter
        if (minAmount && t.amount < parseFloat(minAmount)) return false;
        if (maxAmount && t.amount > parseFloat(maxAmount)) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by transaction_date descending (most recent first)
        const dateA = new Date(a.transaction_date);
        const dateB = new Date(b.transaction_date);
        return dateB - dateA;
      });
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    storeFilter,
    tagFilter,
    descriptionSearch,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("");
    setStoreFilter("");
    setTagFilter("");
    setDescriptionSearch("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const containerStyle = {
    marginTop: "20px",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const summaryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "10px",
  };

  const summaryItemStyle = {
    textAlign: "center",
    padding: "15px",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
  };

  const filterGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  };

  const filterGroupStyle = {
    display: "flex",
    flexDirection: "column",
  };

  const labelStyle = {
    marginBottom: "5px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  };

  const inputStyle = {
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    fontSize: "14px",
  };

  const buttonRowStyle = {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "15px",
  };

  const clearButtonStyle = {
    padding: "8px 16px",
    backgroundColor: "#666",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  };

  const thStyle = {
    backgroundColor: "#f5f5f5",
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    borderBottom: "2px solid #ddd",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
  };

  const rowStyle = (type) => ({
    backgroundColor: type === "income" ? "#f0f9ff" : "#fff5f5",
  });

  const tagBadgeStyle = {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  };

  const bulkBadgeStyle = {
    backgroundColor: "#f3e5f5",
    color: "#7b1fa2",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  };

  const manualBadgeStyle = {
    backgroundColor: "#e8f5e9",
    color: "#388e3c",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  };

  const deleteButtonStyle = {
    padding: "6px 12px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "13px",
  };

  const editButtonStyle = {
    padding: "6px 12px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "13px",
    marginRight: "5px",
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>View Transactions</h2>
        <button
          onClick={() => {
            fetchTransactions();
            alert("Transactions refreshed!");
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          🔄 Refresh Transactions
        </button>
      </div>


      {/* Summary */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <div style={summaryGridStyle}>
          <div style={{ ...summaryItemStyle, backgroundColor: "#e8f5e9" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              Total Income
            </div>
          </div>
          <div style={{ ...summaryItemStyle, backgroundColor: "#ffebee" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#c62828" }}>
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              Total Expenses
            </div>
          </div>
          <div style={{ ...summaryItemStyle, backgroundColor: netBalance >= 0 ? "#e3f2fd" : "#fff3e0" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: netBalance >= 0 ? "#1565c0" : "#e65100" }}>
              ${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              Net Balance
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <div style={filterGridStyle}>
          {/* Type */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Type</label>
            <select
              style={inputStyle}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          {/* Category */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Category</label>
            <select
              style={inputStyle}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Store */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Store</label>
            <select
              style={inputStyle}
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="">All Stores</option>
              {uniqueStores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Tag</label>
            <select
              style={inputStyle}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Description Search */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Description Search</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Search descriptions..."
              value={descriptionSearch}
              onChange={(e) => setDescriptionSearch(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              style={inputStyle}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Min Amount */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Min Amount</label>
            <input
              type="number"
              style={inputStyle}
              placeholder={`Min: $${globalMinAmount.toFixed(2)}`}
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>

          {/* Max Amount */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Max Amount</label>
            <input
              type="number"
              style={inputStyle}
              placeholder={`Max: $${globalMaxAmount.toFixed(2)}`}
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={clearFilters} style={clearButtonStyle}>
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>
          Transactions ({filteredTransactions.length})
        </h3>
        {filteredTransactions.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "40px" }}>
            No transactions found matching your filters.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Store</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Tag</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Created At</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} style={rowStyle(t.type)}>
                    <td style={tdStyle}>
                      {formatDateSafe(t.transaction_date)}
                    </td>
                    <td style={tdStyle}>
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </td>
                    <td style={tdStyle}>{t.category}</td>
                    <td style={tdStyle}>{t.store}</td>
                    <td style={tdStyle}>${t.amount.toFixed(2)}</td>
                    <td style={tdStyle}>{t.description || "-"}</td>
                    <td style={tdStyle}>
                      {t.tag ? (
                        <span style={tagBadgeStyle}>{t.tag}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={tdStyle}>
                      {t.is_bulk_upload ? (
                        <span style={bulkBadgeStyle}>Bulk</span>
                      ) : (
                        <span style={manualBadgeStyle}>Manual</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {formatTimestampWithTimezone(t.created_at)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleEditTransaction(t)}
                        style={editButtonStyle}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTransaction(t.id)}
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

      {/* Edit Modal */}
      {showEditModal && editingTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && handleCancelEdit()}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Edit Transaction</h2>

            {/* Type */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Type
              </label>
              <select
                value={editingTransaction.type}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, type: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Category */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Category *
              </label>
              <select
                value={editingTransaction.category}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, category: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">-- Select --</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Store */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Store *
              </label>
              <input
                type="text"
                value={editingTransaction.store || ""}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, store: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={editingTransaction.amount}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, amount: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Description
              </label>
              <textarea
                value={editingTransaction.description || ""}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, description: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  minHeight: "60px",
                }}
              />
            </div>

            {/* Tag */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Tag
              </label>
              <input
                type="text"
                value={editingTransaction.tag || ""}
                onChange={(e) =>
                  setEditingTransaction({ ...editingTransaction, tag: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {/* Transaction Date */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Transaction Date *
              </label>
              <input
                type="date"
                value={editingTransaction.transaction_date}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    transaction_date: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ccc",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewTransactions;