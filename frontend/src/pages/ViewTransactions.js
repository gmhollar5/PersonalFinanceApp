import React, { useState, useMemo } from "react";

function ViewTransactions({ transactions }) {
  // Filter states
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Get unique categories and stores
  const uniqueCategories = [...new Set(transactions.map((t) => t.category))].sort();
  const uniqueStores = [...new Set(transactions.map((t) => t.store).filter(Boolean))].sort();

  // Get min and max amounts
  const amounts = transactions.map((t) => t.amount);
  const globalMinAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
  const globalMaxAmount = amounts.length > 0 ? Math.max(...amounts) : 1000;

  // Filter transactions - FIXED date filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (typeFilter !== "all" && t.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter && t.category !== categoryFilter) return false;

      // Store filter
      if (storeFilter && t.store !== storeFilter) return false;

      // Description search
      if (
        descriptionSearch &&
        !t.description?.toLowerCase().includes(descriptionSearch.toLowerCase())
      ) {
        return false;
      }

      // Date range filter - FIXED
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

  const filtersCardStyle = {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const filtersGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
    marginBottom: "15px",
  };

  const filterItemStyle = {
    display: "flex",
    flexDirection: "column",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "5px",
    color: "#555",
  };

  const inputStyle = {
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
  };

  const summaryCardStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  };

  const summaryItemStyle = {
    textAlign: "center",
  };

  const transactionsCardStyle = {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const transactionItemStyle = {
    border: "1px solid #e0e0e0",
    borderRadius: "5px",
    padding: "15px",
    marginBottom: "10px",
    backgroundColor: "#fafafa",
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#ff4444",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "10px" }}>All Transactions</h2>

      {/* Filters */}
      <div style={filtersCardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0, color: "#333" }}>Filters</h3>
          <button onClick={clearFilters} style={buttonStyle}>
            Clear All Filters
          </button>
        </div>

        <div style={filtersGridStyle}>
          <div style={filterItemStyle}>
            <label style={labelStyle}>Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={inputStyle}>
              <option value="">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Store</label>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} style={inputStyle}>
              <option value="">All Stores</option>
              {uniqueStores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Description Search</label>
            <input
              type="text"
              value={descriptionSearch}
              onChange={(e) => setDescriptionSearch(e.target.value)}
              style={inputStyle}
              placeholder="Search..."
            />
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Min Amount</label>
            <input
              type="number"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              style={inputStyle}
              placeholder={`Min: $${globalMinAmount.toFixed(2)}`}
            />
          </div>

          <div style={filterItemStyle}>
            <label style={labelStyle}>Max Amount</label>
            <input
              type="number"
              step="0.01"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              style={inputStyle}
              placeholder={`Max: $${globalMaxAmount.toFixed(2)}`}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={summaryCardStyle}>
        <div style={summaryItemStyle}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
            Total Transactions
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
            {filteredTransactions.length}
          </div>
        </div>
        <div style={summaryItemStyle}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Total Income</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}>
            ${totalIncome.toFixed(2)}
          </div>
        </div>
        <div style={summaryItemStyle}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
            Total Expenses
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff4444" }}>
            ${totalExpenses.toFixed(2)}
          </div>
        </div>
        <div style={summaryItemStyle}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>Net Balance</div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: netBalance >= 0 ? "#4CAF50" : "#ff4444",
            }}
          >
            ${netBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Transactions list */}
      <div style={transactionsCardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>
          Transactions ({filteredTransactions.length})
        </h3>
        <div style={{ maxHeight: "600px", overflowY: "auto" }}>
          {filteredTransactions.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center", padding: "40px" }}>
              No transactions match your filters
            </p>
          ) : (
            filteredTransactions
              .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
              .map((t) => (
                <div key={t.id} style={transactionItemStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "18px", marginRight: "10px" }}>
                        {t.type === "income" ? "➕" : "➖"} ${t.amount.toFixed(2)}
                      </strong>
                      <span
                        style={{
                          backgroundColor: t.type === "income" ? "#4CAF50" : "#ff4444",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "3px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {t.type.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: "14px", color: "#999" }}>
                      {new Date(t.transaction_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div style={{ color: "#555", marginBottom: "5px" }}>
                    <strong>Category:</strong> {t.category}
                    {t.store && (
                      <>
                        {" "}
                        • <strong>Store:</strong> {t.store}
                      </>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: "14px", color: "#777" }}>{t.description}</div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewTransactions;