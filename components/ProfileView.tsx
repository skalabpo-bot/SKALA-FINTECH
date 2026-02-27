
import React, { useState, useEffect } from 'react';
import { User, Zone } from '../types';
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
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{formData.role}</span>
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
