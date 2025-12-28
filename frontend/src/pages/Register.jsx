import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("buyer"); // default role
  const [store, setStore] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 4)
      return alert("Password must have at least 4 characters.");
    if (password !== confirmPassword) return alert("Passwords do not match");
    if (!email.trim().endsWith(".com")) return alert("Invalid email");
    try {
      const res = await apiClient.post("/api/auth/register", {
        name,
        email,
        password,
        role,
        store,
      });
      // Use AuthContext login function
      login(res.data.token, res.data.user);
      // Role-based redirect
      if (res.data.user.role === "seller") {
        navigate("/Seller", { state: { storeName: res.data.user.store } });
      } else if (res.data.user.role === "admin") {
        navigate("/Admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Registration failed");
    }
  };

  return (
    <>
      {/* <Navbar /> */}
      <div className="min-h-screen bg-white flex flex-col justify-center items-center">
        <div className="w-full max-w-sm md:max-w-md mx-auto bg-primary/20 p-4 rounded-xl shadow-2xl mt-16 select-none">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-black mb-6">
            Create Account
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value.replace(/\b[a-z]/g, (match) =>
                    match.toUpperCase()
                  )
                )
              }
              className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>

            {role === "seller" ? (
              <input
                id="storeInput"
                placeholder="Store"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : null}

            <button
              type="submit"
              className="mt-4 w-1/2 mx-auto bg-gradient-to-r from-primary to-secondary text-black py-4 rounded-md hover:scale-105 duration-200 font-semibold"
            >
              Sign Up
            </button>
          </form>
          <p className="text-sm lg:text-base text-gray-600 text-center mt-4">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-orange-400 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
