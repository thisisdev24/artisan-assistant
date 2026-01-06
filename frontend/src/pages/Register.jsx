// frontend/src/pages/Register.jsx

import React, { useEffect, useState, useRef } from "react";
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

  // new states
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds until resend allowed
  const resendTimerRef = useRef(null);
  const [verifyError, setVerifyError] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // request server to send verification code to provided email
  const sendVerificationEmail = async () => {
    if (!email || !email.includes("@")) {
      setVerifyError("Enter a valid email first");
      return;
    }
    try {
      setSendLoading(true);
      setVerifyError(null);

      const resp = await apiClient.post("/api/auth/send-verification", { email });
      if (resp.data?.ok) {
        setVerificationSent(true);
        setIsEmailVerified(false);
        const cooldown = resp.data.resendAfter || 60;
        setResendCooldown(cooldown);

        // start countdown
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);
        resendTimerRef.current = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(resendTimerRef.current);
              resendTimerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setVerifyError(resp.data?.msg || "Failed to send code");
      }
    } catch (err) {
      setVerifyError(err?.response?.data?.msg || "Failed to send verification code");
    } finally {
      setSendLoading(false);
    }
  };

  // verify the code entered by user
  const verifyEmailCode = async () => {
    setVerifyError(null);
    if (!verificationCode) {
      setVerifyError("Enter the verification code");
      return;
    }
    try {
      setVerifying(true);
      const res = await apiClient.post("/api/auth/verify-email", { email, code: verificationCode });
      if (res.data?.ok) {
        setIsEmailVerified(true);
        setVerifyError(null);
        setAttemptsLeft(null);
      } else {
        setIsEmailVerified(false);
        setVerifyError(res.data?.msg || "Verification failed");
        if (typeof res.data?.attemptsLeft !== "undefined") {
          setAttemptsLeft(res.data.attemptsLeft);
        }
      }
    } catch (err) {
      const data = err?.response?.data;
      setIsEmailVerified(false);
      setVerifyError(data?.msg || "Verification failed");
      if (typeof data?.attemptsLeft !== "undefined") {
        setAttemptsLeft(data.attemptsLeft);
      }
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setVerifyError("Please verify your email before signing up.");
      return;
    }
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
            {/* EMAIL ROW */}
            <div className="flex gap-2 items-center">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // clear previous verification state if email changed
                  setVerificationSent(false);
                  setIsEmailVerified(false);
                  setVerificationCode("");
                  setVerifyError(null);
                  setAttemptsLeft(null);
                }}
                className="flex-1 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={sendVerificationEmail}
                disabled={sendLoading || !email || resendCooldown > 0}
                className="px-3 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {sendLoading ? "Sending..." : (resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Send code")}
              </button>
            </div>

            {/* VERIFICATION INPUT (shown after send) */}
            {verificationSent && !isEmailVerified && (
              <div className="mt-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="flex-1 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    disabled={verifying || !verificationCode}
                    className="px-3 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
                  >
                    {verifying ? "Verifying..." : "Verify"}
                  </button>
                </div>

                {/* inline errors / attempts */}
                {verifyError && <p className="text-sm text-red-600 mt-2">{verifyError}</p>}
                {attemptsLeft !== null && attemptsLeft >= 0 && (
                  <p className="text-sm text-gray-600 mt-1">Attempts left: {attemptsLeft}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Didn't receive the code? {resendCooldown > 0 ? `You can resend in ${resendCooldown}s` : (
                    <button
                      type="button"
                      onClick={sendVerificationEmail}
                      className="underline text-blue-600"
                    >
                      Resend
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* VERIFIED BADGE */}
            {isEmailVerified && (
              <div className="mt-2 inline-flex items-center gap-2 text-sm text-green-700 font-medium">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879A1 1 0 103.293 9.293l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                </svg>
                Email verified
              </div>
            )}
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
              disabled={!isEmailVerified}
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
