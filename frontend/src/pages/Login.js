import React, { useState } from "react";

function Login({ setUser }) {
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle signup
  const handleSignup = async () => {
    setError("");
    
    if (!email || !password || !firstName || !lastName) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          first_name: firstName, 
          last_name: lastName, 
          email,
          password
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setUser(data);
      alert("Account created successfully!");
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    setError("");
    
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Invalid email or password");
      }

      const data = await res.json();
      setUser(data);
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    backgroundColor: loading ? "#ccc" : "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "10px",
  };

  const linkStyle = {
    textAlign: "center",
    marginTop: "15px",
    color: "#666",
    fontSize: "14px",
  };

  const errorStyle = {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: "12px",
    borderRadius: "5px",
    marginBottom: "15px",
    fontSize: "14px",
    border: "1px solid #ef9a9a",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center", color: "#1a1a2e", marginBottom: "30px" }}>
          💰 Personal Finance App
        </h2>

        {error && (
          <div style={errorStyle}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {isSignup ? (
          <>
            <h3 style={{ marginBottom: "20px", color: "#333" }}>Create Account</h3>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
            <button 
              onClick={handleSignup} 
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            <div style={linkStyle}>
              Already have an account?{" "}
              <span
                style={{ color: "#4CAF50", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => {
                  setIsSignup(false);
                  setError("");
                }}
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
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
            <button 
              onClick={handleLogin} 
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <div style={linkStyle}>
              Don't have an account?{" "}
              <span
                style={{ color: "#4CAF50", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => {
                  setIsSignup(true);
                  setError("");
                }}
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