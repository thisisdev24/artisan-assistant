import React from 'react'
import { NavbarMenu } from '../../mockData/data'
import { CiSearch } from "react-icons/ci";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaDumbbell } from "react-icons/fa";
import { SiSnapcraft } from "react-icons/si";
import { MdMenu } from "react-icons/md";
import ResponsiveMenu from './ResponsiveMenu';
const Navbar = () => {
    const [open,setOpen]=React.useState(false);

    return (
        <>
            <nav>
                <div className='container flex justify-between items-center py-8 '>
                    {/* logo section */}
                    <div className='text-2xl flex items-center gap-2 font-bold uppercase'>
                        <SiSnapcraft />
                        <p>Artist</p>
                        <p className='text-secondary '>Point</p>

                    </div>
                    {/* menu section */}
                    <div className='hidden md:block'>
                        <ul className='flex items-center gap-6 text-gray-600 '>
                            {
                                NavbarMenu.map((item) => {
                                    return (<li key={item.id}>
                                        <a href={item.link} className='incline-block py-1 px-3
                                 hover:text-primary font-semibold'>
                                            {item.title} </a>
                                    </li>
                                    );
                                })
                            }
                        </ul>
                    </div>
                    {/* icons section */}
                    <div className='flex items-center gap-4'>
                        <button className='text-2xl hover:bg-primary hover:text-white p-2 rounded-full
                 duration-200 '>
                            <CiSearch />
                        </button>
                        <button className='text-2xl hover:bg-primary hover:text-white p-2 rounded-full
                 duration-200 '>
                            <PiShoppingCartThin />
                        </button>
                        <button className='text-primary hover:bg-primary font-semibold  hover:text-white p-2 rounded-md
                 border-2 border-primary px-6 py-2  duration-200 hidden md:block'>Login
                        </button>
                    </div>
                    {/* cart section */}
                    {/* mobile humber menu saction*/}
                    <div className='md:hidden ' onClick={()=>setOpen(!open)}>
                        <MdMenu className='text-4xl ' />
                    </div>
                </div>
            </nav>
            {/* mobile sidebar section */}
            <ResponsiveMenu/>
            </>
    )
}

export default Navbar