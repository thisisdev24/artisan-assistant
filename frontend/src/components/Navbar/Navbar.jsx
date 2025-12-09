import React from 'react'
import { NavbarMenu } from '../../mockData/data'
import { CiSearch } from "react-icons/ci";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaDumbbell } from "react-icons/fa";
import { SiSnapcraft } from "react-icons/si";
import { MdMenu } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom"; // Import Link
import ResponsiveMenu from './ResponsiveMenu';
import { FaUser } from "react-icons/fa";
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const [open, setOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false); // for showing search input
    const [searchQuery, setSearchQuery] = React.useState('');  // for input value
    const [userMenuOpen, setUserMenuOpen] = React.useState(false); // for user dropdown menu
    const navigate = useNavigate();

    const { user, logout, isBuyer, isSeller, isAdmin } = useAuth();
    const { cartCount } = useCart();

    // Close user menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuOpen && !event.target.closest('.user-menu-container')) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

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
        if (searchQuery.length === 0) {
            setSearchOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <>
            <nav>
                <div className='fixed top-0 p-8 w-full  flex justify-between items-center py-4 bg-white/40 backdrop-blur-lg border-b border-white/20 shadow-lg z-50 '>
                    {/* logo section */}
                    <Link to={user ? (isSeller ? "/Seller" : isAdmin ? "/Admin" : "/") : "/"} className='text-2xl flex items-center gap-2 font-bold uppercase order-1'>
                        <SiSnapcraft />
                        <p>Artist</p>
                        <p className='text-secondary '>Point</p>
                    </Link>
                    {/* menu section - Role-based navigation */}
                    <div className='hidden md:block order-2'>
                        <ul className='flex items-center gap-6 text-black'>
                            {!user ? (
                                // Not logged in - show public menu
                                NavbarMenu.map((item) => {
                                    return (<li key={item.id}>
                                        <a href={item.link} className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            {item.title} </a>
                                    </li>);
                                })
                            ) : isSeller ? (
                                // Seller menu - only seller options
                                <>
                                    <li>
                                        <Link to="/Seller" className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/CreateListing" className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            Add Product
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/ShowListing" className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            My Products
                                        </Link>
                                    </li>
                                </>
                            ) : isAdmin ? (
                                // Admin menu - only admin options
                                <>
                                    <li>
                                        <Link to="/Admin" className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            Dashboard
                                        </Link>
                                    </li>
                                </>
                            ) : (
                                // Buyer menu - show public menu
                                NavbarMenu.map((item) => {
                                    return (<li key={item.id}>
                                        <a href={item.link} className='incline-block py-1 px-3 hover:text-primary font-semibold'>
                                            {item.title} </a>
                                    </li>);
                                })
                            )}
                        </ul>
                    </div>
                    {/* icons section */}
                    <div className='flex items-center gap-4 order-3'>
                        {/* icons section */}
                        <div className="flex items-center gap-4 relative">
                            {/* Search button */}
                            <button
                                onMouseEnter={() => setSearchOpen(!searchOpen)}
                                className="text-2xl hover:bg-primary hover:text-white p-2 rounded-full duration-200"
                            >
                                {searchOpen ? '' : <CiSearch />}
                            </button>

                            {/* Animated search input */}
                            {searchOpen && (
                                <form
                                    onSubmit={handleSearchSubmit}
                                    className=" top-full left-0 mt-2 bg-white border border-gray-300 rounded-full flex items-center shadow-lg overflow-hidden transition-all duration-300 w-64 relative"
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
                            {/* Cart button - show for everyone, redirect to login if not logged in */}
                            <button
                                onClick={() => {
                                    if (isBuyer) {
                                        navigate('/cart');
                                    } else {
                                        navigate('/login');
                                    }
                                }}
                                className='relative text-2xl hover:bg-primary hover:text-white p-2 rounded-full duration-200'
                                aria-label="Open cart"
                            >
                                <PiShoppingCartThin />
                                {isBuyer && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            {/* User menu - Hamburger for buyers, icon for sellers/admins */}
                            {user ? (
                                <div className="flex items-center gap-2 relative user-menu-container order-4">
                                    {isBuyer ? (
                                        <>
                                            {/* Hamburger menu for buyers */}
                                            <button
                                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                                className='text-2xl hover:bg-primary hover:text-white p-2 rounded-full duration-200 flex items-center justify-center'
                                                title="Menu"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                            </button>
                                            
                                            {/* Dropdown menu */}
                                            {userMenuOpen && (
                                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="px-4 py-3 border-b border-gray-100">
                                                        <p className="font-semibold text-gray-900">{user.name}</p>
                                                        <p className="text-sm text-gray-500">{user.email}</p>
                                                    </div>
                                                    <div className="py-2">
                                                        <Link
                                                            to="/my-wishlist"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>My Wishlist</span>
                                                        </Link>
                                                        <Link
                                                            to="/recently-viewed"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Recently Viewed</span>
                                                        </Link>
                                                        <Link
                                                            to="/profile"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <FaUser className="h-5 w-5 text-indigo-500" />
                                                            <span>Profile</span>
                                                        </Link>
                                                        <Link
                                                            to="/profile?tab=orders"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                            </svg>
                                                            <span>My Orders</span>
                                                        </Link>
                                                        <Link
                                                            to="/profile?tab=reviews"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                            </svg>
                                                            <span>My Reviews</span>
                                                        </Link>
                                                        <Link
                                                            to="/profile?tab=personal"
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            <span>My Account</span>
                                                        </Link>
                                                    </div>
                                                    <div className="border-t border-gray-100 pt-2">
                                                        <button
                                                            onClick={() => {
                                                                logout();
                                                                setUserMenuOpen(false);
                                                                navigate('/');
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                            </svg>
                                                            <span>Logout</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Icon for sellers/admins */}
                                            <Link to={isSeller ? "/Seller" : "/Admin"} className='text-2xl hover:bg-primary hover:text-white p-2 rounded-full duration-200' title={user.name}>
                                                <FaUser />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    navigate('/');
                                                }}
                                                className='text-sm text-primary hover:bg-primary font-semibold hover:text-white p-2 rounded-md border-2 border-primary px-4 py-1 duration-200'
                                            >
                                                Logout
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                searchOpen ?
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
                            )}
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
