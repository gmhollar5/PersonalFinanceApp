import React, { useState } from "react";

function Login({ setUser }) {
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Handle signup (create new user)
  const handleSignup = async () => {
    if (!email || !firstName || !lastName) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch("/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
      });
      if (!res.ok) throw new Error("Error creating user");
      const data = await res.json();
      setUser(data);
      alert("Account created successfully!");
    } catch (err) {
      console.error(err);
      alert("Error creating user (email may already exist).");
    }
  };

  // Handle login (mock - in production you'd authenticate)
  const handleLogin = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }
    // For now, we'll just fetch the user by email (not secure, but works for MVP)
    // In production, you'd have proper authentication
    alert("Login functionality coming soon! For now, please use signup.");
  };

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
  };

  const cardStyle = {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "10px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    width: "100%",
    maxWidth: "400px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  };

  const linkStyle = {
    textAlign: "center",
    marginTop: "15px",
    color: "#666",
    fontSize: "14px",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center", color: "#1a1a2e", marginBottom: "30px" }}>
          💰 Personal Finance App
        </h2>

        {isSignup ? (
          <>
            <h3 style={{ marginBottom: "20px", color: "#333" }}>Create Account</h3>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleSignup} style={buttonStyle}>
              Sign Up
            </button>
            <div style={linkStyle}>
              Already have an account?{" "}
              <span
                style={{ color: "#4CAF50", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setIsSignup(false)}
              >
                Login
              </span>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: "20px", color: "#333" }}>Login</h3>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              style={inputStyle}
            />
            <button onClick={handleLogin} style={buttonStyle}>
              Login
            </button>
            <div style={linkStyle}>
              Don't have an account?{" "}
              <span
                style={{ color: "#4CAF50", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setIsSignup(true)}
              >
                Sign Up
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;