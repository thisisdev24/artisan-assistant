import React from 'react'
import { NavbarMenu } from '../../mockData/data'
import { CiSearch } from "react-icons/ci";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaDumbbell } from "react-icons/fa";
import { SiSnapcraft } from "react-icons/si";
import { MdMenu } from "react-icons/md";
import { Link } from "react-router-dom"; // Import Link
import ResponsiveMenu from './ResponsiveMenu';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [open, setOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false); // for showing search input
    const [searchQuery, setSearchQuery] = React.useState('');  // for input value
    const navigate = useNavigate();

    // handle form submission
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim() !== '') {
            navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
            setSearchOpen(false);
            setSearchQuery('');
        }
    };
    // Handles closing search bar (when pressing escape or clicking X)
    const closeSearchOnMouseOut = () => {
        if(searchQuery.length === 0) {
            setSearchOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <>
            <nav>
                <div className='pl-12 container flex justify-between items-center py-8 '>
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
                        {/* icons section */}
                        <div className="flex items-center gap-4 relative">
                            {/* Search button */}
                            <button
                                onMouseEnter={() => setSearchOpen(!searchOpen)}
                                className="text-2xl hover:bg-primary hover:text-white p-2 rounded-full duration-200"
                            >
                                {searchOpen? '' : <CiSearch/> }
                            </button>

                            {/* Animated search input */}
                            {searchOpen && (
                                <form
                                    onSubmit={handleSearchSubmit}
                                    className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-full flex items-center shadow-lg overflow-hidden transition-all duration-300 w-64 relative"
                                >
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onMouseLeave={() => closeSearchOnMouseOut()}
                                        className="flex-grow px-4 py-2 outline-none text-gray-700"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition-all"
                                    >
                                        Go
                                    </button>
                                </form>
                            )}
                            <button className='text-2xl hover:bg-primary hover:text-white p-2 rounded-full
                 duration-200 '>
                                <PiShoppingCartThin />
                            </button>
                            {/* Login & Register buttons */}
                            {searchOpen?
                            <div className='pl-18 hidden md:flex gap-2'>
                                <Link to="/login" className='text-primary hover:bg-primary font-semibold hover:text-white p-2 rounded-md border-2 border-primary px-6 py-2 duration-200'>
                                    Login
                                </Link>
                                <Link to="/register" className='text-primary hover:bg-primary font-semibold hover:text-white p-2 rounded-md border-2 border-primary px-6 py-2 duration-200'>
                                    Register
                                </Link>
                            </div>
                            :
                            <div className='pl-32 hidden md:flex gap-2'>
                                <Link to="/login" className='text-primary hover:bg-primary font-semibold hover:text-white p-2 rounded-md border-2 border-primary px-6 py-2 duration-200'>
                                    Login
                                </Link>
                                <Link to="/register" className='text-primary hover:bg-primary font-semibold hover:text-white p-2 rounded-md border-2 border-primary px-6 py-2 duration-200'>
                                    Register
                                </Link>
                            </div>
                            }
                        </div>
                        {/* mobile hamburger menu section */}
                        <div className='md:hidden ' onClick={() => setOpen(!open)}>
                            <MdMenu className='text-4xl ' />
                        </div>
                    </div>
                </div>
            </nav>
            {/* mobile sidebar section */}
            <ResponsiveMenu />
        </>
    )
}

export default Navbar
