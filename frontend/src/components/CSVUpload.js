import React, { useState, useRef } from "react";

function CSVUpload({ user, fetchTransactions, onClose }) {
  const [file, setFile] = useState(null);
  const [bankType, setBankType] = useState("auto");
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload', 'review', 'complete'
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError("Please select a CSV file");
      setFile(null);
    }
  };

  // Format date for display (YYYY-MM-DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    // Otherwise try to parse and format
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  // Parse the CSV file
  const handleParse = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bank_type", bankType);

      const res = await fetch("/transactions/parse-csv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to parse CSV");
      }

      const data = await res.json();
      
      // Add editable fields to each transaction
      // Backend now returns: date, store, description (null), original_type, amount, type, suggested_category
      const transactionsWithEdit = data.transactions.map((t, idx) => ({
        id: idx,
        date: formatDate(t.date),
        store: t.store || "",
        description: t.description || "",  // Will be empty by default
        amount: t.amount,
        type: t.type,
        category: t.suggested_category || "",
        original_type: t.original_type,
        selected: true, // All selected by default
      }));

      setParsedTransactions(transactionsWithEdit);
      setStep("review");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle transaction selection
  const toggleTransaction = (id) => {
    setParsedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  // Update transaction field
  const updateTransaction = (id, field, value) => {
    setParsedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  // Select/Deselect all
  const toggleAll = (selected) => {
    setParsedTransactions((prev) => prev.map((t) => ({ ...t, selected })));
  };

  // Import selected transactions
  const handleImport = async () => {
    const selectedTransactions = parsedTransactions.filter((t) => t.selected);
    
    if (selectedTransactions.length === 0) {
      setError("Please select at least one transaction to import");
      return;
    }

    // Validate all selected transactions have categories
    const missingCategory = selectedTransactions.find((t) => !t.category);
    if (missingCategory) {
      setError("Please select a category for all transactions before importing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Format transactions for the API
      // Ensure date is in YYYY-MM-DD string format
      const transactionsToCreate = selectedTransactions.map((t) => ({
        type: t.type,
        category: t.category,
        store: t.store || null,
        amount: t.amount,
        description: t.description || null,
        transaction_date: t.date,  // Already in YYYY-MM-DD format
      }));

      const res = await fetch("/transactions/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactionsToCreate,
          user_id: user.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to import transactions");
      }

      const data = await res.json();
      setImportStats(data);
      setStep("complete");
      fetchTransactions(); // Refresh the transaction list
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setFile(null);
    setParsedTransactions([]);
    setStep("upload");
    setError(null);
    setImportStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Styles
  const modalOverlayStyle = {
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
  };

  const modalStyle = {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "30px",
    maxWidth: "1000px",
    width: "95%",
    maxHeight: "85vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "15px",
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
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#666",
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  };

  const thStyle = {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "2px solid #ddd",
    backgroundColor: "#f5f5f5",
    position: "sticky",
    top: 0,
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "6px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
  };

  const getSelectedCount = () => parsedTransactions.filter((t) => t.selected).length;

  // Common category options
  const categoryOptions = [
    "Salary",
    "Interest",
    "Other Income",
    "Tax Refund",
    "Transfer",
    "Side Income",
    "Payment/Credit",
    "Groceries",
    "Dining",
    "Shopping",
    "Gas",
    "Utilities",
    "Rent",
    "Subscriptions",
    "Entertainment",
    "Health & Fitness",
    "Health",
    "Travel",
    "Education",
    "Loan Payment",
    "Credit Card Payment",
    "ATM/Cash",
    "Fees",
    "Services",
    "Internal Transfer",
    "Other",
  ];

  // Render upload step
  const renderUploadStep = () => (
    <>
      <div style={inputRowStyle}>
        <label style={labelStyle}>Bank Type</label>
        <select
          value={bankType}
          onChange={(e) => setBankType(e.target.value)}
          style={inputStyle}
        >
          <option value="auto">Auto-detect</option>
          <option value="sofi">SoFi</option>
          <option value="capital_one">Capital One</option>
        </select>
      </div>

      <div style={inputRowStyle}>
        <label style={labelStyle}>CSV File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={inputStyle}
        />
        {file && (
          <span style={{ marginTop: "5px", color: "#666", fontSize: "13px" }}>
            Selected: {file.name}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={handleParse} style={buttonStyle} disabled={!file || isLoading}>
          {isLoading ? "Parsing..." : "Parse CSV"}
        </button>
        <button onClick={onClose} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </>
  );

  // Render review step
  const renderReviewStep = () => (
    <>
      <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{parsedTransactions.length}</strong> transactions found,{" "}
          <strong>{getSelectedCount()}</strong> selected for import
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => toggleAll(true)}
            style={{ ...secondaryButtonStyle, padding: "8px 16px", fontSize: "12px" }}
          >
            Select All
          </button>
          <button
            onClick={() => toggleAll(false)}
            style={{ ...secondaryButtonStyle, padding: "8px 16px", fontSize: "12px" }}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, maxHeight: "400px" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>✓</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Store</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {parsedTransactions.map((t) => (
              <tr
                key={t.id}
                style={{
                  backgroundColor: t.selected ? "white" : "#f9f9f9",
                  opacity: t.selected ? 1 : 0.6,
                }}
              >
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={t.selected}
                    onChange={() => toggleTransaction(t.id)}
                  />
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{t.date}</td>
                <td style={{ ...tdStyle, maxWidth: "150px" }}>
                  <input
                    type="text"
                    value={t.store}
                    onChange={(e) => updateTransaction(t.id, "store", e.target.value)}
                    style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "100%" }}
                    disabled={!t.selected}
                    placeholder="Store name"
                  />
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "10px",
                      backgroundColor: t.type === "income" ? "#e8f5e9" : "#ffebee",
                      color: t.type === "income" ? "#2e7d32" : "#c62828",
                    }}
                  >
                    {t.type}
                  </span>
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  <span style={{ color: t.type === "income" ? "#2e7d32" : "#c62828" }}>
                    ${t.amount.toFixed(2)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <select
                    value={t.category}
                    onChange={(e) => updateTransaction(t.id, "category", e.target.value)}
                    style={{ 
                      ...inputStyle, 
                      padding: "4px 6px", 
                      fontSize: "11px", 
                      width: "110px",
                      backgroundColor: !t.category ? "#fff3e0" : "white"
                    }}
                    disabled={!t.selected}
                  >
                    <option value="">-- Select --</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ ...tdStyle, maxWidth: "120px" }}>
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) => updateTransaction(t.id, "description", e.target.value)}
                    style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "100%" }}
                    disabled={!t.selected}
                    placeholder="Optional notes"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <button onClick={handleImport} style={buttonStyle} disabled={isLoading || getSelectedCount() === 0}>
          {isLoading ? "Importing..." : `Import ${getSelectedCount()} Transactions`}
        </button>
        <button onClick={handleReset} style={secondaryButtonStyle}>
          Start Over
        </button>
        <button onClick={onClose} style={{ ...secondaryButtonStyle, marginLeft: "auto" }}>
          Cancel
        </button>
      </div>
    </>
  );

  // Render complete step
  const renderCompleteStep = () => (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
      <h3 style={{ color: "#2e7d32", marginBottom: "10px" }}>Import Complete!</h3>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Successfully imported <strong>{importStats?.created_count || 0}</strong> transactions.
      </p>
      {importStats?.errors && importStats.errors.length > 0 && (
        <div style={{ backgroundColor: "#fff3e0", padding: "15px", borderRadius: "5px", marginBottom: "20px", textAlign: "left" }}>
          <strong>Some errors occurred:</strong>
          <ul style={{ margin: "10px 0", paddingLeft: "20px" }}>
            {importStats.errors.map((err, idx) => (
              <li key={idx} style={{ color: "#e65100" }}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={handleReset} style={buttonStyle}>
          Import More
        </button>
        <button onClick={onClose} style={secondaryButtonStyle}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: "#1a1a2e" }}>
            📤 {step === "upload" ? "Upload CSV" : step === "review" ? "Review Transactions" : "Import Complete"}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "10px 15px",
              borderRadius: "5px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        {step === "upload" && renderUploadStep()}
        {step === "review" && renderReviewStep()}
        {step === "complete" && renderCompleteStep()}
      </div>
    </div>
  );
}

export default CSVUpload;