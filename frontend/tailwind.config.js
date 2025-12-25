import { DefaultContext } from 'react-icons/lib';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        primary:'#FFB366',
        secondary:'#FFE066',
      container:true,
      padding:{

        Default:'1rem',
        sm:'2rem',
        lg:'4rem',
        xl:'5rem',
        '2xl':'6rem', 
      }
    },
  },
},
  plugins: [],
};
