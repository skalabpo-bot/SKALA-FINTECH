
import React, { useState, useEffect } from 'react';
import { User, Zone, etiquetaRol } from '../types';
import { MockService } from '../services/mockService';
import { Save, User as UserIcon, Phone, Mail, Camera, Loader2, CreditCard, MapPin } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  onUpdate: (user: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdate }) => {
  const [formData, setFormData] = useState<User>({ ...currentUser });
  const [msg, setMsg] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        const [zData, cData, bData] = await Promise.all([MockService.getZones(), MockService.getCities(), MockService.getBanks()]);
        setZones(zData);
        setCities(cData);
        setBanks(bData);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Los documentos solo se podían subir al registrarse. Si el asesor cambiaba de cuenta o su
  // certificación bancaria quedó mal, dependía de que un admin se los cambiara. Aquí puede
  // resubirlos él mismo; se reemplaza únicamente el tipo que suba.
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoDoc(tipo);
    try {
      const url = await MockService.uploadImage(file);
      setFormData(prev => ({
        ...prev,
        documents: [...((prev.documents || []) as any[]).filter((d: any) => d.type !== tipo), { name: file.name, url, type: tipo }],
      }) as any);
      setMsg('Documento cargado. Recuerda guardar los cambios.');
      setTimeout(() => setMsg(''), 4000);
    } catch {
      alert('No se pudo subir el documento. Intenta de nuevo.');
    } finally {
      setSubiendoDoc(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
        const updated = await MockService.updateUserProfile(currentUser.id, formData);
        if(updated) { 
            onUpdate(updated); 
            setMsg('Perfil actualizado con éxito.'); 
            setTimeout(() => setMsg(''), 3000); 
        }
    } catch (err) {
        alert("Error al actualizar perfil.");
    } finally {
        setIsBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
        <h2 className="text-3xl font-display font-bold text-slate-800">Mi Perfil</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-6 mb-8 border-b pb-6">
                <img src={formData.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"/>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{formData.name}</h3>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{etiquetaRol(formData.role)}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre</label><input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900" disabled/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Cédula</label><input name="cedula" value={formData.cedula} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Celular</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"/></div>
                
                <div className="md:col-span-2"><h4 className="font-bold text-slate-800 border-b pb-2 mt-4 mb-2 flex items-center gap-2"><MapPin size={16}/> Ubicación</h4></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Ciudad</label><select name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"><option value="">Seleccione</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Supervisor Asignado</label><select name="zoneId" value={formData.zoneId} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"><option value="">Seleccione</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>

                <div className="md:col-span-2"><h4 className="font-bold text-slate-800 border-b pb-2 mt-4 mb-2 flex items-center gap-2"><CreditCard size={16}/> Datos Bancarios</h4></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Banco</label><select name="banco" value={formData.banco} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"><option value="">Seleccione</option>{banks.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Tipo Cuenta</label><select name="tipoCuenta" value={formData.tipoCuenta} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"><option value="AHORROS">AHORROS</option><option value="CORRIENTE">CORRIENTE</option></select></div>
                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Número Cuenta</label><input name="numeroCuenta" value={formData.numeroCuenta} onChange={handleChange} className="w-full p-2 border rounded bg-white text-slate-900"/></div>

                <div className="md:col-span-2"><h4 className="font-bold text-slate-800 border-b pb-2 mt-4 mb-2 flex items-center gap-2"><CreditCard size={16}/> Mis Documentos</h4></div>
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'RUT', 'CERTIFICACION_BANCARIA'].map(tipo => {
                    const doc = ((formData.documents || []) as any[]).find((d: any) => d.type === tipo);
                    return (
                      <div key={tipo} className={`p-3 border-2 border-dashed rounded-2xl flex flex-col items-center gap-1 text-center ${doc ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{tipo.replace(/_/g, ' ')}</span>
                        {doc
                          ? <a href={doc.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline truncate max-w-full">ver actual</a>
                          : <span className="text-[10px] text-amber-600 font-bold">falta</span>}
                        <label className="cursor-pointer text-[10px] font-black px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-primary hover:text-white transition-colors">
                          {subiendoDoc === tipo ? 'SUBIENDO…' : (doc ? 'CAMBIAR' : 'SUBIR')}
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => handleDocUpload(e, tipo)} disabled={subiendoDoc !== null} />
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="md:col-span-2 pt-4">
                    {msg && <p className="text-green-600 font-bold text-center mb-2">{msg}</p>}
                    <button type="submit" disabled={isBusy} className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 disabled:opacity-50">
                        {isBusy ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
