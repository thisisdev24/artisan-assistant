import { useState } from 'react';
import axios from 'axios';
export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  async function submit(e){
    e.preventDefault();
    const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/login', { email, password });
    console.log(res.data);
    // save token -> localStorage
    localStorage.setItem('token', res.data.token);
    window.location.href = '/';
  }
  return (
    <form onSubmit={submit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email"/>
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password"/>
      <button type="submit">Login</button>
    </form>
  );
}
