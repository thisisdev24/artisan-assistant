import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, Store, Package, ShoppingCart,
    Truck, Tag, AlertCircle, BarChart3, Shield, Settings, LogOut
} from 'lucide-react';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/sellers', icon: Store, label: 'Sellers' },
        { path: '/admin/products', icon: Package, label: 'Products' },
        { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
        { path: '/admin/shipments', icon: Truck, label: 'Shipments' },
        { path: '/admin/coupons', icon: Tag, label: 'Coupons' },
        { path: '/admin/disputes', icon: AlertCircle, label: 'Disputes' },
        { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
        { path: '/admin/security', icon: Shield, label: 'Security' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (path, exact) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <div className="flex bg-gray-50/50 pt-16">
            {/* Sidebar - positioned below navbar */}
            <aside className="w-56 bg-white border-r border-gray-200 fixed top-[64px] bottom-0 overflow-y-auto">
                {/* Navigation */}
                <nav className="p-3">
                    <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Menu</p>
                    <div className="space-y-0.5 mt-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path, item.exact);

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>

                {/* User Info at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500">Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content - offset by sidebar width */}
            <main className="flex-1 ml-56 min-h-[calc(100vh-64px)]">
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;

