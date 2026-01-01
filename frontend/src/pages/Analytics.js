import React, { useState, useMemo } from "react";

// Simple Line Chart Component with multi-year support
function LineChart({ data, width = 900, height = 350, colors = ["#4CAF50"], labels = [] }) {
  if (data.length === 0) return <p style={{ color: "#999" }}>No data available</p>;

  const padding = 60;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Find min and max values across all datasets
  const allValues = data.flatMap(dataset => dataset.map(d => d.value));
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue || 1;

  // Month names for x-axis
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div>
      {/* Legend */}
      {labels.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
          {labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '3px', backgroundColor: colors[i] }} />
              <span style={{ fontSize: '14px', color: '#666' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
      
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

        {/* Draw lines for each dataset */}
        {data.map((dataset, datasetIndex) => {
          const points = dataset.map((d, i) => {
            const x = padding + (i / (dataset.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
            return { x, y, label: d.label, value: d.value };
          });

          const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

          return (
            <g key={datasetIndex}>
              {/* Line */}
              <path d={pathD} fill="none" stroke={colors[datasetIndex] || colors[0]} strokeWidth="3" />

              {/* Points */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill={colors[datasetIndex] || colors[0]} />
                  {/* Only show labels for first dataset to avoid overlap */}
                  {datasetIndex === 0 && (
                    <text
                      x={p.x}
                      y={height - padding + 20}
                      fontSize="11"
                      fill="#666"
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Rolling Average Visualization Component
function RollingAverageChart({ current, averages, categoryName }) {
  // Order: 12mo, 9mo, 6mo, 3mo, Current
  const periods = [
    { label: '12mo', value: averages.avg12, months: 12 },
    { label: '9mo', value: averages.avg9, months: 9 },
    { label: '6mo', value: averages.avg6, months: 6 },
    { label: '3mo', value: averages.avg3, months: 3 },
    { label: 'Current', value: current, isCurrent: true }
  ];
  
  const allValues = periods.map(p => p.value);
  const maxValue = Math.max(...allValues, 1);
  
  return (
    <div style={{ 
      marginBottom: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: 'white'
    }}>
      <h4 style={{ 
        fontSize: '14px', 
        color: '#333', 
        marginBottom: '15px',
        marginTop: 0,
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {categoryName}
      </h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '120px' }}>
        {periods.map((period, idx) => {
          if (period.isCurrent) {
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${(period.value / maxValue) * 100}px`,
                  backgroundColor: '#4CAF50',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '20px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '5px'
                }}>
                  <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                    ${period.value.toFixed(0)}
                  </span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                  {period.label}
                </div>
                <div style={{ height: '14px' }}></div> {/* Spacer to align with percentage labels */}
              </div>
            );
          }
          
          // For averages: orange if current > avg (spending more), blue if current < avg (spending less)
          const percentDiff = period.value > 0 ? ((current - period.value) / period.value) * 100 : 0;
          const isHigher = current > period.value;
          
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                height: `${(period.value / maxValue) * 100}px`,
                backgroundColor: isHigher ? '#ff9800' : '#2196F3',
                borderRadius: '4px 4px 0 0',
                minHeight: '20px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '5px'
              }}>
                <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                  ${period.value.toFixed(0)}
                </span>
              </div>
              <div style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center' }}>
                {period.label}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: isHigher ? '#ff9800' : '#2196F3',
                fontWeight: 'bold'
              }}>
                {isHigher ? '↑' : '↓'}{Math.abs(percentDiff).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Analytics({ transactions, user }) {
  const [selectedView, setSelectedView] = useState("overview");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  
  // Insights tab states
  const [insightsMetric, setInsightsMetric] = useState("amount"); // "amount" or "percent"
  const [insightsComparison, setInsightsComparison] = useState("mom"); // "mom" or "yoy"
  
  // Trends tab states
  const [trendsFilter, setTrendsFilter] = useState("all"); // "all", "category:X"

  // Utility: Format currency with commas and 2 decimals
  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get current month context (most recently completed month)
  const getCurrentMonthContext = () => {
    const now = new Date();
    // Get the most recently completed month
    const currentMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    return {
      currentMonth,
      lastMonth,
      currentMonthName: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      lastMonthName: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  };

  const monthContext = getCurrentMonthContext();

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    
    const thisYearStart = new Date(currentYear, 0, 1);
    const lastYearStart = new Date(lastYear, 0, 1);
    const lastYearEnd = new Date(lastYear, 11, 31);
    
    // Current month (most recently completed)
    const currentMonthStart = new Date(monthContext.currentMonth.getFullYear(), monthContext.currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(monthContext.currentMonth.getFullYear(), monthContext.currentMonth.getMonth() + 1, 0);
    
    // Last month
    const lastMonthStart = new Date(monthContext.lastMonth.getFullYear(), monthContext.lastMonth.getMonth(), 1);
    const lastMonthEnd = new Date(monthContext.lastMonth.getFullYear(), monthContext.lastMonth.getMonth() + 1, 0);
    
    const filterByDateRange = (t, start, end) => {
      const date = new Date(t.transaction_date);
      return date >= start && date <= end;
    };
    
    // Current month metrics
    const currentMonthTrans = transactions.filter(t => filterByDateRange(t, currentMonthStart, currentMonthEnd));
    const currentMonthIncome = currentMonthTrans.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const currentMonthExpenses = currentMonthTrans.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const currentMonthSavingsRate = currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100 : 0;
    
    // Last month metrics
    const lastMonthTrans = transactions.filter(t => filterByDateRange(t, lastMonthStart, lastMonthEnd));
    const lastMonthIncome = lastMonthTrans.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const lastMonthExpenses = lastMonthTrans.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const lastMonthSavingsRate = lastMonthIncome > 0 ? ((lastMonthIncome - lastMonthExpenses) / lastMonthIncome) * 100 : 0;
    
    // This year metrics
    const thisYearTrans = transactions.filter(t => new Date(t.transaction_date) >= thisYearStart);
    const thisYearIncome = thisYearTrans.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const thisYearExpenses = thisYearTrans.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const thisYearSavingsRate = thisYearIncome > 0 ? ((thisYearIncome - thisYearExpenses) / thisYearIncome) * 100 : 0;
    
    // Last year metrics
    const lastYearTrans = transactions.filter(t => filterByDateRange(t, lastYearStart, lastYearEnd));
    const lastYearIncome = lastYearTrans.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const lastYearExpenses = lastYearTrans.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const lastYearSavingsRate = lastYearIncome > 0 ? ((lastYearIncome - lastYearExpenses) / lastYearIncome) * 100 : 0;
    
    return {
      currentMonth: { income: currentMonthIncome, expenses: currentMonthExpenses, savingsRate: currentMonthSavingsRate },
      lastMonth: { income: lastMonthIncome, expenses: lastMonthExpenses, savingsRate: lastMonthSavingsRate },
      thisYear: { income: thisYearIncome, expenses: thisYearExpenses, savingsRate: thisYearSavingsRate },
      lastYear: { income: lastYearIncome, expenses: lastYearExpenses, savingsRate: lastYearSavingsRate },
      currentYear,
      previousYear: lastYear
    };
  }, [transactions, monthContext]);

  // Top spending categories and stores for both years
  const topSpending = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    
    const thisYearStart = new Date(currentYear, 0, 1);
    const lastYearStart = new Date(lastYear, 0, 1);
    const lastYearEnd = new Date(lastYear, 11, 31);
    
    // This Year
    const thisYearTransactions = transactions.filter(t => 
      t.type === "expense" && new Date(t.transaction_date) >= thisYearStart
    );
    
    const thisYearCategoryTotals = {};
    thisYearTransactions.forEach(t => {
      thisYearCategoryTotals[t.category] = (thisYearCategoryTotals[t.category] || 0) + t.amount;
    });
    const thisYearTopCategories = Object.entries(thisYearCategoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const thisYearStoreTotals = {};
    thisYearTransactions.filter(t => t.store).forEach(t => {
      thisYearStoreTotals[t.store] = (thisYearStoreTotals[t.store] || 0) + t.amount;
    });
    const thisYearTopStores = Object.entries(thisYearStoreTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Last Year
    const lastYearTransactions = transactions.filter(t => 
      t.type === "expense" && 
      new Date(t.transaction_date) >= lastYearStart && 
      new Date(t.transaction_date) <= lastYearEnd
    );
    
    const lastYearCategoryTotals = {};
    lastYearTransactions.forEach(t => {
      lastYearCategoryTotals[t.category] = (lastYearCategoryTotals[t.category] || 0) + t.amount;
    });
    const lastYearTopCategories = Object.entries(lastYearCategoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const lastYearStoreTotals = {};
    lastYearTransactions.filter(t => t.store).forEach(t => {
      lastYearStoreTotals[t.store] = (lastYearStoreTotals[t.store] || 0) + t.amount;
    });
    const lastYearTopStores = Object.entries(lastYearStoreTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return { 
      thisYearTopCategories, 
      thisYearTopStores,
      lastYearTopCategories,
      lastYearTopStores,
      currentYear,
      lastYear
    };
  }, [transactions]);

  // Trends data: This Year (TY) vs Last Year (LY) monthly - for expenses, income, and savings rate
  const trendsData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    
    // Filter transactions based on selection (for expenses only)
    let filteredExpenseTransactions = transactions.filter(t => t.type === "expense");
    
    if (trendsFilter.startsWith("category:")) {
      const category = trendsFilter.split(":")[1];
      filteredExpenseTransactions = filteredExpenseTransactions.filter(t => t.category === category);
    }
    
    // All income transactions (no filter)
    const incomeTransactions = transactions.filter(t => t.type === "income");
    
    // Build monthly data for expenses
    const thisYearExpenseData = {};
    const lastYearExpenseData = {};
    
    // Build monthly data for income
    const thisYearIncomeData = {};
    const lastYearIncomeData = {};
    
    // Initialize all months
    for (let month = 0; month < 12; month++) {
      thisYearExpenseData[month] = 0;
      lastYearExpenseData[month] = 0;
      thisYearIncomeData[month] = 0;
      lastYearIncomeData[month] = 0;
    }
    
    // Populate expense data
    filteredExpenseTransactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (year === currentYear) {
        thisYearExpenseData[month] += t.amount;
      } else if (year === lastYear) {
        lastYearExpenseData[month] += t.amount;
      }
    });
    
    // Populate income data
    incomeTransactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (year === currentYear) {
        thisYearIncomeData[month] += t.amount;
      } else if (year === lastYear) {
        lastYearIncomeData[month] += t.amount;
      }
    });
    
    // Convert to array format for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const thisYearExpenseArray = monthNames.map((name, i) => ({
      label: name,
      value: thisYearExpenseData[i]
    }));
    
    const lastYearExpenseArray = monthNames.map((name, i) => ({
      label: name,
      value: lastYearExpenseData[i]
    }));
    
    const thisYearIncomeArray = monthNames.map((name, i) => ({
      label: name,
      value: thisYearIncomeData[i]
    }));
    
    const lastYearIncomeArray = monthNames.map((name, i) => ({
      label: name,
      value: lastYearIncomeData[i]
    }));
    
    // Calculate savings rate for each month
    const thisYearSavingsArray = monthNames.map((name, i) => {
      const income = thisYearIncomeData[i];
      const expense = thisYearExpenseData[i];
      const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
      return { label: name, value: rate };
    });
    
    const lastYearSavingsArray = monthNames.map((name, i) => {
      const income = lastYearIncomeData[i];
      const expense = lastYearExpenseData[i];
      const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
      return { label: name, value: rate };
    });
    
    return {
      expense: {
        thisYear: thisYearExpenseArray,
        lastYear: lastYearExpenseArray
      },
      income: {
        thisYear: thisYearIncomeArray,
        lastYear: lastYearIncomeArray
      },
      savingsRate: {
        thisYear: thisYearSavingsArray,
        lastYear: lastYearSavingsArray
      },
      currentYear,
      previousYear: lastYear
    };
  }, [transactions, trendsFilter]);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    return [...new Set(transactions.filter(t => t.type === "expense").map(t => t.category))].sort();
  }, [transactions]);

  // Get available months for insights (sorted left to right, oldest to newest)
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort(); // Ascending order (oldest first)
  }, [transactions]);

  // Get last two months for automatic insights
  const lastTwoMonths = useMemo(() => {
    if (availableMonths.length < 2) return null;
    const sorted = [...availableMonths].sort().reverse(); // Most recent first for this calculation
    return {
      month1: sorted[0], // Most recent
      month2: sorted[1]  // Second most recent
    };
  }, [availableMonths]);

  // Calculate automatic insights for last 2 months
  const automaticInsights = useMemo(() => {
    if (!lastTwoMonths) return null;
    
    const getMonthData = (monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      const monthTrans = transactions.filter(t => {
        const date = new Date(t.transaction_date);
        return date >= monthStart && date <= monthEnd && t.type === "expense";
      });
      
      const categoryTotals = {};
      monthTrans.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
      
      return categoryTotals;
    };
    
    const month1Data = getMonthData(lastTwoMonths.month1);
    const month2Data = getMonthData(lastTwoMonths.month2);
    
    // Get year-ago data for both months
    const [y1, m1] = lastTwoMonths.month1.split('-').map(Number);
    const [y2, m2] = lastTwoMonths.month2.split('-').map(Number);
    const yearAgo1Key = `${y1 - 1}-${String(m1).padStart(2, '0')}`;
    const yearAgo2Key = `${y2 - 1}-${String(m2).padStart(2, '0')}`;
    const yearAgo1Data = getMonthData(yearAgo1Key);
    const yearAgo2Data = getMonthData(yearAgo2Key);
    
    // Calculate changes for most recent month
    const allCategories1 = new Set([...Object.keys(month1Data), ...Object.keys(month2Data), ...Object.keys(yearAgo1Data)]);
    const changes1 = [];
    
    allCategories1.forEach(cat => {
      const current = month1Data[cat] || 0;
      const previousMonth = month2Data[cat] || 0;
      const previousYear = yearAgo1Data[cat] || 0;
      
      const momChange = current - previousMonth;
      const momPercent = previousMonth > 0 ? (momChange / previousMonth) * 100 : (current > 0 ? 100 : 0);
      const yoyChange = current - previousYear;
      const yoyPercent = previousYear > 0 ? (yoyChange / previousYear) * 100 : (current > 0 ? 100 : 0);
      
      if (current > 0 || previousMonth > 0 || previousYear > 0) {
        changes1.push({
          category: cat,
          current,
          previousMonth,
          previousYear,
          momChange,
          momPercent,
          yoyChange,
          yoyPercent
        });
      }
    });
    
    const month1Date = new Date(parseInt(y1), parseInt(m1) - 1);
    const month2Date = new Date(parseInt(y2), parseInt(m2) - 1);
    
    return {
      month1Key: lastTwoMonths.month1,
      month2Key: lastTwoMonths.month2,
      month1Name: month1Date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      month2Name: month2Date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      month1ShortName: month1Date.toLocaleDateString('en-US', { month: 'short' }),
      month2ShortName: month2Date.toLocaleDateString('en-US', { month: 'short' }),
      changes1
    };
  }, [transactions, lastTwoMonths, availableMonths]);

  // Calculate rolling averages with visualization data
  const rollingAveragesData = useMemo(() => {
    if (!lastTwoMonths) return null;
    
    const [year, month] = lastTwoMonths.month1.split('-').map(Number);
    const endDate = new Date(year, month - 1, 1);
    
    const calculateAverage = (months) => {
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - months);
      
      const trans = transactions.filter(t => {
        const date = new Date(t.transaction_date);
        return date >= startDate && date < endDate && t.type === "expense";
      });
      
      const totals = {};
      const counts = {};
      
      trans.forEach(t => {
        const key = t.category || "Unknown";
        const monthKey = `${new Date(t.transaction_date).getFullYear()}-${new Date(t.transaction_date).getMonth()}`;
        
        if (!totals[key]) {
          totals[key] = {};
          counts[key] = new Set();
        }
        
        totals[key][monthKey] = (totals[key][monthKey] || 0) + t.amount;
        counts[key].add(monthKey);
      });
      
      const averages = {};
      Object.keys(totals).forEach(key => {
        const sum = Object.values(totals[key]).reduce((a, b) => a + b, 0);
        const count = counts[key].size || 1;
        averages[key] = sum / count;
      });
      
      return averages;
    };
    
    const avg3 = calculateAverage(3);
    const avg6 = calculateAverage(6);
    const avg9 = calculateAverage(9);
    const avg12 = calculateAverage(12);
    
    // Get current month data
    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0);
    const currentTrans = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date >= currentMonthStart && date <= currentMonthEnd && t.type === "expense";
    });
    
    const currentTotals = {};
    currentTrans.forEach(t => {
      const key = t.category || "Unknown";
      currentTotals[key] = (currentTotals[key] || 0) + t.amount;
    });
    
    // Combine data for visualization
    const allCategories = new Set([
      ...Object.keys(currentTotals),
      ...Object.keys(avg3),
      ...Object.keys(avg6),
      ...Object.keys(avg9),
      ...Object.keys(avg12)
    ]);
    
    const visualizationData = [];
    allCategories.forEach(cat => {
      const current = currentTotals[cat] || 0;
      if (current > 0) {
        visualizationData.push({
          category: cat,
          current,
          averages: {
            avg3: avg3[cat] || 0,
            avg6: avg6[cat] || 0,
            avg9: avg9[cat] || 0,
            avg12: avg12[cat] || 0
          }
        });
      }
    });
    
    // Sort by current spending
    visualizationData.sort((a, b) => b.current - a.current);
    
    return visualizationData.slice(0, 10); // Top 10 categories
  }, [transactions, lastTwoMonths]);

  // Date range metrics
  const dateRangeMetrics = useMemo(() => {
    if (!dateRangeStart || !dateRangeEnd) return null;

    const rangeTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transaction_date);
      const start = new Date(dateRangeStart);
      const end = new Date(dateRangeEnd);
      
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

  // Styles
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
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" };
  const metricCardStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    border: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

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
          style={tabStyle(selectedView === "insights")}
          onClick={() => setSelectedView("insights")}
        >
          🎯 Insights
        </button>
        <button
          style={tabStyle(selectedView === "daterange")}
          onClick={() => setSelectedView("daterange")}
        >
          📅 Date Range
        </button>
      </div>

      {/* Overview Tab */}
      {selectedView === "overview" && (
        <>
          {/* Header for metrics section */}
          <h3 style={{ color: "#333", marginBottom: "15px", marginTop: "20px" }}>Monthly & Annual Summary</h3>
          
          {/* Metrics Grid - Reordered: Nov, Dec, 2025, 2026 */}
          <div style={gridStyle}>
            {/* Last Month (Nov) */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                {monthContext.lastMonthName}
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Income</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overviewMetrics.lastMonth.income)}
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Expenses</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overviewMetrics.lastMonth.expenses)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Savings Rate</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>
                  {overviewMetrics.lastMonth.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Current Month (Dec) */}
            <div style={{...metricCardStyle, backgroundColor: "#e8f5e9"}}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                {monthContext.currentMonthName}
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Income</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overviewMetrics.currentMonth.income)}
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Expenses</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overviewMetrics.currentMonth.expenses)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Savings Rate</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>
                  {overviewMetrics.currentMonth.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Last Year Total (2025) */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                {overviewMetrics.previousYear} Year Total
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Income</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overviewMetrics.lastYear.income)}
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Expenses</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overviewMetrics.lastYear.expenses)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Savings Rate</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>
                  {overviewMetrics.lastYear.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* This Year Total (2026) */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "10px" }}>
                {overviewMetrics.currentYear} Year Total
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Income</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
                  {formatCurrency(overviewMetrics.thisYear.income)}
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Expenses</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4444" }}>
                  {formatCurrency(overviewMetrics.thisYear.expenses)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Savings Rate</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2196F3" }}>
                  {overviewMetrics.thisYear.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Header for top spending section */}
          <h3 style={{ color: "#333", marginBottom: "15px", marginTop: "30px" }}>Top Spending Breakdown</h3>
          
          {/* Top Spending Section - Reordered: 2025 left, 2026 right */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Top Categories Row */}
            {/* 2025 - Top Categories */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Top Spending Categories ({topSpending.lastYear})
              </h3>
              {topSpending.lastYearTopCategories.length === 0 ? (
                <p style={{ color: "#999" }}>No expense data available</p>
              ) : (
                topSpending.lastYearTopCategories.map(([category, amount], index) => {
                  const maxAmount = topSpending.lastYearTopCategories[0][1];
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
                            backgroundColor: "#999",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2026 - Top Categories */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Top Spending Categories ({topSpending.currentYear})
              </h3>
              {topSpending.thisYearTopCategories.length === 0 ? (
                <p style={{ color: "#999" }}>No expense data available</p>
              ) : (
                topSpending.thisYearTopCategories.map(([category, amount], index) => {
                  const maxAmount = topSpending.thisYearTopCategories[0][1];
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
                })
              )}
            </div>

            {/* Top Stores Row */}
            {/* 2025 - Top Stores */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Top Spending Stores ({topSpending.lastYear})
              </h3>
              {topSpending.lastYearTopStores.length === 0 ? (
                <p style={{ color: "#999" }}>No store data available</p>
              ) : (
                topSpending.lastYearTopStores.map(([store, amount], index) => {
                  const maxAmount = topSpending.lastYearTopStores[0][1];
                  return (
                    <div key={store} style={{ marginBottom: "15px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>
                          {index + 1}. {store}
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
                            backgroundColor: "#999",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2026 - Top Stores */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "15px" }}>
                Top Spending Stores ({topSpending.currentYear})
              </h3>
              {topSpending.thisYearTopStores.length === 0 ? (
                <p style={{ color: "#999" }}>No store data available</p>
              ) : (
                topSpending.thisYearTopStores.map(([store, amount], index) => {
                  const maxAmount = topSpending.thisYearTopStores[0][1];
                  return (
                    <div key={store} style={{ marginBottom: "15px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>
                          {index + 1}. {store}
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
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Trends Tab */}
      {selectedView === "trends" && (
        <>
          {/* Expenses Chart */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Expenses</h3>
            
            {/* Filter Dropdown */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ marginRight: "10px", fontWeight: "bold" }}>Filter:</label>
              <select
                value={trendsFilter}
                onChange={(e) => setTrendsFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  minWidth: "200px"
                }}
              >
                <option value="all">All Expenses</option>
                <optgroup label="Categories">
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={`category:${cat}`}>{cat}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            {/* Chart with contrasting colors */}
            <LineChart
              data={[trendsData.expense.lastYear, trendsData.expense.thisYear]}
              colors={["#000000", "#2196F3"]}
              labels={[`${trendsData.previousYear}`, `${trendsData.currentYear}`]}
              width={900}
              height={350}
            />
          </div>

          {/* Income Chart */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Income</h3>
            
            {/* Chart with contrasting colors */}
            <LineChart
              data={[trendsData.income.lastYear, trendsData.income.thisYear]}
              colors={["#000000", "#2196F3"]}
              labels={[`${trendsData.previousYear}`, `${trendsData.currentYear}`]}
              width={900}
              height={350}
            />
          </div>

          {/* Savings Rate Chart */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Savings Rate</h3>
            
            {/* Chart with contrasting colors */}
            <LineChart
              data={[trendsData.savingsRate.lastYear, trendsData.savingsRate.thisYear]}
              colors={["#000000", "#2196F3"]}
              labels={[`${trendsData.previousYear}`, `${trendsData.currentYear}`]}
              width={900}
              height={350}
            />
          </div>
        </>
      )}

      {/* Insights Tab */}
      {selectedView === "insights" && (
        <>
          {automaticInsights && (
            <>
              {/* Filters at the top */}
              <div style={{ ...cardStyle, marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                      Metric:
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setInsightsMetric("amount")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: insightsMetric === "amount" ? "#4CAF50" : "#e0e0e0",
                          color: insightsMetric === "amount" ? "white" : "#333",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          flex: 1
                        }}
                      >
                        Dollar Amount ($)
                      </button>
                      <button
                        onClick={() => setInsightsMetric("percent")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: insightsMetric === "percent" ? "#4CAF50" : "#e0e0e0",
                          color: insightsMetric === "percent" ? "white" : "#333",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          flex: 1
                        }}
                      >
                        Percentage (%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                      Comparison:
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setInsightsComparison("mom")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: insightsComparison === "mom" ? "#4CAF50" : "#e0e0e0",
                          color: insightsComparison === "mom" ? "white" : "#333",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          flex: 1
                        }}
                      >
                        Month-over-Month
                      </button>
                      <button
                        onClick={() => setInsightsComparison("yoy")}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: insightsComparison === "yoy" ? "#4CAF50" : "#e0e0e0",
                          color: insightsComparison === "yoy" ? "white" : "#333",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          flex: 1
                        }}
                      >
                        Year-over-Year
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Largest Increases Table */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#333", marginBottom: "20px" }}>
                  Largest Spending Increases
                </h3>
                
                {(() => {
                  const sortKey = insightsComparison === "mom" ? "momChange" : "yoyChange";
                  const percentKey = insightsComparison === "mom" ? "momPercent" : "yoyPercent";
                  const compareKey = insightsMetric === "amount" ? sortKey : percentKey;
                  const prevKey = insightsComparison === "mom" ? "previousMonth" : "previousYear";
                  
                  const increases = automaticInsights.changes1
                    .filter(c => c[compareKey] > 0)
                    .sort((a, b) => b[compareKey] - a[compareKey])
                    .slice(0, 10);
                  
                  return increases.length === 0 ? (
                    <p style={{ color: "#999" }}>No increases found</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "13px" }}>Category</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>
                              {insightsComparison === "mom" ? automaticInsights.month2ShortName : `${automaticInsights.month1ShortName} ${parseInt(automaticInsights.month1Key.split('-')[0]) - 1}`}
                            </th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>
                              {automaticInsights.month1ShortName}
                            </th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>$ Change</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>% Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {increases.map((item, index) => (
                            <tr key={index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td style={{ padding: "12px", fontWeight: "500" }}>{item.category}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                {formatCurrency(item[prevKey])}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                {formatCurrency(item.current)}
                              </td>
                              <td style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#ff4444",
                                fontWeight: "500"
                              }}>
                                +{formatCurrency(item[sortKey])}
                              </td>
                              <td style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#ff4444",
                                fontWeight: "500"
                              }}>
                                +{item[percentKey].toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Largest Decreases Table */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#333", marginBottom: "20px" }}>
                  Largest Spending Decreases
                </h3>
                
                {(() => {
                  const sortKey = insightsComparison === "mom" ? "momChange" : "yoyChange";
                  const percentKey = insightsComparison === "mom" ? "momPercent" : "yoyPercent";
                  const compareKey = insightsMetric === "amount" ? sortKey : percentKey;
                  const prevKey = insightsComparison === "mom" ? "previousMonth" : "previousYear";
                  
                  const decreases = automaticInsights.changes1
                    .filter(c => c[compareKey] < 0)
                    .sort((a, b) => a[compareKey] - b[compareKey])
                    .slice(0, 10);
                  
                  return decreases.length === 0 ? (
                    <p style={{ color: "#999" }}>No decreases found</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "13px" }}>Category</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>
                              {insightsComparison === "mom" ? automaticInsights.month2ShortName : `${automaticInsights.month1ShortName} ${parseInt(automaticInsights.month1Key.split('-')[0]) - 1}`}
                            </th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>
                              {automaticInsights.month1ShortName}
                            </th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>$ Change</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "13px" }}>% Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decreases.map((item, index) => (
                            <tr key={index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td style={{ padding: "12px", fontWeight: "500" }}>{item.category}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                {formatCurrency(item[prevKey])}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                {formatCurrency(item.current)}
                              </td>
                              <td style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#4CAF50",
                                fontWeight: "500"
                              }}>
                                {formatCurrency(item[sortKey])}
                              </td>
                              <td style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#4CAF50",
                                fontWeight: "500"
                              }}>
                                {item[percentKey].toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {/* Rolling Averages Visualization */}
          {rollingAveragesData && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#333", marginBottom: "10px" }}>
                Spending Trends vs Rolling Averages
              </h3>
              <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
                Current month spending compared to 3, 6, 9, and 12-month rolling averages. 
                Orange bars indicate you're spending more than average, blue bars indicate you're spending less.
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                {rollingAveragesData.map(data => (
                  <RollingAverageChart
                    key={data.category}
                    current={data.current}
                    averages={data.averages}
                    categoryName={data.category}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Date Range Tab (unchanged) */}
      {selectedView === "daterange" && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#333", marginBottom: "20px" }}>
            Custom Date Range Analysis
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Start Date:
              </label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                End Date:
              </label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          {dateRangeMetrics ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
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