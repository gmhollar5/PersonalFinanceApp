import React, { useState, useMemo } from "react";

function Analytics({ transactions, user }) {
  const [selectedView, setSelectedView] = useState("visualizations");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  // Helper function to format currency
  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  // Helper function to get date string
  const getDateString = (date) => new Date(date).toLocaleDateString();

  // Calculate spending by category
  const spendingByCategory = useMemo(() => {
    const categoryTotals = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [transactions]);

  // Calculate spending by store
  const spendingByStore = useMemo(() => {
    const storeTotals = {};
    transactions
      .filter((t) => t.type === "expense" && t.store)
      .forEach((t) => {
        storeTotals[t.store] = (storeTotals[t.store] || 0) + t.amount;
      });
    return Object.entries(storeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [transactions]);

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    const monthlyData = {};
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }
      if (t.type === "income") {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expenses += t.amount;
      }
    });
    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);
  }, [transactions]);

  // Calculate weekly trends
  const weeklyTrends = useMemo(() => {
    const weeklyData = {};
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { income: 0, expenses: 0 };
      }
      if (t.type === "income") {
        weeklyData[weekKey].income += t.amount;
      } else {
        weeklyData[weekKey].expenses += t.amount;
      }
    });
    return Object.entries(weeklyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8);
  }, [transactions]);

  // Calculate metrics for specific date range
  const dateRangeMetrics = useMemo(() => {
    if (!dateRangeStart || !dateRangeEnd) return null;

    const rangeTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= new Date(dateRangeStart) && date <= new Date(dateRangeEnd);
    });

    const income = rangeTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = rangeTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const categorySpending = {};
    rangeTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });

    const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];

    return {
      income,
      expenses,
      net: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      topCategory: topCategory ? topCategory[0] : "N/A",
      topCategoryAmount: topCategory ? topCategory[1] : 0,
      transactionCount: rangeTransactions.length,
    };
  }, [transactions, dateRangeStart, dateRangeEnd]);

  // Overall metrics
  const overallMetrics = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate averages (assuming data spans multiple months)
    const months = new Set(
      transactions.map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    ).size;

    const avgMonthlyIncome = months > 0 ? totalIncome / months : 0;
    const avgMonthlyExpenses = months > 0 ? totalExpenses / months : 0;

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      avgMonthlyIncome,
      avgMonthlyExpenses,
    };
  }, [transactions]);

  const containerStyle = {
    marginTop: "20px",
  };

  const tabsStyle = {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  };

  const tabStyle = (isActive) => ({
    padding: "12px 24px",
    backgroundColor: isActive ? "#4CAF50" : "white",
    color: isActive ? "white" : "#333",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  });

  const cardStyle = {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  };

  const metricCardStyle = {
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
  };

  const chartContainerStyle = {
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    marginBottom: "15px",
  };

  const barStyle = (width, color) => ({
    height: "30px",
    width: `${width}%`,
    backgroundColor: color,
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
    paddingLeft: "10px",
    color: "white",
    fontWeight: "bold",
    fontSize: "14px",
  });

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "10px" }}>Analytics & Insights</h2>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={tabStyle(selectedView === "visualizations")}
          onClick={() => setSelectedView("visualizations")}
        >
          📊 Visualizations
        </button>
        <button
          style={tabStyle(selectedView === "metrics")}
          onClick={() => setSelectedView("metrics")}
        >
          📈 Insights & Metrics
        </button>
        <button
          style={tabStyle(selectedView === "daterange")}
          onClick={() => setSelectedView("daterange")}
        >
          📅 Date Range Analysis
        </button>
      </div>

      {/* Visualizations View */}
      {selectedView === "visualizations" && (
        <>
          {/* Monthly Trends */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Monthly Income vs Expenses</h3>
            {monthlyTrends.length === 0 ? (
              <p style={{ color: "#999" }}>No data available</p>
            ) : (
              monthlyTrends.map(([month, data]) => {
                const maxAmount = Math.max(data.income, data.expenses, 1);
                return (
                  <div key={month} style={{ marginBottom: "20px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>{month}</div>
                    <div style={{ marginBottom: "5px" }}>
                      <div style={{ fontSize: "12px", color: "#4CAF50", marginBottom: "3px" }}>
                        Income: {formatCurrency(data.income)}
                      </div>
                      <div style={barStyle((data.income / maxAmount) * 100, "#4CAF50")}>
                        {formatCurrency(data.income)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ff4444", marginBottom: "3px" }}>
                        Expenses: {formatCurrency(data.expenses)}
                      </div>
                      <div style={barStyle((data.expenses / maxAmount) * 100, "#ff4444")}>
                        {formatCurrency(data.expenses)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spending by Category */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Top 10 Categories by Spending</h3>
            {spendingByCategory.length === 0 ? (
              <p style={{ color: "#999" }}>No expenses recorded</p>
            ) : (
              spendingByCategory.map(([category, amount]) => {
                const maxAmount = spendingByCategory[0][1];
                return (
                  <div key={category} style={{ marginBottom: "15px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "5px",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>{category}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                    <div
                      style={{
                        height: "20px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(amount / maxAmount) * 100}%`,
                          backgroundColor: "#ff4444",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spending by Store */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Top 10 Stores by Spending</h3>
            {spendingByStore.length === 0 ? (
              <p style={{ color: "#999" }}>No store data available</p>
            ) : (
              spendingByStore.map(([store, amount]) => {
                const maxAmount = spendingByStore[0][1];
                return (
                  <div key={store} style={{ marginBottom: "15px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "5px",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>{store}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                    <div
                      style={{
                        height: "20px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(amount / maxAmount) * 100}%`,
                          backgroundColor: "#2196F3",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Metrics View */}
      {selectedView === "metrics" && (
        <>
          {/* Overall Summary */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Overall Summary</h3>
            <div style={gridStyle}>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Total Income
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overallMetrics.totalIncome)}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Total Expenses
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overallMetrics.totalExpenses)}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Net Balance
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: overallMetrics.netBalance >= 0 ? "#4CAF50" : "#ff4444",
                  }}
                >
                  {formatCurrency(overallMetrics.netBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Average Monthly Metrics</h3>
            <div style={gridStyle}>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Avg Monthly Income
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overallMetrics.avgMonthlyIncome)}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Avg Monthly Expenses
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overallMetrics.avgMonthlyExpenses)}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Avg Monthly Savings
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color:
                      overallMetrics.avgMonthlyIncome - overallMetrics.avgMonthlyExpenses >= 0
                        ? "#4CAF50"
                        : "#ff4444",
                  }}
                >
                  {formatCurrency(overallMetrics.avgMonthlyIncome - overallMetrics.avgMonthlyExpenses)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Top Spending Categories</h3>
            {spendingByCategory.slice(0, 5).map(([category, amount], index) => (
              <div
                key={category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "15px",
                  backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                  borderRadius: "5px",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontWeight: "bold" }}>
                  {index + 1}. {category}
                </span>
                <span style={{ color: "#ff4444", fontWeight: "bold" }}>
                  {formatCurrency(amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Date Range Analysis */}
      {selectedView === "daterange" && (
        <>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Custom Date Range Analysis</h3>
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                />
              </div>
            </div>

            {dateRangeMetrics ? (
              <>
                <div style={gridStyle}>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Total Income
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4CAF50" }}>
                      {formatCurrency(dateRangeMetrics.income)}
                    </div>
                  </div>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Total Expenses
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ff4444" }}>
                      {formatCurrency(dateRangeMetrics.expenses)}
                    </div>
                  </div>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Net Savings
                    </div>
                    <div
                      style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: dateRangeMetrics.net >= 0 ? "#4CAF50" : "#ff4444",
                      }}
                    >
                      {formatCurrency(dateRangeMetrics.net)}
                    </div>
                  </div>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Savings Rate
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2196F3" }}>
                      {dateRangeMetrics.savingsRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Top Category
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
                      {dateRangeMetrics.topCategory}
                    </div>
                    <div style={{ fontSize: "14px", color: "#999", marginTop: "5px" }}>
                      {formatCurrency(dateRangeMetrics.topCategoryAmount)}
                    </div>
                  </div>
                  <div style={metricCardStyle}>
                    <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                      Transactions
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }}>
                      {dateRangeMetrics.transactionCount}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ textAlign: "center", color: "#999", padding: "40px" }}>
                Please select a date range to view analytics
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;