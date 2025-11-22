import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import { doc, setDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      // 1️⃣ Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Show success toast immediately
      toast.success("Successfully registered!");

      // 2️⃣ Save first name and last name in Firestore (optional)
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fname,
          lname,
          email,
        });
      } catch (firestoreError) {
        console.error("Failed to save user info:", firestoreError);
        toast.error("Account created, but failed to save user info.");
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFname("");
      setLname("");

    } catch (error) {
      console.error(error);
      toast.error(error.message); // show Firebase error (e.g., email already in use)
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <h3>Sign Up</h3>

      <div className="mb-3">
        <label>First Name</label>
        <input type="text" className="form-control" value={fname} onChange={(e) => setFname(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label>Last Name</label>
        <input type="text" className="form-control" value={lname} onChange={(e) => setLname(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label>Email</label>
        <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label>Password</label>
        <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <div className="mb-3">
        <label>Confirm Password</label>
        <input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      </div>

      <div className="d-grid mb-2">
        <button type="submit" className="btn btn-primary">Sign Up</button>
      </div>

      <div style={{ textAlign: "center" }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </form>
  );
}

export default Register;
