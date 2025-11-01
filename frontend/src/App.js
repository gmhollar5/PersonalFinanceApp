import React, { useState, useEffect } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Sign up (simple user creation)
  const handleSignup = async () => {
    try {
      const res = await fetch("/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
      });
      if (!res.ok) throw new Error("Error creating user");
      const data = await res.json();
      setUser(data);
      alert("User created!");
    } catch (err) {
      console.error(err);
      alert("Error creating user (email may already exist).");
    }
  };

  // Fetch transactions for the user
  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/transactions/user/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []); // ensure array
    } catch (err) {
      console.error(err);
      setTransactions([]);
    }
  };

  // Add transaction - FIXED: Added user_id to request body
  const addTransaction = async () => {
    if (!user) return alert("Please create a user first");
    try {
      const res = await fetch("/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          store,
          amount: parseFloat(amount),
          description,
          user_id: user.id,  // FIX: Added user_id to the request body
        }),
      });
      if (!res.ok) throw new Error("Error adding transaction");
      await res.json();
      alert("Transaction added!");
      fetchTransactions();
      setCategory("");
      setAmount("");
      setDescription("");
      setStore("");
    } catch (err) {
      console.error(err);
      alert("Error adding transaction");
    }
  };

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  // helper for styling label+input rows
  const inputRowStyle = { display: "flex", flexDirection: "column", marginBottom: "10px" };

  return (
    <div style={{ margin: "2rem auto", width: "400px", fontFamily: "sans-serif" }}>
      <h2>💰 Personal Finance App</h2>

      {!user ? (
        <>
          <h3>Sign Up</h3>
          <div style={inputRowStyle}>
            <label>First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div style={inputRowStyle}>
            <label>Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div style={inputRowStyle}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button onClick={handleSignup}>Create Account</button>
        </>
      ) : (
        <>
          <h3>Welcome, {user.first_name} {user.last_name}!</h3>
          <h4>Add Transaction</h4>
          <div style={inputRowStyle}>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div style={inputRowStyle}>
            <label>Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div style={inputRowStyle}>
            <label>Store</label>
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            />
          </div>
          <div style={inputRowStyle}>
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div style={inputRowStyle}>
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button onClick={addTransaction}>Add Transaction</button>

          <h4 style={{ marginTop: "20px" }}>All Transactions</h4>
          {transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {transactions.map((t) => (
                <li
                  key={t.id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <strong>{t.type === "income" ? "➕" : "➖"} ${t.amount}</strong> - {t.category}
                  {t.store && <> | {t.category}</>}
                  {t.description && (
                    <div style={{ fontSize: "0.9em", color: "#555" }}>{t.description}</div>
                  )}
                  <div style={{ fontSize: "0.8em", color: "#999" }}>
                    {new Date(t.date).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default App;