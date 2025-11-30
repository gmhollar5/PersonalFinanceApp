import React, { useState, useRef } from "react";

function CSVUpload({ user, fetchTransactions, onClose }) {
  const [file, setFile] = useState(null);
  const [bankType, setBankType] = useState("auto");
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload', 'review', 'one-by-one', 'complete'
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);
  
  // One-by-one review state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

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
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
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
      
      const transactionsWithEdit = data.transactions.map((t, idx) => ({
        id: idx,
        date: formatDate(t.date),
        store: t.store || "",
        description: t.description || "",
        amount: t.amount,
        type: t.type,
        category: t.suggested_category || "",
        original_type: t.original_type,
        selected: true,
        reviewed: false, // Track if reviewed in one-by-one mode
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

  // Start one-by-one review mode
  const startOneByOneReview = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setStep("one-by-one");
  };

  // Get current transaction for one-by-one review
  const getCurrentTransaction = () => {
    return parsedTransactions[currentIndex] || null;
  };

  // Save current transaction and move to next
  const saveAndNext = () => {
    setParsedTransactions((prev) =>
      prev.map((t, idx) =>
        idx === currentIndex ? { ...t, selected: true, reviewed: true } : t
      )
    );
    setReviewedCount((prev) => prev + 1);
    moveToNext();
  };

  // Skip current transaction (deselect it)
  const skipTransaction = () => {
    setParsedTransactions((prev) =>
      prev.map((t, idx) =>
        idx === currentIndex ? { ...t, selected: false, reviewed: true } : t
      )
    );
    setReviewedCount((prev) => prev + 1);
    moveToNext();
  };

  // Move to next transaction
  const moveToNext = () => {
    if (currentIndex < parsedTransactions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished reviewing all
      setStep("review"); // Go back to table view to see final state
    }
  };

  // Go back to table view from one-by-one
  const backToTableView = () => {
    setStep("review");
  };

  // Update current transaction field in one-by-one mode
  const updateCurrentTransaction = (field, value) => {
    setParsedTransactions((prev) =>
      prev.map((t, idx) => (idx === currentIndex ? { ...t, [field]: value } : t))
    );
  };

  // Import selected transactions
  const handleImport = async () => {
    const selectedTransactions = parsedTransactions.filter((t) => t.selected);
    
    if (selectedTransactions.length === 0) {
      setError("Please select at least one transaction to import");
      return;
    }

    const missingCategory = selectedTransactions.find((t) => !t.category);
    if (missingCategory) {
      setError("Please select a category for all transactions before importing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const transactionsToCreate = selectedTransactions.map((t) => ({
        type: t.type,
        category: t.category,
        store: t.store || null,
        amount: t.amount,
        description: t.description || null,
        transaction_date: t.date,
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
      fetchTransactions();
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
    setCurrentIndex(0);
    setReviewedCount(0);
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
    overflow: "auto",
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

  const reviewModeButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#9c27b0",
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

  // Render review step (table view)
  const renderReviewStep = () => (
    <>
      <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <strong>{parsedTransactions.length}</strong> transactions found,{" "}
          <strong>{getSelectedCount()}</strong> selected for import
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={startOneByOneReview}
            style={{ ...reviewModeButtonStyle, padding: "8px 16px", fontSize: "12px" }}
          >
            🔍 Review One-by-One
          </button>
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
                  backgroundColor: t.selected ? (t.reviewed ? "#e8f5e9" : "white") : "#f9f9f9",
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

  // Render one-by-one review step
  const renderOneByOneStep = () => {
    const current = getCurrentTransaction();
    const progress = ((currentIndex) / parsedTransactions.length) * 100;
    const isLastTransaction = currentIndex === parsedTransactions.length - 1;
    const isFinished = currentIndex >= parsedTransactions.length;

    // Show completion message when done
    if (isFinished) {
      const selectedAfterReview = parsedTransactions.filter((t) => t.selected).length;
      return (
        <div style={{ textAlign: "center", padding: "30px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "15px" }}>🎉</div>
          <h3 style={{ color: "#2e7d32", marginBottom: "8px" }}>Review Complete!</h3>
          <p style={{ color: "#666", marginBottom: "8px", fontSize: "14px" }}>
            You've reviewed all <strong>{parsedTransactions.length}</strong> transactions.
          </p>
          <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
            <strong>{selectedAfterReview}</strong> transactions are selected for import.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={backToTableView} style={buttonStyle}>
              View Summary & Import
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Progress Bar */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "13px", color: "#666" }}>
              Transaction {currentIndex + 1} of {parsedTransactions.length}
            </span>
            <span style={{ fontSize: "13px", color: "#666" }}>
              {Math.round(progress)}% complete
            </span>
          </div>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            backgroundColor: "#e0e0e0", 
            borderRadius: "3px",
            overflow: "hidden"
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: "100%", 
              backgroundColor: "#4CAF50",
              borderRadius: "3px",
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>

        {/* Compact Transaction Card */}
        {current && (
          <div style={{ 
            backgroundColor: "#f9f9f9", 
            borderRadius: "8px", 
            padding: "15px",
            border: "1px solid #e0e0e0",
          }}>
            {/* Header row with date, type, and amount */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "12px",
              paddingBottom: "10px",
              borderBottom: "1px solid #e0e0e0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "14px", color: "#666" }}>
                  {current.date}
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    backgroundColor: current.type === "income" ? "#e8f5e9" : "#ffebee",
                    color: current.type === "income" ? "#2e7d32" : "#c62828",
                  }}
                >
                  {current.type.toUpperCase()}
                </span>
              </div>
              <div style={{ 
                fontSize: "22px", 
                fontWeight: "bold",
                color: current.type === "income" ? "#2e7d32" : "#c62828"
              }}>
                ${current.amount.toFixed(2)}
              </div>
            </div>

            {/* Form fields in a more compact layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Store
                </label>
                <input
                  type="text"
                  value={current.store}
                  onChange={(e) => updateCurrentTransaction("store", e.target.value)}
                  style={{ ...inputStyle, fontSize: "13px", padding: "8px", width: "100%", boxSizing: "border-box" }}
                  placeholder="Store name"
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Category *
                </label>
                <select
                  value={current.category}
                  onChange={(e) => updateCurrentTransaction("category", e.target.value)}
                  style={{ 
                    ...inputStyle, 
                    fontSize: "13px", 
                    padding: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: !current.category ? "#fff3e0" : "white"
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

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Description / Notes
                </label>
                <input
                  type="text"
                  value={current.description}
                  onChange={(e) => updateCurrentTransaction("description", e.target.value)}
                  style={{ ...inputStyle, fontSize: "13px", padding: "8px", width: "100%", boxSizing: "border-box" }}
                  placeholder="Add optional notes..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          marginTop: "15px", 
          justifyContent: "center",
          alignItems: "center"
        }}>
          <button 
            onClick={skipTransaction} 
            style={{ 
              ...secondaryButtonStyle, 
              padding: "10px 24px",
              fontSize: "14px",
              backgroundColor: "#f44336"
            }}
          >
            ❌ Skip
          </button>
          <button 
            onClick={saveAndNext} 
            style={{ 
              ...buttonStyle, 
              padding: "10px 24px",
              fontSize: "14px"
            }}
            disabled={!current?.category}
          >
            ✓ {isLastTransaction ? "Save & Finish" : "Save & Next"}
          </button>
          <span style={{ color: "#ccc", margin: "0 5px" }}>|</span>
          <button 
            onClick={backToTableView}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#666", 
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "13px"
            }}
          >
            ← Back to table
          </button>
        </div>
      </>
    );
  };

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

  // Get header title based on step
  const getHeaderTitle = () => {
    switch (step) {
      case "upload":
        return "📤 Upload CSV";
      case "review":
        return "📋 Review Transactions";
      case "one-by-one":
        return "🔍 Review One-by-One";
      case "complete":
        return "✅ Import Complete";
      default:
        return "CSV Upload";
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: "#1a1a2e" }}>{getHeaderTitle()}</h2>
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
        {step === "one-by-one" && renderOneByOneStep()}
        {step === "complete" && renderCompleteStep()}
      </div>
    </div>
  );
}

export default CSVUpload;