/* eslint-disable no-unused-vars */
// src/pages/ContactPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Assuming the background image is in the public folder, e.g., /contact-bg.jpg
// You can replace '/contact-bg.jpg' with your actual image path or import it.

const ContactPage = () => {
  const [loaded, setLoaded] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);

  useEffect(() => {
    setLoaded(true);
  }, []);

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const heroVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
  };

  const illustrationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1, delay: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat text-gray-900">
      {/* HERO */}
      <header className="bg-emerald-900 text-black py-20 overflow-hidden">
        <motion.div
          className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20 flex flex-col lg:flex-row items-center gap-10"
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div className="lg:flex-1" variants={heroVariants}>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-emerald-100"
              variants={itemVariants}
            >
              Get in touch<span className="text-amber-400">.</span>
            </motion.h1>
            <motion.p
              className="mt-6 text-lg sm:text-xl max-w-2xl"
              variants={itemVariants}
            >
              Want to get in touch? We'd love to hear from you. Here's how you
              can reach us.
            </motion.p>

            <motion.div
              className="mt-8 flex items-center gap-4"
              variants={itemVariants}
            >
              <motion.a
                href="#sales"
                className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-4 py-3 rounded-lg font-medium shadow transition-all duration-300 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Talk to Sales
              </motion.a>
              <motion.a
                href="#support"
                className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-4 py-3 rounded-lg font-medium shadow transition-all duration-300 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Support
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Illustration block */}
          <motion.div
            className="lg:w-1/3 flex justify-center lg:justify-end"
            variants={illustrationVariants}
          >
            <svg
              viewBox="0 0 520 360"
              className="w-64 sm:w-80 lg:w-[360px] h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0"
                y="0"
                width="520"
                height="360"
                rx="18"
                fill="#062c28"
              />
              <g
                transform="translate(60,40)"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
              >
                <rect
                  x="20"
                  y="10"
                  rx="8"
                  width="180"
                  height="220"
                  fill="#fff2e8"
                  stroke="none"
                />
                <rect
                  x="240"
                  y="50"
                  rx="8"
                  width="180"
                  height="200"
                  fill="#fff9f4"
                  stroke="none"
                />
              </g>
              {/* two simple person shapes */}
              <g transform="translate(120,60)">
                <circle cx="40" cy="40" r="22" fill="#f97316" />
                <rect
                  x="12"
                  y="70"
                  width="56"
                  height="60"
                  rx="12"
                  fill="#fff"
                />
              </g>
              <g transform="translate(320,100)">
                <circle cx="40" cy="32" r="20" fill="#0f766e" />
                <rect
                  x="12"
                  y="60"
                  width="56"
                  height="60"
                  rx="12"
                  fill="#fff"
                />
              </g>
            </svg>
          </motion.div>
        </motion.div>
      </header>

      {/* CARDS SECTION */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 -mt-12">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {/* Card 1 */}
          <motion.article
            id="sales"
            className="bg-white rounded-2xl p-8 shadow-xl ring-1 ring-gray-100 flex flex-col transition-all duration-300 hover:shadow-2xl hover:scale-105"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold shadow-sm">
                ☎
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Talk to Sales
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Interested in our product? Speak with a member of our sales
                  team to get a demo or pricing details.
                </p>
              </div>
            </div>

            <div className="mt-6 flex-1">
              <p className="text-sm text-gray-600">Call us at:</p>
              <a
                href="tel:+18884827768"
                className="mt-3 inline-block text-lg font-semibold text-emerald-900 hover:text-emerald-700 transition-colors"
              >
                +1 888 482 7768
              </a>
              <div className="mt-4">
                <a
                  href="#"
                  className="text-sm text-amber-600 underline hover:text-amber-700 transition-colors"
                >
                  View all global numbers
                </a>
              </div>
            </div>

            <div className="mt-6">
              <motion.a
                className="inline-flex items-center px-5 py-3 bg-emerald-900 text-white rounded-lg shadow hover:scale-105 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start a conversation
              </motion.a>
            </div>
          </motion.article>

          {/* Card 2 */}
          <motion.article
            id="support"
            className="bg-white rounded-2xl p-8 shadow-xl ring-1 ring-gray-100 flex flex-col transition-all duration-300 hover:shadow-2xl hover:scale-105"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-xl font-bold shadow-sm">
                💬
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Contact Customer Support
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Need help? Our support team is available to troubleshoot and
                  guide you through any issues.
                </p>
              </div>
            </div>

            <div className="mt-6 flex-1">
              <p className="text-sm text-gray-600">
                Open a support ticket or start a live chat for immediate
                assistance.
              </p>
              <div className="mt-4">
                <motion.a
                  href="#"
                  className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Contact Support
                </motion.a>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="text-xs text-gray-500">Support hours:</span>
              <span className="text-sm text-gray-700 font-medium">
                Mon–Fri 8am–8pm
              </span>
            </div>
          </motion.article>
        </motion.div>

        {/* Optional additional info row */}
        <motion.div
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 shadow ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:scale-105"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-semibold">Sales resources</h4>
            <p className="text-sm text-gray-500 mt-2">
              Get pricing guides, ROI calculators and case studies.
            </p>
          </motion.div>
          <motion.div
            className="bg-white rounded-2xl p-6 shadow ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:scale-105"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-semibold">Documentation</h4>
            <p className="text-sm text-gray-500 mt-2">
              Browse support docs and developer guides.
            </p>
          </motion.div>
          <motion.div
            className="bg-white rounded-2xl p-6 shadow ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:scale-105"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <h4 className="font-semibold">Partner with us</h4>
            <p className="text-sm text-gray-500 mt-2">
              Learn about partnership opportunities and integrations.
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Floating chat bubble */}
      {chatVisible && (
        <motion.div
          className="fixed right-6 bottom-6 z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <motion.button
              aria-label="Open chat"
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-4 py-3 hover:shadow-2xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold animate-pulse">
                AI
              </span>
              <span className="text-sm text-gray-700">
                Want to get in touch? I’m an AI chatbot here to help
              </span>
            </motion.button>
            <motion.button
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-100 border text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Close chat"
              onClick={() => setChatVisible(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </div>
        </motion.div>
      )}

      <footer className="mt-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} Your Company. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
