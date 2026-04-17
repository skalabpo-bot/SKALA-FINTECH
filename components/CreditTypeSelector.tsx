import React from 'react';
import { Building2, Car, Home, ArrowRight, Clock } from 'lucide-react';

interface CreditTypeSelectorProps {
  onSelect: (type: string) => void;
}

const creditTypes = [
  {
    id: 'libranza',
    name: 'Libranza',
    description: 'Crédito con descuento directo de nómina o pensión. Ideal para empleados y pensionados.',
    icon: Building2,
    available: true,
    gradient: 'from-primary to-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
  },
  {
    id: 'hipotecario',
    name: 'Crédito Hipotecario',
    description: 'Financiación para compra de vivienda nueva o usada. Tasas competitivas a largo plazo.',
    icon: Home,
    available: false,
    gradient: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'vehiculo',
    name: 'Crédito de Vehículo',
    description: 'Financiación para vehículo nuevo o usado. Aprobación rápida con tasa preferencial.',
    icon: Car,
    available: false,
    gradient: 'from-emerald-500 to-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
  },
];

export const CreditTypeSelector: React.FC<CreditTypeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">Nuevo Crédito</h1>
        <p className="text-sm text-slate-500 font-medium">Selecciona el tipo de crédito que deseas gestionar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {creditTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => type.available && onSelect(type.id)}
            className={`relative rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
              type.available
                ? `${type.borderColor} hover:shadow-xl hover:scale-[1.02] cursor-pointer`
                : 'border-slate-200 opacity-75 cursor-default'
            }`}
          >
            {/* Header con gradiente */}
            <div className={`bg-gradient-to-br ${type.gradient} p-6 pb-8 relative`}>
              {!type.available && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Clock size={12} className="text-white" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Próximamente</span>
                </div>
              )}
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                <type.icon size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-white">{type.name}</h3>
            </div>

            {/* Body */}
            <div className={`p-6 ${type.bgLight}`}>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{type.description}</p>
              {type.available ? (
                <button className={`w-full bg-gradient-to-r ${type.gradient} text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg`}>
                  Iniciar Solicitud <ArrowRight size={16} />
                </button>
              ) : (
                <div className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold text-sm text-center">
                  Disponible próximamente
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
