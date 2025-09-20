import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-navbar z-50 pointer-events-none">
      <div className="h-full flex items-center justify-center">
        <h1 className="title-display text-luxury pointer-events-auto">
          Elite Showroom
        </h1>
      </div>
    </nav>
  );
};

export default Navbar;