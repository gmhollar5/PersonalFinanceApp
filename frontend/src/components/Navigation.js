import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navigation({ user, onLogout }) {
  const location = useLocation();

  const navStyle = {
    backgroundColor: "#1a1a2e",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const leftSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "30px",
  };

  const logoStyle = {
    color: "white",
    fontSize: "20px",
    fontWeight: "bold",
    textDecoration: "none",
  };

  const navLinksStyle = {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  };

  const linkStyle = (isActive) => ({
    color: isActive ? "#4CAF50" : "white",
    textDecoration: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    backgroundColor: isActive ? "rgba(76, 175, 80, 0.1)" : "transparent",
    transition: "all 0.3s",
    fontWeight: isActive ? "bold" : "normal",
  });

  const rightSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  };

  const userInfoStyle = {
    color: "white",
    fontSize: "14px",
  };

  const logoutButtonStyle = {
    backgroundColor: "#ff4444",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  };

  return (
    <nav style={navStyle}>
      <div style={leftSectionStyle}>
        <Link to="/" style={logoStyle}>
          💰 Finance App
        </Link>
        <div style={navLinksStyle}>
          <Link
            to="/add-transaction"
            style={linkStyle(location.pathname === "/add-transaction")}
          >
            Add Transaction
          </Link>
          <Link
            to="/view-transactions"
            style={linkStyle(location.pathname === "/view-transactions")}
          >
            View Transactions
          </Link>
          <Link
            to="/analytics"
            style={linkStyle(location.pathname === "/analytics")}
          >
            Analytics
          </Link>
          <Link
            to="/account-tracker"
            style={linkStyle(location.pathname === "/account-tracker")}
          >
            Account Tracker
          </Link>
        </div>
      </div>
      <div style={rightSectionStyle}>
        <span style={userInfoStyle}>
          👤 {user.first_name} {user.last_name}
        </span>
        <button onClick={onLogout} style={logoutButtonStyle}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navigation;