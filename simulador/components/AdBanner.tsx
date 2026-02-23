
import React, { useEffect, useState } from 'react';
import { getAdBySlot } from '../services/adService';
import { AdConfig } from '../types';

interface AdBannerProps {
  slotId: string;
  format?: 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, format = 'horizontal', className = '' }) => {
  const [adData, setAdData] = useState<AdConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadAd = async () => {
      const ad = await getAdBySlot(slotId);
      if (isMounted) {
        setAdData(ad);
        setLoading(false);
      }
    };
    loadAd();
    return () => { isMounted = false; };
  }, [slotId]);

  // Dimensions based on format
  const getDimensions = () => {
    switch (format) {
      case 'horizontal': return 'w-full h-24 md:h-32'; // Leaderboard
      case 'vertical': return 'w-40 h-[600px]'; // Skyscraper
      case 'rectangle': return 'w-full max-w-[336px] h-[280px]'; // Large Rectangle
      default: return 'w-full h-24';
    }
  };

  if (loading) {
    return <div className={`animate-pulse bg-slate-100 rounded-xl mx-auto ${getDimensions()} ${className}`}></div>;
  }

  // If dynamic ad exists and is active
  if (adData) {
    return (
      <div className={`rounded-xl overflow-hidden mx-auto shadow-sm transition-all duration-300 hover:shadow-md ${className} max-w-full flex justify-center bg-white`}>
         {adData.type === 'image' ? (
           <a 
             href={adData.linkUrl || '#'} 
             target="_blank" 
             rel="noopener noreferrer"
             className="block w-full h-full relative"
           >
             <img 
               src={adData.content} 
               alt={adData.name} 
               className="w-full h-full object-contain mx-auto" 
               // object-contain ensures the whole ad is visible, even if proportions mismatch
             />
           </a>
         ) : (
           <div 
             className="w-full h-full flex justify-center items-center overflow-hidden"
             dangerouslySetInnerHTML={{ __html: adData.content }} 
           />
         )}
      </div>
    );
  }

  // Default Placeholder (Fallback)
  return (
    <div className={`bg-slate-50/50 border border-slate-200 rounded-xl flex flex-col items-center justify-center overflow-hidden mx-auto ${getDimensions()} ${className}`}>
      <div className="text-center p-4">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Publicidad</p>
          <div className="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-2 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <p className="text-slate-300 text-[10px] font-mono">Espacio disponible para Anuncios</p>
          <p className="text-slate-300 text-[9px] font-mono mt-1 opacity-60">ID: {slotId}</p>
      </div>
    </div>
  );
};
