import React, { useState, useRef } from "react";

// =============================================================================
// REFINED CATEGORY LISTS (matching constants.py and AddTransaction.js)
// =============================================================================
const EXPENSE_CATEGORIES = [
  "Car Payment",
  "Dining Out",
  "Education",
  "Entertainment",
  "Gas & Auto",
  "Gifts",
  "Groceries",
  "Health & Fitness",
  "Household",
  "Other Expense",
  "Phone",
  "Recreation",
  "Rent",
  "Shopping",
  "Student Loan",
  "Subscriptions",
  "Travel",
  "Utilities"
];

const INCOME_CATEGORIES = [
  "Gift",
  "Interest",
  "Other Income",
  "Refund",
  "Salary"
];

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
      
      // Map parsed transactions with suggested categories
      const transactionsWithEdit = data.transactions.map((t, idx) => ({
        id: idx,
        date: formatDate(t.date),
        store: t.store || "",
        description: t.description || "",
        amount: t.amount,
        type: t.type,
        category: t.suggested_category || "",  // ✅ Pre-selected suggested category
        tag: "",
        original_type: t.original_type,
        selected: true,
        reviewed: false,
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
      setStep("review");
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

    const missingStore = selectedTransactions.find((t) => !t.store);
    if (missingStore) {
      setError("Please provide a store name for all transactions before importing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // STEP 1: Create upload session
      const sessionRes = await fetch("/upload-sessions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          upload_type: "bulk",
          transaction_count: selectedTransactions.length,
        }),
      });

      if (!sessionRes.ok) {
        throw new Error("Failed to create upload session");
      }

      const session = await sessionRes.json();
      const uploadSessionId = session.id;

      // STEP 2: Calculate date range
      const dates = selectedTransactions.map(t => new Date(t.date));
      const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

      // STEP 3: Create transactions with session ID
      const transactionsToCreate = selectedTransactions.map((t) => ({
        type: t.type,
        category: t.category,
        store: t.store,
        amount: t.amount,
        description: t.description || null,
        tag: t.tag || null,
        transaction_date: t.date,
        is_bulk_upload: true,
        upload_session_id: uploadSessionId,
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

      // STEP 4: Update session with date range
      await fetch(`/upload-sessions/${uploadSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_transaction_date: minDate,
          max_transaction_date: maxDate,
        }),
      });

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

  const getSelectedCount = () => parsedTransactions.filter((t) => t.selected).length;

  // Get categories based on transaction type
  const getCategoryOptions = (transactionType) => {
    return transactionType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
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
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const modalContentStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "900px",
    width: "90%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
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
  };

  const secondaryButtonStyle = {
    backgroundColor: "#9E9E9E",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    fontSize: "12px",
  };

  const thStyle = {
    backgroundColor: "#f5f5f5",
    padding: "10px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontWeight: "bold",
  };

  const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
  };

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
  const renderReviewStep = () => {
    const current = getCurrentTransaction();
    const isLastTransaction = currentIndex === parsedTransactions.length - 1;

    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <div>
            <strong>{getSelectedCount()}</strong> of {parsedTransactions.length} transactions selected
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => toggleAll(true)} style={secondaryButtonStyle}>
              Select All
            </button>
            <button onClick={() => toggleAll(false)} style={secondaryButtonStyle}>
              Deselect All
            </button>
            <button onClick={startOneByOneReview} style={{ ...buttonStyle, backgroundColor: "#2196F3" }}>
              📝 Review One by One
            </button>
          </div>
        </div>

        <div style={{ maxHeight: "400px", overflowY: "auto", overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>✓</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Store</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Tag</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {parsedTransactions.map((t) => (
                <tr key={t.id} style={{ backgroundColor: t.selected ? "white" : "#f9f9f9" }}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={() => toggleTransaction(t.id)}
                    />
                  </td>
                  <td style={tdStyle}>{t.date}</td>
                  <td style={{ ...tdStyle, maxWidth: "150px" }}>
                    <input
                      type="text"
                      value={t.store}
                      onChange={(e) => updateTransaction(t.id, "store", e.target.value)}
                      style={{
                        ...inputStyle,
                        padding: "4px 6px",
                        fontSize: "11px",
                        width: "100%",
                        backgroundColor: !t.store ? "#fff3e0" : "white"
                      }}
                      disabled={!t.selected}
                      placeholder="Store name *"
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
                        width: "140px",
                        backgroundColor: !t.category ? "#fff3e0" : "white"
                      }}
                      disabled={!t.selected}
                    >
                      <option value="">-- Select Category --</option>
                      {getCategoryOptions(t.type).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "100px" }}>
                    <input
                      type="text"
                      value={t.tag}
                      onChange={(e) => updateTransaction(t.id, "tag", e.target.value)}
                      style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "100%" }}
                      disabled={!t.selected}
                      placeholder="Optional"
                    />
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "120px" }}>
                    <input
                      type="text"
                      value={t.description}
                      onChange={(e) => updateTransaction(t.id, "description", e.target.value)}
                      style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "100%" }}
                      disabled={!t.selected}
                      placeholder="Optional"
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
          <button onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
        </div>
      </>
    );
  };

  // Render one-by-one review step
  const renderOneByOneStep = () => {
    const current = getCurrentTransaction();
    if (!current) return null;

    const isLastTransaction = currentIndex === parsedTransactions.length - 1;
    const categoryOptions = getCategoryOptions(current.type);

    return (
      <>
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Transaction {currentIndex + 1}</strong> of {parsedTransactions.length}
            </div>
            <div>
              Reviewed: <strong>{reviewedCount}</strong> | Remaining: <strong>{parsedTransactions.length - reviewedCount}</strong>
            </div>
          </div>
        </div>

        {current && (
          <div style={{ padding: "20px", border: "2px solid #e0e0e0", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
                  {current.date}
                </div>
                <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "5px" }}>
                  {current.store || "(No store name)"}
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
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

            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Store *
                </label>
                <input
                  type="text"
                  value={current.store}
                  onChange={(e) => updateCurrentTransaction("store", e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: "13px",
                    padding: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: !current.store ? "#fff3e0" : "white"
                  }}
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
                  <option value="">-- Select Category --</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Tag (Optional)
                </label>
                <input
                  type="text"
                  value={current.tag}
                  onChange={(e) => updateCurrentTransaction("tag", e.target.value)}
                  style={{ ...inputStyle, fontSize: "13px", padding: "8px", width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g., vacation"
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#333", display: "block", marginBottom: "3px" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={current.description}
                  onChange={(e) => updateCurrentTransaction("description", e.target.value)}
                  style={{ ...inputStyle, fontSize: "13px", padding: "8px", width: "100%", boxSizing: "border-box" }}
                  placeholder="Optional notes"
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
            disabled={!current?.category || !current?.store}
          >
            ✓ {isLastTransaction ? "Finish Review" : "Save & Next"}
          </button>
          <button
            onClick={backToTableView}
            style={{
              ...secondaryButtonStyle,
              padding: "10px 24px",
              fontSize: "14px"
            }}
          >
            ← Back to Table
          </button>
        </div>
      </>
    );
  };

  // Render complete step
  const renderCompleteStep = () => (
    <>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
        <h3 style={{ color: "#4CAF50", marginBottom: "10px" }}>Import Successful!</h3>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          {importStats?.success_count || 0} transactions have been imported.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={handleReset} style={buttonStyle}>
            Import Another File
          </button>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#1a1a2e" }}>
          CSV Import
        </h2>

        {error && (
          <div style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "5px",
            marginBottom: "15px",
            fontSize: "14px"
          }}>
            ⚠️ {error}
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