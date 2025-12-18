import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiGrid, FiMenu, FiX } from "react-icons/fi";
import { categories } from "../../../../data/categories";

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const navRef = useRef(null);
  
  // Hide navbar on mobile app routes
  if (location.pathname.startsWith('/app')) {
    return null;
  }

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/offers", label: "Offers" },
    { path: "/daily-deals", label: "Daily Deals" },
    { path: "/flash-sale", label: "Flash Sale" },
  ];

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector("header");
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Initial calculation
    updateHeaderHeight();

    // Update on resize
    window.addEventListener("resize", updateHeaderHeight);

    // Update after a short delay to ensure header is rendered
    const timeoutId = setTimeout(updateHeaderHeight, 100);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="glass border-b border-white/20 sticky shadow-md"
      style={{
        top: `${headerHeight}px`,
        zIndex: 40,
      }}>
      <div className="container mx-auto px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Browse Category Button with Dropdown */}
          <div
            className="relative"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
            <button className="flex items-center gap-2 sm:gap-3 gradient-primary text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold text-sm sm:text-base">
              <FiGrid className="text-lg sm:text-xl" />
              <span className="hidden sm:inline">Browse Category</span>
              <span className="sm:hidden">Category</span>
              <span
                className={`text-xs transition-transform duration-300 ${
                  isCategoryOpen ? "rotate-180" : ""
                }`}>
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {isCategoryOpen && (
              <div className="absolute top-full left-0 mt-3 w-72 glass-card rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.id}`}
                    onClick={() => setIsCategoryOpen(false)}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all duration-300 group mx-2 rounded-xl">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/50 transition-all duration-300">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/48x48?text=Category";
                        }}
                      />
                    </div>
                    <span className="text-gray-800 font-semibold transition-colors">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-700 font-semibold transition-all duration-300 relative group">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2.5 text-gray-700 rounded-lg transition-all duration-300">
            {isMenuOpen ? (
              <FiX className="text-2xl" />
            ) : (
              <FiMenu className="text-2xl" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 mt-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="block py-3 px-4 text-gray-700 rounded-lg transition-all duration-300 font-semibold">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
