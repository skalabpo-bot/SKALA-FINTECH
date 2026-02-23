
import React, { useState, useEffect } from 'react';
import { getRateLimitStatus } from '../services/geminiService';
import { verifyCredentials } from '../services/authService';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isAdmin, onToggleAdmin }) => {
  const [apiStatus, setApiStatus] = useState({ remaining: 10, limit: 10, model: 'Gemini 3 Flash' });
  
  // Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Privacy Policy Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Secret Click Counter
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Polling para actualizar el estado del límite de velocidad en tiempo real
  useEffect(() => {
    const checkStatus = () => {
      const status = getRateLimitStatus();
      setApiStatus({
        remaining: status.remaining,
        limit: status.limit,
        model: status.modelName
      });
    };

    checkStatus(); // Check immediate
    const interval = setInterval(checkStatus, 2000); // Check every 2s

    return () => clearInterval(interval);
  }, []);

  // SECRET KEYBOARD SHORTCUT LISTENER (Ctrl + Shift + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        handleAdminTrigger();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, showLoginModal]);

  const handleAdminTrigger = () => {
    if (isAdmin) {
      if (onToggleAdmin) onToggleAdmin(); // Logout directo si ya es admin
    } else {
      setShowLoginModal(true); // Abrir modal login
      setLoginError('');
      setUsername('');
      setPassword('');
    }
  };

  // Secret Triple Click Handler
  const handleSecretClick = () => {
    if (secretClickCount + 1 >= 3) {
      handleAdminTrigger();
      setSecretClickCount(0);
    } else {
      setSecretClickCount(prev => prev + 1);
      // Reset counter after 1 second to ensure clicks are fast
      setTimeout(() => setSecretClickCount(0), 1000);
    }
  };

  // Determinar color del estado
  const getStatusColor = () => {
    if (apiStatus.remaining === 0) return 'bg-red-500 animate-pulse';
    if (apiStatus.remaining < 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const isValid = await verifyCredentials(username.trim(), password.trim());
      
      if (isValid) {
        if (onToggleAdmin) onToggleAdmin();
        setShowLoginModal(false);
      } else {
        setLoginError('Usuario o contraseña incorrectos.');
      }
    } catch (error) {
      setLoginError('Error de conexión. Intente nuevamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Styles helpers
  const inputContainerClass = "group space-y-2";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 group-focus-within:text-slate-800 transition-colors";
  const inputClass = "block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-bold text-lg shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className={`${isAdmin ? 'bg-slate-900' : 'bg-primary-900'} text-white shadow-lg sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 ${isAdmin ? 'text-red-500' : 'text-primary-500'}`}>
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
            </svg>
            <div>
              <h1 className="text-xl font-bold tracking-tight">LibranzaExacta <span className={`${isAdmin ? 'text-red-500' : 'text-primary-500'}`}>Pro</span></h1>
              <p className="text-xs text-slate-300">
                {isAdmin ? 'ADMINISTRADOR DEL SISTEMA' : 'Sistema de Simulación Certificado'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* API Monitor Widget - Visible to Users */}
             {!isAdmin && (
               <div className="hidden lg:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider leading-none">Motor IA</span>
                    <span className="text-xs font-mono font-bold leading-tight text-white">
                      {apiStatus.model} <span className="text-slate-400">|</span> {apiStatus.remaining}/{apiStatus.limit} RPM
                    </span>
                  </div>
               </div>
             )}

             {/* Secret Trigger Area: Version Number */}
             <div 
                className="text-xs text-slate-400 hidden md:block mr-2 border-l border-white/10 pl-4 cursor-default select-none hover:text-slate-200 transition-colors"
                onClick={handleSecretClick}
                title="v2.7.3 - Stable Gemini 3 Models"
             >
               v2.7.3
             </div>

             {/* Logout button ONLY visible if already logged in as Admin */}
             {isAdmin && (
               <button 
                 onClick={handleAdminTrigger}
                 className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-red-900/30 text-red-200 border-red-800 hover:bg-red-900 hover:border-red-500"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  SALIR
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {children}
      </main>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLoginModal(false)}></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-6 flex justify-between items-center">
               <h3 className="text-slate-800 font-extrabold text-xl flex items-center gap-2">
                 <div className="bg-red-50 p-2 rounded-xl text-red-500 shadow-sm border border-red-100">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                 </div>
                 Acceso Administrativo
               </h3>
               <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 hover:bg-red-50 p-2 rounded-full">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="p-8 space-y-6 bg-white">
              {/* Username Field */}
              <div className={inputContainerClass}>
                <label className={labelClass}>Email / Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors">
                      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                    placeholder="admin@empresa.com"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className={inputContainerClass}>
                <label className={labelClass}>Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3 border border-red-100 animate-shake">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                   <span className="font-medium">{loginError}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 text-lg mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
            
            {/* Disclaimer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
               <p className="text-xs text-slate-400 font-medium">
                 Este acceso es exclusivo para personal autorizado. <br/>
                 Su dirección IP será registrada por seguridad.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setShowPrivacyModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20 animate-scale-up">
              
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                     </svg>
                     Política de Privacidad y Términos
                  </h3>
                  <button onClick={() => setShowPrivacyModal(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </button>
              </div>

              <div className="p-8 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
                      <p className="font-bold mb-1">Resumen:</p>
                      <p>Somos una herramienta de cálculo gratuita para el usuario. No guardamos sus datos. Las entidades financieras pagan una suscripción para aparecer como opción en las simulaciones.</p>
                  </div>

                  <section>
                      <h4 className="font-bold text-slate-900 text-base mb-2">1. Naturaleza del Servicio</h4>
                      <p>
                        LibranzaExacta Pro es una plataforma tecnológica que facilita la simulación de créditos bajo la modalidad de libranza. 
                        El servicio es <strong>totalmente gratuito para los usuarios finales</strong> (personas naturales) que deseen realizar cálculos de capacidad de endeudamiento.
                      </p>
                  </section>

                  <section>
                      <h4 className="font-bold text-slate-900 text-base mb-2">2. Protección de Datos y Privacidad</h4>
                      <p className="mb-2">
                        La privacidad y seguridad de su información es nuestra prioridad absoluta. Por ello declaramos explícitamente que:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 marker:text-primary-500">
                         <li><strong>No almacenamos</strong> copias de los desprendibles de nómina cargados.</li>
                         <li><strong>No guardamos</strong> información personal identificable (nombres, cédulas) en nuestras bases de datos.</li>
                         <li>El análisis de los documentos se realiza en tiempo real mediante Inteligencia Artificial y los datos se descartan inmediatamente después de mostrar el resultado en su pantalla.</li>
                      </ul>
                  </section>

                  <section>
                      <h4 className="font-bold text-slate-900 text-base mb-2">3. Exención de Responsabilidad</h4>
                      <p>
                        LibranzaExacta Pro actúa exclusivamente como una calculadora avanzada. 
                        <strong className="block mt-1 text-slate-800">Importante:</strong>
                      </p>
                      <ul className="list-disc pl-5 space-y-1 marker:text-red-500 mt-2">
                         <li>No somos responsables de la veracidad de la información contenida en los documentos subidos por el usuario.</li>
                         <li>Los resultados son <strong>simulaciones aproximadas</strong> basadas en la normativa vigente (Ley 1527), pero no constituyen una oferta comercial vinculante ni una aprobación de crédito.</li>
                         <li>La aprobación final depende exclusivamente de las políticas de riesgo de la entidad financiera seleccionada.</li>
                      </ul>
                  </section>

                  <section>
                      <h4 className="font-bold text-slate-900 text-base mb-2">4. Modelo Comercial y Publicidad</h4>
                      <p>
                         Nuestra plataforma se sostiene mediante un modelo de suscripción empresarial. Las Entidades Financieras, Cooperativas y Bancos pagan una tarifa para:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                          <li>Aparecer listadas en el módulo de simulación.</li>
                          <li>Mostrar publicidad y banners informativos dentro de la aplicación.</li>
                      </ul>
                      <p className="mt-2">
                         El usuario tiene la libertad de elegir con qué entidad desea realizar la simulación o comparar entre las opciones disponibles que cuenten con convenio vigente en la plataforma.
                      </p>
                  </section>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setShowPrivacyModal(false)} className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-colors">
                      Entendido
                  </button>
              </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="font-bold text-slate-200">LibranzaExacta Pro</p>
            <p className="text-xs mt-1">© {new Date().getFullYear()} Desarrollado por Camilo Moncada. Todos los derechos reservados.</p>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-medium">
             <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors border-b border-transparent hover:border-slate-500 pb-0.5">
               Política de Privacidad
             </button>
             <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors border-b border-transparent hover:border-slate-500 pb-0.5">
               Términos de Uso
             </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
