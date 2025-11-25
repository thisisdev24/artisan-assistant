import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Seller from '../components/Artist/Seller';
// import Buyer from '../components/Buyer/Buyer';
// import Admin from '../components/Admin/Admin';

import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer"); // default role
  const navigate = useNavigate();

  // 🔹 Define handleSubmit BEFORE using it in <form onSubmit={handleSubmit}>
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
        role,
      });
      
      // User data ko localStorage me store karein
        localStorage.setItem("user", JSON.stringify(res.data));
      // Save token + role in localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);

      // Role-based redirect
      if (role === res.data.user.role) {
        if (res.data.user.role === "seller") {
          navigate("/Seller", { state: { storeName: res.data.user.store }});
        } else if (res.data.user.role === "buyer") {
          navigate("/");
        }
        else if (res.data.user.role === "admin") {
          navigate("/Admin");
        }
        else {
          navigate("/");
        }
      } else {
        alert("Role mismatch");
        throw new Error();
      }

    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };
  return (
    <>
      {/* <Navbar /> */}
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-center text-black mb-6">Login</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {/* Role dropdown */}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              className="bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-md hover:scale-105 duration-200 font-semibold"
            >
              Login
            </button>
          </form>
          <p className="text-sm text-gray-600 text-center mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
// export default function Login(){
//   const [email,setEmail]=useState('');
//   const [password,setPassword]=useState('');
//   async function submit(e){
//     e.preventDefault();
//     const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/login', { email, password });
//     console.log(res.data);
//     // save token -> localStorage
//     localStorage.setItem('token', res.data.token);
//     window.location.href = '/';
//   }
//   return (
//     <form onSubmit={submit}>
//       <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email"/>
//       <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password"/>
//       <button type="submit">Login</button>
//     </form>
//   );
// }
