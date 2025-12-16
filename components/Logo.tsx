import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 320 130" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      role="img" 
      aria-label="JCI Chiayi Logo"
    >
      {/* JCI Text - Heavy Italic */}
      <text 
        x="5" 
        y="85" 
        fontFamily="Arial, Helvetica, sans-serif" 
        fontWeight="900" 
        fontStyle="italic" 
        fontSize="95" 
        fill="#0099D8"
        letterSpacing="-3"
      >
        JCI
      </text>

      {/* JCI Shield Emblem - Detailed Vector */}
      <g transform="translate(160, 10) scale(0.75)">
         <path fill="#0099D8" d="M48.8,98.6C19.9,81.4,5,56.5,5,35.2V13.5l43.8-9l43.8,9v21.7C92.6,56.5,77.7,81.4,48.8,98.6z M48.8,11.7L18.4,17.9v17.3c0,16.2,11.8,35.9,30.4,49.5c18.6-13.6,30.4-33.3,30.4-49.5V17.9L48.8,11.7z"/>
         <path fill="#0099D8" d="M48.8,76.5c-18.1,0-32.8-14.7-32.8-32.8S30.7,10.9,48.8,10.9s32.8,14.7,32.8,32.8S66.9,76.5,48.8,76.5z M48.8,16.9c-14.8,0-26.8,12-26.8,26.8S34,70.5,48.8,70.5s26.8-12,26.8-26.8S63.6,16.9,48.8,16.9z"/>
         {/* Globe lines */}
         <path fill="#0099D8" d="M48.8,20.9v10.8c0,0-9.6,1.2-14.4,12H23.9C25.4,32.5,35.8,22.4,48.8,20.9z"/>
         <path fill="#0099D8" d="M48.8,66.5V55.7c0,0,9.6-1.2,14.4-12h10.5C72.2,54.9,61.8,65,48.8,66.5z"/>
         <path fill="#0099D8" d="M23.9,43.7h10.5c4.8,10.8,14.4,12,14.4,12v10.8C35.8,65,25.4,54.9,23.9,43.7z"/>
         <path fill="#0099D8" d="M73.7,43.7H63.2c-4.8-10.8-14.4-12-14.4-12V20.9C61.8,22.4,72.2,32.5,73.7,43.7z"/>
      </g>
      
      {/* TM Symbol */}
      <text x="240" y="60" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#0099D8">TM</text>

      {/* Chiayi Text - Orange */}
      <text 
        x="10" 
        y="120" 
        fontFamily="Arial, Helvetica, sans-serif" 
        fontWeight="bold" 
        fontSize="34" 
        fill="#F38B00" 
        letterSpacing="2"
      >
        Chiayi
      </text>
    </svg>
  );
};
