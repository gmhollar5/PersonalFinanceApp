import React, { useMemo } from "react";

function AccountTracker({ user, transactions }) {
  // Calculate overall account metrics
  const accountMetrics = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalIncome - totalExpenses;

    // Get this month's data
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(
      (t) => new Date(t.date) >= thisMonthStart
    );
    const thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpenses = thisMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Get last month's data
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });
    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate percentage change
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

  // Get recent transactions
  const recentTransactions = useMemo(() => {
    return transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [transactions]);

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  const containerStyle = {
    marginTop: "20px",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const balanceCardStyle = {
    ...cardStyle,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    textAlign: "center",
    padding: "40px",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "20px",
  };

  const metricCardStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textAlign: "center",
  };

  const twoColumnGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  };

  const transactionItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "#f9f9f9",
    borderRadius: "5px",
    marginBottom: "8px",
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#1a1a2e", marginBottom: "20px" }}>Account Overview</h2>

      {/* Balance Card */}
      <div style={balanceCardStyle}>
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
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>Income</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4CAF50" }}>
              {formatCurrency(accountMetrics.thisMonthIncome)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>Expenses</div>
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
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>Balance</div>
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

      {/* Two column layout */}
      <div style={twoColumnGridStyle}>
        {/* Recent Transactions */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
            Recent Transactions
          </h3>
          {recentTransactions.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center" }}>No transactions yet</p>
          ) : (
            recentTransactions.map((t) => (
              <div key={t.id} style={transactionItemStyle}>
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
                    {t.category}
                    {t.store && <span style={{ color: "#999" }}> • {t.store}</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    {new Date(t.date).toLocaleDateString()}
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
            ))
          )}
        </div>

        {/* Top Categories */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
            Top Spending Categories
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center" }}>No expenses yet</p>
          ) : (
            categoryBreakdown.map(([category, amount], index) => {
              const maxAmount = categoryBreakdown[0][1];
              const percentage = (amount / maxAmount) * 100;
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
                        width: `${percentage}%`,
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
      </div>

      {/* Account Summary Stats */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>Quick Stats</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "15px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
              Avg Transaction
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
              {formatCurrency(
                accountMetrics.transactionCount > 0
                  ? (accountMetrics.totalIncome + accountMetrics.totalExpenses) /
                      accountMetrics.transactionCount
                  : 0
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
              Largest Expense
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4444" }}>
              {formatCurrency(
                Math.max(
                  ...transactions.filter((t) => t.type === "expense").map((t) => t.amount),
                  0
                )
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
              Largest Income
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
              {formatCurrency(
                Math.max(...transactions.filter((t) => t.type === "income").map((t) => t.amount), 0)
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "5px" }}>
              Expense Ratio
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>
              {accountMetrics.totalIncome > 0
                ? ((accountMetrics.totalExpenses / accountMetrics.totalIncome) * 100).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountTracker;