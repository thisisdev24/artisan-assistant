import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer"); // default role
  const navigate = useNavigate();
  const { login } = useAuth();

  // 🔹 Define handleSubmit BEFORE using it in <form onSubmit={handleSubmit}>
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/api/auth/login", {
        email,
        password,
        role,
      });

      // Use AuthContext login function
      login(res.data.token, res.data.user);

      // Role-based redirect
      // Role-based redirect (auto-detect from response)
      const userRole = res.data.user.role;
      if (userRole === "seller") {
        navigate("/Seller", { state: { storeName: res.data.user.store } });
      } else if (userRole === "buyer") {
        navigate("/");
      } else if (userRole === "admin") {
        navigate("/Admin");
      } else {
        navigate("/");
      }

    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };
  return (
    <>
      {/* <Navbar /> */}
      <div className="min-h-screen bg-secondary/20 flex flex-col justify-center items-center select-none">
        <div className="w-full max-w-md lg:max-w-lg bg-primary/20 p-8 rounded-xl shadow-2xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-black mb-6" >Login</h2>
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {/* Role dropdown */}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              className="w-1/2 mt-4 bg-gradient-to-r from-primary to-secondary text-black py-4 rounded-md hover:scale-105 duration-200 font-semibold"
            >
              Continue
            </button>
          </form>
          <p className="text-sm lg:text-base text-gray-600 text-center mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-orange-400 font-semibold hover:underline">
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
