import { useState } from 'react'
import axios from 'axios';

const CreateListing = () => {
  const [title,setTitle]=useState(''); const [price,setPrice]=useState('');
  const [files,setFiles]=useState([]);
  const [description,setDescription]=useState('');
  const token = localStorage.getItem('token');

  async function handleAutoDesc(){
    try {
      const data = { title, category: 'Handicraft' }; // send more if needed
      const res = await axios.post('/api/ml/generate-description', data);
      setDescription(res.data.description);
    } catch(err){ console.error(err) }
  }

  async function submit(e){
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('description', description);
    files.forEach(f => formData.append('images', f));
    const res = await axios.post('/api/listings', formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': 'Bearer ' + token }});
    console.log('created', res.data);
    window.location.href = `/listings/${res.data._id}`;
  }

  return (
    <form onSubmit={submit}>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
      <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price"/>
      <textarea value={description} onChange={e=>setDescription(e.target.value)}/>
      <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files))}/>
      <button type="button" onClick={handleAutoDesc}>Auto-generate description</button>
      <button type="submit">Publish</button>
    </form>
  );
}

export default CreateListing;