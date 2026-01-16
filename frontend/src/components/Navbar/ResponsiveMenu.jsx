/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

const ResponsiveMenu = ({ open, onClose }) => {
    // Lock background scroll when menu is open (important for mobile)
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="fixed inset-0 z-50 md:hidden"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={onClose}
                        onTouchStart={onClose}
                        aria-hidden="true"
                    />

                    {/* Menu panel */}
                    <div className="relative mx-4 mt-6 rounded-3xl bg-primary text-white shadow-lg">
                        <ul className="flex flex-col items-center gap-6 py-10 text-lg font-semibold uppercase">
                            <li>
                                <Link to="/" onClick={onClose} onTouchStart={onClose}>
                                    Home
                                </Link>
                            </li>

                            <li>
                                <Link to="/ShowListingPublic" onClick={onClose} onTouchStart={onClose}>
                                    Products
                                </Link>
                            </li>

                            <li>
                                <Link to="/artists" onClick={onClose} onTouchStart={onClose}>
                                    Artists
                                </Link>
                            </li>

                            <li>
                                <Link to="/contact" onClick={onClose} onTouchStart={onClose}>
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ResponsiveMenu;
