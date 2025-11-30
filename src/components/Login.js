import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "./firebase";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully!");

      navigate("/dashboard", { state: { fname: "User", lname: "" } }); 
    } catch (error) {
      console.log(error);
      toast.error("Invalid credentials!");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h3>Login</h3>

      <div className="mb-3">
        <label>Email address</label>
        <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label>Password</label>
        <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <div className="d-grid mb-3">
        <button type="submit" className="btn btn-primary">Login</button>
      </div>

      <p>
        Don't have an account? <Link to="/sign-up">Register</Link>
      </p>
    </form>
  );
}

export default Login;
