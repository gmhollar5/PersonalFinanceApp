import React, { useState, useMemo } from "react";

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

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
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
      const transactionDate = new Date(t.transaction_date);
      if (startDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        transactionDate.setHours(0, 0, 0, 0);
        if (transactionDate < startDateObj) return false;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        const checkDate = new Date(t.transaction_date);
        checkDate.setHours(0, 0, 0, 0);
        if (checkDate > endDateObj) return false;
      }

      // Amount range filter
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;

      return true;
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

  const filterGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  };

  const filterGroupStyle = {
    display: "flex",
    flexDirection: "column",
  };

  const labelStyle = {
    fontWeight: "bold",
    marginBottom: "5px",
    fontSize: "14px",
    color: "#333",
  };

  const inputStyle = {
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
  };

  const buttonRowStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  };

  const clearButtonStyle = {
    backgroundColor: "#ff9800",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  };

  const summaryBoxStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "20px",
  };

  const summaryItemStyle = (color) => ({
    backgroundColor: color,
    padding: "20px",
    borderRadius: "8px",
    color: "white",
    textAlign: "center",
  });

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const thStyle = {
    backgroundColor: "#1a1a2e",
    color: "white",
    padding: "12px",
    textAlign: "left",
    fontWeight: "bold",
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
  };

  const rowStyle = (type) => ({
    backgroundColor: type === "income" ? "#e8f5e9" : "#ffebee",
  });

  const deleteButtonStyle = {
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  };

  const badgeStyle = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "bold",
    marginLeft: "8px",
  };

  const bulkBadgeStyle = {
    ...badgeStyle,
    backgroundColor: "#2196F3",
    color: "white",
  };

  const manualBadgeStyle = {
    ...badgeStyle,
    backgroundColor: "#9E9E9E",
    color: "white",
  };

  const tagBadgeStyle = {
    ...badgeStyle,
    backgroundColor: "#9C27B0",
    color: "white",
  };

  return (
    <div style={containerStyle}>
      <h2>View Transactions</h2>

      {/* Summary */}
      <div style={summaryBoxStyle}>
        <div style={summaryItemStyle("#4CAF50")}>
          <h3>Total Income</h3>
          <p style={{ fontSize: "24px", margin: "10px 0" }}>
            ${totalIncome.toFixed(2)}
          </p>
        </div>
        <div style={summaryItemStyle("#f44336")}>
          <h3>Total Expenses</h3>
          <p style={{ fontSize: "24px", margin: "10px 0" }}>
            ${totalExpenses.toFixed(2)}
          </p>
        </div>
        <div style={summaryItemStyle("#2196F3")}>
          <h3>Net Balance</h3>
          <p style={{ fontSize: "24px", margin: "10px 0" }}>
            ${netBalance.toFixed(2)}
          </p>
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

          {/* Description */}
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Search description..."
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
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} style={rowStyle(t.type)}>
                    <td style={tdStyle}>
                      {new Date(t.transaction_date).toLocaleDateString()}
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
    </div>
  );
}

export default ViewTransactions;