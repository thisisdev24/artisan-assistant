import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const ArtistCardSkeleton = () => (
    <motion.div
        className="animate-pulse bg-white rounded-2xl p-6 shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
    </motion.div>
);

const Artists = () => {
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(true);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const fetchArtists = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("http://localhost:5000/api/artisans", {
                    params: {
                        ...(search ? { search } : {})
                    },
                    signal: controller.signal
                });
                setArtists(res.data.results || []);
            } catch (err) {
                if (axios.isCancel(err)) return;
                console.error(err);
                setError(err?.response?.data?.message || "Failed to load artists");
            } finally {
                setLoading(false);
            }
        };
        fetchArtists();
        return () => controller.abort();
    }, [search]);

    const filteredArtists = useMemo(() => {
        if (!search) return artists;
        const q = search.toLowerCase();
        return artists.filter((artist) =>
            [artist.name, artist.store, artist.email].some((field) =>
                field?.toLowerCase().includes(q)
            )
        );
    }, [artists, search]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
    };

    return (
        <motion.div
            className="min-h-screen bg-gray-50 py-10 px-4"
            initial="hidden"
            animate={loaded ? "visible" : "hidden"}
            variants={containerVariants}
        >
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <motion.div
                    className="text-center"
                    variants={itemVariants}
                >
                    <motion.p
                        className="text-5xl uppercase tracking-wide text-orange-400 font-bold mb-10"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                    >
                        Meet the Sellers
                    </motion.p>
                    <motion.h1
                        className="text-4xl font-extrabold text-gray-900"
                        variants={itemVariants}
                    >
                        Featured Artists
                    </motion.h1>
                    <motion.p
                        className="mt-3 text-gray-600 max-w-2xl mx-auto"
                        variants={itemVariants}
                    >
                        Discover registered artisans crafting unique handmade products. Every seller listed here has an active account on the marketplace.
                    </motion.p>
                </motion.div>

                {/* Search Section */}
                <motion.div
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white rounded-2xl shadow p-4"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <motion.input
                            type="text"
                            placeholder="Search by name, store or email"
                            className="flex-1 md:w-80 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-indigo-200 transition-all duration-300"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            variants={itemVariants}
                            whileFocus={{ scale: 1.05 }}
                        />
                    </div>
                </motion.div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-center"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {error}
                    </motion.div>
                )}

                {/* Loading State */}
                {loading ? (
                    <motion.div
                        className="grid gap-6 md:grid-cols-2"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <ArtistCardSkeleton key={idx} />
                        ))}
                    </motion.div>
                ) : filteredArtists.length === 0 ? (
                    <motion.div
                        className="text-center py-16 bg-white rounded-2xl shadow"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.p
                            className="text-lg font-semibold text-gray-700"
                            variants={itemVariants}
                        >
                            No artists found
                        </motion.p>
                        <motion.p
                            className="text-gray-500 mt-2"
                            variants={itemVariants}
                        >
                            Try adjusting your search or filters.
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        className="grid gap-6 md:grid-cols-2"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredArtists.map((artist) => (
                            <motion.div
                                key={artist._id}
                                className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition-shadow duration-300"
                                variants={cardVariants}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="flex items-start gap-4">
                                    <motion.div
                                        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center text-xl font-bold"
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {artist.name?.[0]?.toUpperCase() || "A"}
                                    </motion.div>
                                    <div className="flex-1">
                                        <motion.h2
                                            className="text-xl font-semibold text-gray-900"
                                            variants={itemVariants}
                                        >
                                            {artist.name}
                                        </motion.h2>
                                        <motion.p
                                            className="text-sm text-gray-500"
                                            variants={itemVariants}
                                        >
                                            {artist.email}
                                        </motion.p>
                                        <motion.span
                                            className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700"
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            {artist.status === "active" ? "Active Seller" : artist.status}
                                        </motion.span>
                                    </div>
                                </div>

                                <motion.div
                                    className="mt-4 border-t pt-4 grid grid-cols-2 gap-4 text-sm text-gray-600"
                                    variants={itemVariants}
                                >
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide">Store</p>
                                        <p className="font-medium text-gray-800">{artist.store}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide">Joined</p>
                                        <p className="font-medium text-gray-800">
                                            {artist.createdAt ? new Date(artist.createdAt).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide">Last Seen</p>
                                        <p className="font-medium text-gray-800">
                                            {artist.activity?.last_seen ? new Date(artist.activity.last_seen).toLocaleDateString() : "No data"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide">Logins</p>
                                        <p className="font-medium text-gray-800">{artist.login?.login_count ?? 0}</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default Artists;
