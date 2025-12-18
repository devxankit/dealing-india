import { Link, useLocation } from "react-router-dom";
import { FiHome, FiChevronRight } from "react-icons/fi";
import { getProductById } from "../../../../data/products";

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const getBreadcrumbName = (pathname, index) => {
    // Home
    if (pathname === "") return "Home";

    // Product detail page
    if (pathname === "product" && pathnames[index + 1]) {
      const product = getProductById(pathnames[index + 1]);
      return product ? product.name : "Product";
    }

    // Order pages
    if (pathname === "order-confirmation") return "Order Confirmation";
    if (pathname === "orders" && pathnames[index + 1]) return "Order Details";
    if (pathname === "track-order") return "Track Order";

    // Convert pathname to readable format
    return pathname
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const breadcrumbs = [
    { name: "Home", path: "/" },
    ...pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join("/")}`;
      return {
        name: getBreadcrumbName(value, index),
        path: to,
      };
    }),
  ];

  return (
    <nav
      className="flex items-center gap-2 text-sm mb-6"
      aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.path} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                to={crumb.path}
                className="flex items-center gap-1 text-gray-600 hover:text-primary-600 transition-colors">
                <FiHome className="text-base" />
              </Link>
            ) : (
              <>
                <FiChevronRight className="text-gray-400 text-xs" />
                {isLast ? (
                  <span className="text-gray-800 font-semibold">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-gray-600 hover:text-primary-600 transition-colors">
                    {crumb.name}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
