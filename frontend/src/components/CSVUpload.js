import React, { useState, useRef, useEffect } from "react";

function CSVUpload({ user, fetchTransactions, onClose }) {
  const [file, setFile] = useState(null);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload', 'mapping', 'review', 'one-by-one', 'complete'
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);
  
  // One-by-one review state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  
  // Column mapping state
  const [csvColumns, setCsvColumns] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    date_column: "",
    amount_column: "",
    debit_column: "",
    credit_column: "",
    store_column: "",
    category_column: "",
    description_column: "",
    use_two_columns: false
  });

  // Category options fetched from backend (single source of truth)
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Fetch categories from backend on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/categories");
        if (res.ok) {
          const data = await res.json();
          // Use 'all' which includes both income and expense categories
          setCategoryOptions(data.all || []);
        } else {
          console.error("Failed to fetch categories, using fallback");
          // Fallback to basic categories if API fails
          setCategoryOptions([
            "Salary", "Interest", "Other Income",
            "Dining", "Groceries", "Gas", "Shopping", "Utilities", "Other"
          ]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        // Fallback to basic categories if API fails
        setCategoryOptions([
          "Salary", "Interest", "Other Income",
          "Dining", "Groceries", "Gas", "Shopping", "Utilities", "Other"
        ]);
      }
    };

    fetchCategories();
  }, []);  // Run once on mount

  // Handle file selection and immediately preview
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      // Automatically preview the file
      await handlePreview(selectedFile);
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

  // Preview CSV for column mapping
  const handlePreview = async (fileToPreview) => {
    const targetFile = fileToPreview || file;
    if (!targetFile) {
      setError("Please select a file first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      const res = await fetch("/transactions/csv-preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to preview CSV");
      }

      const data = await res.json();
      setCsvColumns(data.columns);
      setSampleRows(data.sample_rows);
      
      // Try to auto-detect mappings
      autoDetectMappings(data.columns);
      
      setStep("mapping");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-detect column mappings based on common column names
  const autoDetectMappings = (columns) => {
    const mapping = {
      date_column: "",
      amount_column: "",
      debit_column: "",
      credit_column: "",
      store_column: "",
      category_column: "",
      description_column: "",
      use_two_columns: false
    };

    const lowerColumns = columns.map(c => c.toLowerCase());
    
    // Detect date column
    const dateKeywords = ["date", "transaction date", "posted date", "trans date"];
    for (const keyword of dateKeywords) {
      const idx = lowerColumns.findIndex(c => c.includes(keyword));
      if (idx !== -1) {
        mapping.date_column = columns[idx];
        break;
      }
    }

    // Detect two-column format (debit/credit)
    const hasDebit = lowerColumns.some(c => c.includes("debit"));
    const hasCredit = lowerColumns.some(c => c.includes("credit"));
    
    if (hasDebit && hasCredit) {
      mapping.use_two_columns = true;
      mapping.debit_column = columns[lowerColumns.findIndex(c => c.includes("debit"))];
      mapping.credit_column = columns[lowerColumns.findIndex(c => c.includes("credit"))];
    } else {
      // Single column format
      const amountKeywords = ["amount", "total", "value"];
      for (const keyword of amountKeywords) {
        const idx = lowerColumns.findIndex(c => c.includes(keyword));
        if (idx !== -1) {
          mapping.amount_column = columns[idx];
          break;
        }
      }
    }

    // Detect store column
    const storeKeywords = ["store", "merchant", "description", "vendor", "payee"];
    for (const keyword of storeKeywords) {
      const idx = lowerColumns.findIndex(c => c.includes(keyword));
      if (idx !== -1) {
        mapping.store_column = columns[idx];
        break;
      }
    }

    // Detect category column
    const categoryKeywords = ["category", "type", "class"];
    for (const keyword of categoryKeywords) {
      const idx = lowerColumns.findIndex(c => c.includes(keyword));
      if (idx !== -1) {
        mapping.category_column = columns[idx];
        break;
      }
    }

    // Detect description column (if different from store)
    const descKeywords = ["note", "memo", "comment", "details"];
    for (const keyword of descKeywords) {
      const idx = lowerColumns.findIndex(c => c.includes(keyword));
      if (idx !== -1) {
        mapping.description_column = columns[idx];
        break;
      }
    }

    setColumnMapping(mapping);
  };

  // Parse the CSV file with column mapping
  const handleParse = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    // Validate required fields
    if (!columnMapping.date_column) {
      setError("Please map the Date column");
      return;
    }
    if (!columnMapping.use_two_columns && !columnMapping.amount_column) {
      setError("Please map the Amount column or use two-column format");
      return;
    }
    if (columnMapping.use_two_columns && (!columnMapping.debit_column || !columnMapping.credit_column)) {
      setError("Please map both Debit and Credit columns for two-column format");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping_json", JSON.stringify(columnMapping));

      const res = await fetch("/transactions/parse-csv-with-mapping", {
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
    setCsvColumns([]);
    setSampleRows([]);
    setColumnMapping({
      date_column: "",
      amount_column: "",
      debit_column: "",
      credit_column: "",
      store_column: "",
      category_column: "",
      description_column: "",
      use_two_columns: false
    });
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
    maxWidth: "1200px",
    width: "95%",
    maxHeight: "90vh",
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

  // Category options are now fetched from /categories API endpoint (see useEffect above)
  // This ensures frontend always matches backend's constants.py definitions

  // Render upload step
  const renderUploadStep = () => (
    <>
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#0066cc", fontSize: "16px" }}>
          📋 How This Works
        </h3>
        <p style={{ margin: "0", color: "#333", fontSize: "14px", lineHeight: "1.6" }}>
          Upload your CSV file from any bank. You'll map the columns to transaction fields, 
          then review and import. All transactions are automatically cleaned up and categorized 
          using your custom rules.
        </p>
      </div>

      <div style={inputRowStyle}>
        <label style={labelStyle}>Select CSV File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={inputStyle}
        />
        {file && (
          <span style={{ marginTop: "5px", color: "#666", fontSize: "13px" }}>
            ✓ Selected: {file.name}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={onClose} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </>
  );

  // Render column mapping step
  const renderMappingStep = () => (
    <>
      {/* CSV Preview at top */}
      <div style={{ marginBottom: "25px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "10px", color: "#333", fontSize: "16px" }}>
          📄 CSV File Preview (First 5 rows)
        </h3>
        <div style={{ overflowX: "auto", maxHeight: "180px", border: "1px solid #ddd", borderRadius: "5px", backgroundColor: "#fafafa" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {csvColumns.map((col) => (
                  <th key={col} style={{ ...thStyle, fontSize: "11px", backgroundColor: "#e8e8e8" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, idx) => (
                <tr key={idx}>
                  {csvColumns.map((col) => (
                    <td key={col} style={{ ...tdStyle, fontSize: "11px" }}>
                      {row[col] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Mapping Interface */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#333", fontSize: "16px" }}>
          🗺️ Map Your CSV Columns to Transaction Fields
        </h3>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "20px" }}>
          Fields marked with * are required. Other fields will be auto-generated from your custom rules if not mapped.
        </p>
      </div>

      {/* Amount format selector */}
      <div style={{ ...inputRowStyle, marginBottom: "25px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
        <label style={{ ...labelStyle, marginBottom: "10px" }}>Transaction Amount Format</label>
        <div style={{ display: "flex", gap: "30px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "14px" }}>
            <input
              type="radio"
              checked={!columnMapping.use_two_columns}
              onChange={() => setColumnMapping({ ...columnMapping, use_two_columns: false })}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            <span>Single Amount Column (negative = expense)</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "14px" }}>
            <input
              type="radio"
              checked={columnMapping.use_two_columns}
              onChange={() => setColumnMapping({ ...columnMapping, use_two_columns: true })}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            <span>Separate Debit/Credit Columns</span>
          </label>
        </div>
      </div>

      {/* Mapping Fields - Visible, no scrolling needed */}
      <div style={{ marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold", width: "30%", fontSize: "14px" }}>
                Transaction Field
              </th>
              <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #ddd", width: "5%", fontSize: "14px" }}>
                →
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold", width: "65%", fontSize: "14px" }}>
                Your CSV Column
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Date Row */}
            <tr style={{ backgroundColor: "white" }}>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                📅 Date <span style={{ color: "red", fontWeight: "bold" }}>*</span>
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                →
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                <select
                  value={columnMapping.date_column}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date_column: e.target.value })}
                  style={{ 
                    ...inputStyle, 
                    width: "100%", 
                    padding: "10px",
                    fontSize: "14px",
                    backgroundColor: !columnMapping.date_column ? "#fff3e0" : "white",
                    border: !columnMapping.date_column ? "2px solid #ff9800" : "1px solid #ddd"
                  }}
                >
                  <option value="">-- Select Date Column --</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            {/* Amount Row(s) */}
            {!columnMapping.use_two_columns ? (
              <tr style={{ backgroundColor: "white" }}>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                  💰 Amount <span style={{ color: "red", fontWeight: "bold" }}>*</span>
                  <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "3px" }}>
                    Negative values = expenses
                  </div>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                  →
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                  <select
                    value={columnMapping.amount_column}
                    onChange={(e) => setColumnMapping({ ...columnMapping, amount_column: e.target.value })}
                    style={{ 
                      ...inputStyle, 
                      width: "100%", 
                      padding: "10px",
                      fontSize: "14px",
                      backgroundColor: !columnMapping.amount_column ? "#fff3e0" : "white",
                      border: !columnMapping.amount_column ? "2px solid #ff9800" : "1px solid #ddd"
                    }}
                  >
                    <option value="">-- Select Amount Column --</option>
                    {csvColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ) : (
              <>
                <tr style={{ backgroundColor: "white" }}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                    💸 Debit (Expenses) <span style={{ color: "red", fontWeight: "bold" }}>*</span>
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                    →
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                    <select
                      value={columnMapping.debit_column}
                      onChange={(e) => setColumnMapping({ ...columnMapping, debit_column: e.target.value })}
                      style={{ 
                        ...inputStyle, 
                        width: "100%", 
                        padding: "10px",
                        fontSize: "14px",
                        backgroundColor: !columnMapping.debit_column ? "#fff3e0" : "white",
                        border: !columnMapping.debit_column ? "2px solid #ff9800" : "1px solid #ddd"
                      }}
                    >
                      <option value="">-- Select Debit Column --</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr style={{ backgroundColor: "white" }}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                    💵 Credit (Income) <span style={{ color: "red", fontWeight: "bold" }}>*</span>
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                    →
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                    <select
                      value={columnMapping.credit_column}
                      onChange={(e) => setColumnMapping({ ...columnMapping, credit_column: e.target.value })}
                      style={{ 
                        ...inputStyle, 
                        width: "100%", 
                        padding: "10px",
                        fontSize: "14px",
                        backgroundColor: !columnMapping.credit_column ? "#fff3e0" : "white",
                        border: !columnMapping.credit_column ? "2px solid #ff9800" : "1px solid #ddd"
                      }}
                    >
                      <option value="">-- Select Credit Column --</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </>
            )}

            {/* Optional Fields */}
            <tr style={{ backgroundColor: "#fafafa" }}>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                🏪 Store/Merchant
                <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "3px" }}>
                  Auto-cleaned if mapped, or auto-generated
                </div>
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                →
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                <select
                  value={columnMapping.store_column}
                  onChange={(e) => setColumnMapping({ ...columnMapping, store_column: e.target.value })}
                  style={{ ...inputStyle, width: "100%", padding: "10px", fontSize: "14px" }}
                >
                  <option value="">-- Auto-generate from rules --</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            <tr style={{ backgroundColor: "#fafafa" }}>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                🏷️ Category
                <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "3px" }}>
                  Auto-categorized using your custom rules
                </div>
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                →
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                <select
                  value={columnMapping.category_column}
                  onChange={(e) => setColumnMapping({ ...columnMapping, category_column: e.target.value })}
                  style={{ ...inputStyle, width: "100%", padding: "10px", fontSize: "14px" }}
                >
                  <option value="">-- Auto-categorize from rules --</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            <tr style={{ backgroundColor: "#fafafa" }}>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "500", fontSize: "14px" }}>
                📝 Description/Notes
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                →
              </td>
              <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                <select
                  value={columnMapping.description_column}
                  onChange={(e) => setColumnMapping({ ...columnMapping, description_column: e.target.value })}
                  style={{ ...inputStyle, width: "100%", padding: "10px", fontSize: "14px" }}
                >
                  <option value="">-- Leave blank --</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "25px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <button onClick={handleParse} style={buttonStyle} disabled={isLoading}>
          {isLoading ? "Parsing..." : "Parse & Review Transactions"}
        </button>
        <button onClick={() => setStep("upload")} style={secondaryButtonStyle}>
          ← Back
        </button>
        <button onClick={onClose} style={{ ...secondaryButtonStyle, marginLeft: "auto" }}>
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
              <th style={thStyle}>Store *</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Category *</th>
              <th style={thStyle}>Tag</th>
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
                    style={{ 
                      ...inputStyle, 
                      padding: "4px 6px", 
                      fontSize: "11px", 
                      width: "100%",
                      backgroundColor: !t.store ? "#fff3e0" : "white"
                    }}
                    disabled={!t.selected}
                    placeholder="Store name"
                  />
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      backgroundColor: t.type === "income" ? "#e8f5e9" : "#ffebee",
                      color: t.type === "income" ? "#2e7d32" : "#c62828",
                    }}
                  >
                    {t.type.toUpperCase()}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: "bold", color: t.type === "income" ? "#2e7d32" : "#c62828" }}>
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
                <td style={{ ...tdStyle, maxWidth: "100px" }}>
                  <input
                    type="text"
                    value={t.tag}
                    onChange={(e) => updateTransaction(t.id, "tag", e.target.value)}
                    style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "100%" }}
                    disabled={!t.selected}
                    placeholder="Optional tag"
                  />
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
            {/* Header row */}
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
                  <option value="">-- Select --</option>
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
      case "mapping":
        return "🗺️ Map Columns";
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
        {step === "mapping" && renderMappingStep()}
        {step === "review" && renderReviewStep()}
        {step === "one-by-one" && renderOneByOneStep()}
        {step === "complete" && renderCompleteStep()}
      </div>
    </div>
  );
}

export default CSVUpload;