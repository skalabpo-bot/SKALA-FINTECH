
import React, { useEffect, useState } from 'react';
import { getAdBySlot } from '../services/adService';
import { AdConfig } from '../types';

export const PopupAd: React.FC = () => {
  const [ad, setAd] = useState<AdConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkPopup = async () => {
      // Look for specific slot ID for popups
      const popupAd = await getAdBySlot('popup-startup');
      if (popupAd) {
        // Simple delay to make it feel natural after app load
        setTimeout(() => {
            setAd(popupAd);
            setIsVisible(true);
        }, 1000);
      }
    };
    checkPopup();
  }, []);

  if (!isVisible || !ad) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setIsVisible(false)}
      ></div>
      
      <div className="relative bg-transparent max-w-lg w-full transform transition-all animate-scale-up flex flex-col items-center">
        {/* Close Button Outside */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-12 right-0 md:-right-10 text-white/80 hover:text-white transition-colors p-2 bg-white/10 rounded-full md:bg-transparent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative w-full">
            {ad.type === 'image' ? (
                <a 
                    href={ad.linkUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block relative group bg-black"
                    onClick={() => setIsVisible(false)} // Close on click
                >
                    <img 
                        src={ad.content} 
                        alt={ad.name} 
                        className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                    />
                    {ad.linkUrl && (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                            <span className="bg-primary-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg hover:bg-primary-500 transition-colors">
                                Ver Más Información
                            </span>
                        </div>
                    )}
                </a>
            ) : (
                <div 
                    className="p-4 bg-white min-h-[300px] flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: ad.content }}
                />
            )}
        </div>
      </div>
    </div>
  );
};
