
import React, { useEffect, useState, useRef } from 'react';
import { Shield, Loader2, CheckCircle, XCircle, Clock, Send, ArrowRight, AlertTriangle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { ProductionService } from '../services/productionService';
import type { AuthorizationToken } from '../types';

interface Props {
    token: string;
}

type PageState = 'loading' | 'expired' | 'signed' | 'pending' | 'otp' | 'signing' | 'done' | 'error';

export const AutorizacionCentrales: React.FC<Props> = ({ token }) => {
    const [state, setState] = useState<PageState>('loading');
    const [auth, setAuth] = useState<AuthorizationToken | null>(null);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [phoneHint, setPhoneHint] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [countdown, setCountdown] = useState(5);
    const [otpSending, setOtpSending] = useState(false);
    const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'email'>('whatsapp');
    const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'done'>('idle');
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadAuthorization();
    }, [token]);

    useEffect(() => {
        if (state === 'done' && redirectUrl && countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (state === 'done' && redirectUrl && countdown === 0) {
            window.location.href = redirectUrl;
        }
    }, [state, redirectUrl, countdown]);

    const loadAuthorization = async () => {
        // Modo preview para visualizar el documento sin token real
        if (token === 'preview') {
            setAuth({
                id: 'preview',
                credit_id: 'preview',
                token: 'preview',
                status: 'pending',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                client_name: 'Juan Carlos Pérez García',
                client_document: '1.023.456.789',
                client_phone: '3101234567',
                client_email: 'juan.perez@correo.com',
                created_at: new Date().toISOString(),
            });
            setState('pending');
            return;
        }
        try {
            const data = await ProductionService.getAuthorizationByToken(token);
            if (!data) { setState('error'); setError('Autorización no encontrada.'); return; }
            setAuth(data as AuthorizationToken);
            if (data.status === 'expired') setState('expired');
            else if (data.status === 'signed') setState('signed');
            else setState('pending');
        } catch (err: any) {
            setState('error');
            setError(err.message || 'Error al cargar la autorización.');
        }
    };

    const handleRequestOtp = async () => {
        setOtpSending(true);
        setError('');
        try {
            const result = await ProductionService.requestAuthorizationOtp(token, otpChannel);
            setPhoneHint(result.phone_hint);
            setState('otp');
        } catch (err: any) {
            setError(err.message || 'Error al enviar el código.');
        } finally {
            setOtpSending(false);
        }
    };

    const generatePdfHtml = (signedAt: string, clientIp?: string) => {
        const signDate = new Date(signedAt).toLocaleString('es-CO', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        return `
        <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 700px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                <img src="${window.location.origin}/skala.png" alt="Skala" style="height: 40px; margin-bottom: 10px;" />
                <h1 style="font-size: 18px; margin: 5px 0;">AUTORIZACIÓN DE CONSULTA Y VALIDACIÓN DE IDENTIDAD</h1>
                <p style="font-size: 11px; color: #94a3b8;">SKALA S.A.S. — NIT 901.XXX.XXX-X</p>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin: 0 0 5px;">Titular</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${auth?.client_name}</p>
                <p style="font-size: 13px; margin: 5px 0 0;">Documento de identidad: <strong>${auth?.client_document}</strong></p>
            </div>

            <div style="font-size: 12px; line-height: 1.8; text-align: justify;">
                <p>Yo, <strong>${auth?.client_name}</strong>, identificado(a) con documento de identidad número <strong>${auth?.client_document}</strong>, en mi calidad de titular de la información, de manera libre, voluntaria, previa, expresa e informada, <strong>AUTORIZO</strong> a:</p>

                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <p style="font-weight: bold; margin: 0 0 10px;"><strong>SKALA S.A.S. y a sus entidades financieras aliadas</strong>, para realizar:</p>
                    <ul style="padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 8px;">Consulta, solicitud, procesamiento y reporte de mi información financiera, crediticia, comercial y de servicios ante <strong>centrales de riesgo</strong> (TransUnion/CIFIN, Experian/DataCrédito, Procrédito y cualquier otra operadora de información).</li>
                        <li style="margin-bottom: 8px;">Consulta en <strong>bases de datos de listas restrictivas</strong>, listas vinculantes, listas de control (OFAC, ONU, PEP) y cualquier otra base de datos orientada a la prevención de lavado de activos y financiación del terrorismo (LA/FT).</li>
                        <li style="margin-bottom: 8px;">Verificación de <strong>antecedentes judiciales, disciplinarios y fiscales</strong> ante las autoridades competentes.</li>
                        <li style="margin-bottom: 8px;"><strong>Validación de identidad</strong> por los medios que considere necesarios (biometría, preguntas de seguridad, verificación documental, entre otros).</li>
                        <li style="margin-bottom: 8px;">Cualquier otro <strong>proceso de verificación y análisis</strong> que sea necesario para la evaluación, aprobación, desembolso y seguimiento de mi solicitud de crédito.</li>
                    </ul>
                </div>

                <p><strong>Finalidad:</strong> La presente autorización tiene como finalidad la evaluación integral de mi solicitud de crédito de libranza, incluyendo pero no limitándose a: verificación de historial crediticio, capacidad de endeudamiento, comportamiento de pago, validación de identidad, prevención de fraude y cumplimiento de normativa LA/FT.</p>

                <p><strong>Vigencia:</strong> Esta autorización es válida hasta el <strong>${formattedExpiry}</strong> y podrá ser utilizada las veces que sea necesario durante dicho periodo para los fines aquí descritos.</p>

                <p><strong>Marco legal:</strong> La presente autorización se otorga en cumplimiento de la Ley 1266 de 2008 (Habeas Data Financiero), la Ley 1581 de 2012 (Protección de Datos Personales), el Decreto 1377 de 2013, y las disposiciones del SARLAFT en materia de prevención y control de lavado de activos.</p>

                <p><strong>Derechos del titular:</strong> Como titular de la información, tengo derecho a conocer, actualizar, rectificar y solicitar la supresión de mis datos, así como a revocar la presente autorización en cualquier momento, mediante comunicación escrita a datos@skalafintech.co.</p>
            </div>

            <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin-top: 25px;">
                <h3 style="color: #166534; margin: 0 0 12px; font-size: 14px;">✓ FIRMA ELECTRÓNICA</h3>
                <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #64748b; width: 180px;">Estado:</td><td style="padding: 4px 0; font-weight: bold; color: #166534;">FIRMADO</td></tr>
                    <tr><td style="padding: 4px 0; color: #64748b;">Fecha y hora de firma:</td><td style="padding: 4px 0; font-weight: bold;">${signDate}</td></tr>
                    <tr><td style="padding: 4px 0; color: #64748b;">Método de verificación:</td><td style="padding: 4px 0;">Código OTP enviado al celular ***${auth?.client_phone?.slice(-4)}</td></tr>
                    ${clientIp ? `<tr><td style="padding: 4px 0; color: #64748b;">Dirección IP:</td><td style="padding: 4px 0;">${clientIp}</td></tr>` : ''}
                    <tr><td style="padding: 4px 0; color: #64748b;">Token de autorización:</td><td style="padding: 4px 0; font-family: monospace; font-size: 10px;">${token}</td></tr>
                </table>
            </div>

            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="font-size: 9px; color: #94a3b8;">Documento generado electrónicamente por SKALA S.A.S. — Ley 1266 de 2008 · Ley 1581 de 2012</p>
                <p style="font-size: 9px; color: #94a3b8;">La firma electrónica tiene la misma validez y efectos jurídicos que la firma manuscrita, conforme a la Ley 527 de 1999.</p>
            </div>
        </div>`;
    };

    const handleVerify = async () => {
        if (otp.length !== 6) { setError('Ingresa el código de 6 dígitos.'); return; }
        setState('signing');
        setError('');
        try {
            // Obtener IP del cliente
            let clientIp = '';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                clientIp = ipData.ip;
            } catch { /* IP opcional */ }

            const result = await ProductionService.verifyAndSignAuthorization(token, otp, clientIp);
            if (result.validation_url) {
                setRedirectUrl(result.validation_url);
            }

            // Generar PDF del documento firmado
            setPdfStatus('generating');
            try {
                const pdfHtml = generatePdfHtml(result.signed_at, clientIp);
                const container = document.createElement('div');
                container.innerHTML = pdfHtml;
                document.body.appendChild(container);

                const pdfBlob = await html2pdf().set({
                    margin: [10, 10, 10, 10],
                    filename: `autorizacion_${auth?.client_document}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
                }).from(container).outputPdf('blob');

                document.body.removeChild(container);

                await ProductionService.uploadAuthorizationPdf(
                    result.auth_id,
                    auth!.credit_id,
                    pdfBlob,
                    auth!.client_name,
                    auth!.client_document,
                );
                setPdfStatus('done');
            } catch (pdfErr) {
                console.warn('Error generando PDF:', pdfErr);
                // No bloquear el flujo si falla el PDF
            }

            setState('done');
        } catch (err: any) {
            setState('otp');
            setError(err.message || 'Error al verificar el código.');
        }
    };

    const maskedPhone = auth?.client_phone
        ? '***' + auth.client_phone.slice(-4)
        : '****';

    const formattedExpiry = auth?.expires_at
        ? new Date(auth.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    // --- RENDER ---

    if (state === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-12 px-4">
                <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
                    <XCircle size={48} className="mx-auto text-red-500" />
                    <h1 className="text-xl font-black text-slate-800">Error</h1>
                    <p className="text-sm text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    if (state === 'expired') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-12 px-4">
                <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
                    <Clock size={48} className="mx-auto text-orange-500" />
                    <h1 className="text-xl font-black text-slate-800">Autorización expirada</h1>
                    <p className="text-sm text-slate-600">
                        Esta autorización venció el {formattedExpiry}. Contacta a tu asesor para que te envíe una nueva.
                    </p>
                </div>
            </div>
        );
    }

    if (state === 'signed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
                <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
                    <CheckCircle size={48} className="mx-auto text-green-500" />
                    <h1 className="text-xl font-black text-slate-800">Autorización ya firmada</h1>
                    <p className="text-sm text-slate-600">
                        Esta autorización fue firmada el {auth?.signed_at ? new Date(auth.signed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}.
                    </p>
                </div>
            </div>
        );
    }

    if (state === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
                <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
                    <CheckCircle size={56} className="mx-auto text-green-500" />
                    <h1 className="text-2xl font-black text-slate-800">Autorización firmada exitosamente</h1>
                    <p className="text-sm text-slate-600">
                        Tu autorización de consulta y validación de identidad ha sido registrada correctamente.
                    </p>
                    {redirectUrl ? (
                        <div className="space-y-3 pt-4">
                            <p className="text-sm text-slate-500">
                                Serás redirigido a la validación de identidad en <span className="font-black text-orange-600">{countdown}</span> segundos...
                            </p>
                            <a
                                href={redirectUrl}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
                            >
                                Ir ahora <ArrowRight size={16} />
                            </a>
                        </div>
                    ) : (
                        <p className="text-sm text-green-600 font-medium">Puedes cerrar esta página.</p>
                    )}
                </div>
            </div>
        );
    }

    // state === 'pending' | 'otp' | 'signing'
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8">
                    {/* Header con logo */}
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                        <img src="/skala.png" alt="Skala" className="h-10 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-800">Autorización de Consulta y Validación de Identidad</h1>
                            <p className="text-sm text-slate-400 font-bold">SKALA S.A.S.</p>
                        </div>
                    </div>

                    {/* Datos del titular */}
                    <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Titular</p>
                        <p className="text-lg font-black text-slate-800">{auth?.client_name}</p>
                        <p className="text-sm text-slate-600">Documento de identidad: <span className="font-bold">{auth?.client_document}</span></p>
                    </div>

                    {/* Contenido legal */}
                    <section className="space-y-4 text-sm text-slate-700 leading-relaxed text-justify">
                        <p>
                            Yo, <strong>{auth?.client_name}</strong>, identificado(a) con documento de identidad número <strong>{auth?.client_document}</strong>,
                            en mi calidad de titular de la información, de manera libre, voluntaria, previa, expresa e informada, <strong>AUTORIZO</strong> a:
                        </p>

                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                            <p className="font-bold text-slate-800">SKALA S.A.S. y a sus entidades financieras aliadas, para realizar:</p>
                            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-600">
                                <li>Consulta, solicitud, procesamiento y reporte de mi información financiera, crediticia, comercial y de servicios ante <strong>centrales de riesgo</strong> (TransUnion/CIFIN, Experian/DataCrédito, Procrédito y cualquier otra operadora de información).</li>
                                <li>Consulta en <strong>bases de datos de listas restrictivas</strong>, listas vinculantes, listas de control (OFAC, ONU, PEP) y cualquier otra base de datos orientada a la prevención de lavado de activos y financiación del terrorismo (LA/FT).</li>
                                <li>Verificación de <strong>antecedentes judiciales, disciplinarios y fiscales</strong> ante las autoridades competentes.</li>
                                <li><strong>Validación de identidad</strong> por los medios que considere necesarios (biometría, preguntas de seguridad, verificación documental, entre otros).</li>
                                <li>Cualquier otro <strong>proceso de verificación y análisis</strong> que sea necesario para la evaluación, aprobación, desembolso y seguimiento de mi solicitud de crédito.</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-slate-800">Finalidad</h3>
                            <p>
                                La presente autorización tiene como finalidad la <strong>evaluación integral de mi solicitud de crédito de libranza</strong>,
                                incluyendo pero no limitándose a: verificación de historial crediticio, capacidad de endeudamiento, comportamiento de pago,
                                validación de identidad, prevención de fraude y cumplimiento de normativa LA/FT.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-slate-800">Vigencia</h3>
                            <p>
                                Esta autorización es válida hasta el <strong>{formattedExpiry}</strong> y podrá ser utilizada las veces que sea necesario durante dicho periodo para los fines aquí descritos.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-slate-800">Marco legal</h3>
                            <p>
                                La presente autorización se otorga en cumplimiento de la <strong>Ley 1266 de 2008</strong> (Habeas Data Financiero),
                                la <strong>Ley 1581 de 2012</strong> (Protección de Datos Personales), el <strong>Decreto 1377 de 2013</strong>,
                                y las disposiciones del <strong>SARLAFT</strong> en materia de prevención y control de lavado de activos.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-slate-800">Derechos del titular</h3>
                            <p>
                                Como titular de la información, tengo derecho a conocer, actualizar, rectificar y solicitar la supresión de mis datos,
                                así como a revocar la presente autorización en cualquier momento, mediante comunicación escrita a <strong>datos@skalafintech.co</strong>.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                <strong>Verificación de identidad:</strong> Para garantizar la autenticidad de esta autorización, se verificará
                                mediante un código OTP (One-Time Password) enviado al celular registrado ({maskedPhone}).
                            </p>
                        </div>
                    </section>

                    {/* Acción: Solicitar OTP o Verificar */}
                    <div className="border-t border-slate-100 pt-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                                <p className="text-xs text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {state === 'pending' && (
                            <div className="text-center space-y-5">
                                <p className="text-sm text-slate-600">
                                    Elige cómo deseas recibir tu código de verificación:
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setOtpChannel('whatsapp')}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                            otpChannel === 'whatsapp'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => setOtpChannel('email')}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                            otpChannel === 'email'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        Correo electrónico
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">
                                    {otpChannel === 'whatsapp'
                                        ? `Se enviará al WhatsApp terminado en ***${auth?.client_phone?.slice(-4)}`
                                        : `Se enviará a ${auth?.client_email ? auth.client_email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'tu correo registrado'}`
                                    }
                                </p>
                                <button
                                    onClick={handleRequestOtp}
                                    disabled={otpSending || (otpChannel === 'email' && !auth?.client_email)}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                                >
                                    {otpSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    {otpSending ? 'Enviando...' : 'Solicitar código de verificación'}
                                </button>
                                {otpChannel === 'email' && !auth?.client_email && (
                                    <p className="text-xs text-red-500">No hay correo registrado. Usa WhatsApp.</p>
                                )}
                            </div>
                        )}

                        {(state === 'otp' || state === 'signing') && (
                            <div className="max-w-sm mx-auto space-y-4">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700">Ingresa el código enviado {otpChannel === 'whatsapp' ? `al WhatsApp ***${auth?.client_phone?.slice(-4)}` : `a ${auth?.client_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') || 'tu correo'}`}</p>
                                    <p className="text-xs text-slate-400 mt-1">El código expira en 10 minutos</p>
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 border-2 border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                                    autoFocus
                                />
                                <button
                                    onClick={handleVerify}
                                    disabled={state === 'signing' || otp.length !== 6}
                                    className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                                >
                                    {state === 'signing' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    {state === 'signing' ? 'Verificando...' : 'Autorizo la consulta'}
                                </button>
                                <button
                                    onClick={handleRequestOtp}
                                    disabled={otpSending}
                                    className="w-full text-xs text-slate-400 hover:text-slate-600 font-bold py-2"
                                >
                                    {otpSending ? 'Reenviando...' : 'Reenviar código'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-slate-400 mt-6">
                    Documento generado por SKALA S.A.S. — Ley 1266 de 2008 · Ley 1581 de 2012
                </p>
            </div>
        </div>
    );
};
