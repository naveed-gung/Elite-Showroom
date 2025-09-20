import React from 'react';
import { AiFillGithub } from 'react-icons/ai';

const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-footer z-50 pointer-events-none">
      <div className="h-full flex items-center justify-center px-6">
        <div className="flex items-center space-x-4">
          <p className="body-elegant text-[hsl(0_0%_75%)] pointer-events-auto">
            © 2025 Elite Showroom
          </p>
          <a
            href="https://github.com/naveed-gung"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(0_0%_70%)] hover:text-foreground transition-colors pointer-events-auto hover-lift"
            aria-label="Visit our GitHub repository"
          >
            <AiFillGithub size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;