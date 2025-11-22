import React from "react";
import "./Sidebar.css";

function Sidebar({ isOpen, toggleSidebar }) {
  return (
    <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h3>Menu</h3>
        <button className="close-btn" onClick={toggleSidebar}>×</button>
      </div>

      <ul className="sidebar-links">
        <li>Dashboard</li>
        <li>Practice Session</li>
        <li>Search for a song</li>       
        <li>Practice History</li>
        <li>Manage Your Account</li>
      </ul>
    </div>
  );
}

export default Sidebar;
