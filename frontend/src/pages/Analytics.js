import React, { useState, useMemo } from "react";

// Simple Line Chart Component
function LineChart({ data, width = 600, height = 300, color = "#4CAF50" }) {
  if (data.length === 0) return <p style={{ color: "#999" }}>No data available</p>;

  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Find min and max values
  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  // Create points for the line
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Create path
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg width={width} height={height} style={{ backgroundColor: "#fafafa", borderRadius: "8px" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding + chartHeight * (1 - ratio);
        return (
          <g key={ratio}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
            <text x={padding - 10} y={y + 5} fontSize="12" fill="#999" textAnchor="end">
              ${((minValue + valueRange * ratio) / 1).toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="3" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} />
          <text
            x={p.x}
            y={height - padding + 20}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Analytics({ transactions, user }) {
  const [selectedView, setSelectedView] = useState("overview");
  const [trendView, setTrendView] = useState("monthly"); // "weekly" or "monthly"
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  // Overall metrics (from old AccountTracker)
  const accountMetrics = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalIncome - totalExpenses;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(
      (t) => new Date(t.transaction_date) >= thisMonthStart
    );
    const thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpenses = thisMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.transaction_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });
    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseChange =
      lastMonthExpenses > 0
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

    return {
      currentBalance,
      totalIncome,
      totalExpenses,
      thisMonthIncome,
      thisMonthExpenses,
      thisMonthBalance: thisMonthIncome - thisMonthExpenses,
      expenseChange,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      .slice(0, 5);
  }, [transactions]);

  // Spending by category
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

  // Spending by store
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

  // Weekly trends for line chart
  const weeklyTrends = useMemo(() => {
    const weeklyData = {};
    transactions.forEach((t) => {
      const date = new Date(t.transaction_date);
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

  // Monthly trends for line chart
  const monthlyTrends = useMemo(() => {
    const monthlyData = {};
    transactions.forEach((t) => {
      const date = new Date(t.transaction_date);
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

  // Date range metrics - FIXED
  const dateRangeMetrics = useMemo(() => {
    if (!dateRangeStart || !dateRangeEnd) return null;

    const rangeTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transaction_date);
      const start = new Date(dateRangeStart);
      const end = new Date(dateRangeEnd);
      
      // Set all times to midnight for accurate comparison
      transactionDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return transactionDate >= start && transactionDate <= end;
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

  const containerStyle = { marginTop: "20px" };
  const tabsStyle = { display: "flex", gap: "10px", marginBottom: "20px" };
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
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" };
  const metricCardStyle = {
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
  };

  // Prepare data for line charts
  const incomeLineData = (trendView === "weekly" ? weeklyTrends : monthlyTrends).map(
    ([key, data]) => ({
      label: trendView === "weekly" ? key.slice(5) : key.slice(5, 7),
      value: data.income,
    })
  );

  const expensesLineData = (trendView === "weekly" ? weeklyTrends : monthlyTrends).map(
    ([key, data]) => ({
      label: trendView === "weekly" ? key.slice(5) : key.slice(5, 7),
      value: data.expenses,
    })
  );

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "10px" }}>Analytics & Insights</h2>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={tabStyle(selectedView === "overview")}
          onClick={() => setSelectedView("overview")}
        >
          📊 Overview
        </button>
        <button
          style={tabStyle(selectedView === "trends")}
          onClick={() => setSelectedView("trends")}
        >
          📈 Trends
        </button>
        <button
          style={tabStyle(selectedView === "breakdown")}
          onClick={() => setSelectedView("breakdown")}
        >
          🎯 Breakdown
        </button>
        <button
          style={tabStyle(selectedView === "daterange")}
          onClick={() => setSelectedView("daterange")}
        >
          📅 Date Range
        </button>
      </div>

      {/* Overview (consolidated from AccountTracker) */}
      {selectedView === "overview" && (
        <>
          {/* Balance Card */}
          <div
            style={{
              ...cardStyle,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              textAlign: "center",
              padding: "40px",
            }}
          >
            <div style={{ fontSize: "16px", marginBottom: "10px", opacity: 0.9 }}>
              Current Balance
            </div>
            <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "10px" }}>
              {formatCurrency(accountMetrics.currentBalance)}
            </div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>
              Total of {accountMetrics.transactionCount} transactions
            </div>
          </div>

          {/* Key Metrics */}
          <div style={gridStyle}>
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                Total Income
              </div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>
                {formatCurrency(accountMetrics.totalIncome)}
              </div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                Total Expenses
              </div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff4444" }}>
                {formatCurrency(accountMetrics.totalExpenses)}
              </div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                Savings Rate
              </div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196F3" }}>
                {accountMetrics.totalIncome > 0
                  ? (
                      ((accountMetrics.totalIncome - accountMetrics.totalExpenses) /
                        accountMetrics.totalIncome) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>

          {/* This Month */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333", marginBottom: "20px" }}>This Month</h3>
            <div style={gridStyle}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Income
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(accountMetrics.thisMonthIncome)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Expenses
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(accountMetrics.thisMonthExpenses)}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: accountMetrics.expenseChange > 0 ? "#ff4444" : "#4CAF50",
                    marginTop: "5px",
                  }}
                >
                  {accountMetrics.expenseChange > 0 ? "↑" : "↓"}{" "}
                  {Math.abs(accountMetrics.expenseChange).toFixed(1)}% vs last month
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                  Balance
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: accountMetrics.thisMonthBalance >= 0 ? "#4CAF50" : "#ff4444",
                  }}
                >
                  {formatCurrency(accountMetrics.thisMonthBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Recent & Top Categories */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Recent Transactions
              </h3>
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "5px",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
                      {t.category}
                      {t.store && <span style={{ color: "#999" }}> • {t.store}</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {new Date(t.transaction_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "18px",
                      color: t.type === "income" ? "#4CAF50" : "#ff4444",
                    }}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Top Spending Categories
              </h3>
              {spendingByCategory.slice(0, 5).map(([category, amount], index) => {
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
                      <span style={{ fontWeight: "bold" }}>
                        {index + 1}. {category}
                      </span>
                      <span style={{ color: "#ff4444", fontWeight: "bold" }}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(amount / maxAmount) * 100}%`,
                          backgroundColor: "#ff4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Trends with Line Graphs */}
      {selectedView === "trends" && (
        <>
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#333" }}>Income & Expense Trends</h3>
              <div>
                <button
                  onClick={() => setTrendView("weekly")}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: trendView === "weekly" ? "#4CAF50" : "#e0e0e0",
                    color: trendView === "weekly" ? "white" : "#333",
                    border: "none",
                    borderRadius: "5px 0 0 5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTrendView("monthly")}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: trendView === "monthly" ? "#4CAF50" : "#e0e0e0",
                    color: trendView === "monthly" ? "white" : "#333",
                    border: "none",
                    borderRadius: "0 5px 5px 0",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h4 style={{ color: "#4CAF50", marginBottom: "15px" }}>Income Trend</h4>
              <LineChart data={incomeLineData} color="#4CAF50" />
            </div>

            <div>
              <h4 style={{ color: "#ff4444", marginBottom: "15px" }}>Expense Trend</h4>
              <LineChart data={expensesLineData} color="#ff4444" />
            </div>
          </div>
        </>
      )}

      {/* Breakdown */}
      {selectedView === "breakdown" && (
        <>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "#333" }}>Top 10 Categories by Spending</h3>
            {spendingByCategory.map(([category, amount]) => {
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
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

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

      {/* Date Range Analysis - FIXED */}
      {selectedView === "daterange" && (
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
          ) : (
            <p style={{ textAlign: "center", color: "#999", padding: "40px" }}>
              Please select a date range to view analytics
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Analytics;