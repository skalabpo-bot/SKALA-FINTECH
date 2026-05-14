
import React, { useState, useEffect, useRef } from 'react';
import { MockService } from '../services/mockService';
import { NewsItem } from '../types';
import { Megaphone, Plus, Trash, Upload, Loader2, Download, Eye, EyeOff } from 'lucide-react';
import html2canvas from 'html2canvas';

export const NewsPanel = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [newNews, setNewNews] = useState({ title: '', description: '', imageUrl: '' });
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    const refreshNews = async () => {
        setLoading(true);
        try {
            // En admin queremos ver las inactivas también para poder reactivarlas
            const data = await MockService.getNews(true);
            setNews(data);
        } catch (err) {
            console.error("Error loading news:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (item: NewsItem) => {
        const next = !(item.isActive !== false);
        try {
            await MockService.toggleNewsActive(item.id, next);
            setNews(prev => prev.map(n => n.id === item.id ? { ...n, isActive: next } : n));
        } catch (err: any) {
            console.error('Error toggle news:', err);
        }
    };

    useEffect(() => { refreshNews(); }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            const url = await MockService.uploadImage(e.target.files[0]);
            setNewNews(prev => ({ ...prev, imageUrl: url }));
            setUploading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newNews.title && newNews.description) {
            await MockService.addNews(newNews);
            await refreshNews();
            setNewNews({ title: '', description: '', imageUrl: '' });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar esta noticia?')) {
            await MockService.deleteNews(id);
            await refreshNews();
        }
    };

    const handleDownloadImage = async (newsItem: NewsItem) => {
        // Crear elemento temporal para renderizar
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '1080px';
        container.style.background = 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)';
        container.style.padding = '60px';
        container.style.fontFamily = 'Inter, system-ui, sans-serif';

        container.innerHTML = `
            <div style="background: white; border-radius: 40px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                <!-- Header con logo -->
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 50px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="background: white; width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#EA580C"/>
                                <path d="M2 17L12 22L22 17" stroke="#EA580C" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div>
                            <div style="color: white; font-size: 32px; font-weight: 900; letter-spacing: -0.02em;">SKALA</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">Fintech</div>
                        </div>
                    </div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 16px; font-weight: 600;">${new Date(newsItem.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>

                <!-- Imagen -->
                <div style="position: relative; width: 100%; height: 500px; overflow: hidden;">
                    <img src="${newsItem.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>

                <!-- Contenido -->
                <div style="padding: 50px;">
                    <h2 style="font-size: 42px; font-weight: 900; color: #1e293b; margin: 0 0 20px 0; line-height: 1.2;">${newsItem.title}</h2>
                    <p style="font-size: 20px; color: #64748b; line-height: 1.6; margin: 0;">${newsItem.description}</p>
                </div>

                <!-- Footer -->
                <div style="background: #f8fafc; padding: 30px 50px; border-top: 2px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">Un paso adelante 🚀</div>
                        <div style="color: #EA580C; font-size: 18px; font-weight: 700;">www.skalafintech.co</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, {
                backgroundColor: null,
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // Convertir canvas a blob y descargar
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `skala-${newsItem.title.toLowerCase().replace(/\s+/g, '-')}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            });
        } catch (err) {
            console.error('Error al generar imagen:', err);
            alert('Error al generar la imagen. Por favor intenta de nuevo.');
        } finally {
            document.body.removeChild(container);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40}/></div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
                <Megaphone size={24} className="text-primary"/> Gestión de Novedades
            </h3>
            
            <form onSubmit={handleAdd} className="mb-8 space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <input type="text" placeholder="Título" value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} className="w-full p-2 rounded border border-slate-300 bg-white text-slate-900" required />
                <textarea placeholder="Descripción" value={newNews.description} onChange={e => setNewNews({...newNews, description: e.target.value})} className="w-full p-2 rounded border border-slate-300 h-24 bg-white text-slate-900" required />
                <div className="flex gap-2">
                    <label className="flex-1 flex items-center gap-2 p-2 rounded border border-slate-300 bg-white cursor-pointer hover:bg-slate-50 text-slate-900">
                        <Upload size={16} className="text-slate-400"/>
                        <span className="text-slate-500 text-sm truncate">{newNews.imageUrl ? 'Imagen Cargada' : 'Subir Imagen'}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading}/>
                    </label>
                    <button type="submit" disabled={!newNews.imageUrl || uploading} className="bg-primary text-white p-2 rounded hover:bg-orange-700 px-6 font-bold disabled:opacity-50">Publicar</button>
                </div>
            </form>

            <div className="space-y-4">
                {news.length === 0 && <p className="text-center text-slate-500 py-10">No hay noticias publicadas.</p>}
                {news.map(n => {
                    const active = n.isActive !== false;
                    return (
                    <div key={n.id} className={`flex gap-4 items-center p-4 border rounded-xl transition-colors ${active ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                        <img src={n.imageUrl} alt="" className={`w-20 h-20 rounded-lg object-cover ${!active && 'grayscale'}`} />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-lg text-slate-800">{n.title}</p>
                                {!active && <span className="text-[9px] px-2 py-0.5 bg-slate-300 text-slate-700 rounded font-bold uppercase">Oculta</span>}
                            </div>
                            <p className="text-sm text-slate-500">{n.description}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => handleToggleActive(n)}
                                title={active ? 'Ocultar novedad (no se elimina)' : 'Mostrar de nuevo'}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`}/>
                            </button>
                            <button
                                onClick={() => handleDownloadImage(n)}
                                className="text-primary hover:bg-orange-50 p-2 rounded-full transition-colors"
                                title="Descargar para redes sociales"
                            >
                                <Download size={18}/>
                            </button>
                            <button onClick={() => handleDelete(n.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full" title="Eliminar permanentemente"><Trash size={18}/></button>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
};
