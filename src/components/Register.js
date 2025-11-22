import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "./firebase";

function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();   
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("User registered successfully");    
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h3>Sign Up</h3>
            
            <div className="mb-3">
                <label>First name</label>
                <input
                    type="text"
                    className="form-control"
                    onChange={(e) => setFname(e.target.value)}
                    required
                />
            </div>

            <div className="mb-3">
                <label>Last name</label>
                <input
                    type="text"
                    className="form-control"
                    onChange={(e) => setLname(e.target.value)}
                    required
                />
            </div>

            <div className="mb-3">
                <label>Email</label>
                <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="mb-3">
                <label>Password</label>
                <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <div className="d-grid">
                <button type="submit" className="btn btn-primary">
                    Sign Up
                </button>
            </div>
        </form>
    );
}

export default SignUp;
