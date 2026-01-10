import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Navigation from "./components/Navigation";
import AddTransaction from "./pages/AddTransaction";
import ViewTransactions from "./pages/ViewTransactions";
import Analytics from "./pages/Analytics";
import AccountTracker from "./pages/AccountTracker";

function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Fetch transactions for the logged-in user
  const fetchTransactions = async () => {
    if (!user || !user.id) {
      console.log("No user or user.id, skipping fetch");
      return;
    }
    
    setIsLoadingTransactions(true);
    try {
      console.log(`Fetching transactions for user ${user.id}...`);
      const res = await fetch(`/transactions/user/${user.id}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch transactions: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`Received ${data.length} transactions from API`);
      
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Refresh transactions when user changes
  useEffect(() => {
    if (user && user.id) {
      console.log("User logged in, fetching transactions...");
      fetchTransactions();
    } else {
      console.log("No user, clearing transactions");
      setTransactions([]);
    }
  }, [user]);

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setTransactions([]);
  };

  return (
    <Router>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        {!user ? (
          <Login setUser={setUser} />
        ) : (
          <>
            <Navigation user={user} onLogout={handleLogout} />
            <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
              {isLoadingTransactions && (
                <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                  Loading transactions...
                </div>
              )}
              <Routes>
                <Route path="/" element={<Navigate to="/add-transaction" />} />
                <Route
                  path="/add-transaction"
                  element={
                    <AddTransaction
                      user={user}
                      transactions={transactions}
                      fetchTransactions={fetchTransactions}
                    />
                  }
                />
                <Route
                  path="/view-transactions"
                  element={
                    <ViewTransactions
                      transactions={transactions}
                      fetchTransactions={fetchTransactions}
                    />
                  }
                />
                <Route
                  path="/analytics"
                  element={<Analytics transactions={transactions} user={user} />}
                />
                <Route
                  path="/account-tracker"
                  element={<AccountTracker user={user} transactions={transactions} />}
                />
              </Routes>
            </div>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;