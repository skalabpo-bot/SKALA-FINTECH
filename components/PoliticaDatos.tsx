
import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export const PoliticaDatos: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={16} /> Volver
        </a>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Política de Tratamiento de Datos Personales</h1>
              <p className="text-sm text-slate-400 font-bold">SKALA S.A.S. — NIT 901.XXX.XXX-X</p>
            </div>
          </div>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">1. Responsable del Tratamiento</h2>
            <p>
              <strong>SKALA S.A.S.</strong> (en adelante "SKALA"), con domicilio en Colombia, es el responsable del tratamiento de los datos personales recolectados a través de su plataforma tecnológica, en cumplimiento de la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong>.
            </p>
            <p>Correo de contacto: <strong>datos@skala.co</strong></p>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">2. Finalidades del Tratamiento</h2>
            <p>Los datos personales serán tratados para las siguientes finalidades:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Gestionar el registro y autenticación de usuarios en la plataforma (gestores, supervisores, analistas y administradores).</li>
              <li>Verificar la identidad del titular mediante documentos de identificación (cédula de ciudadanía, RUT, certificación bancaria).</li>
              <li>Facilitar la intermediación y gestión de créditos de libranza entre gestores comerciales y entidades financieras.</li>
              <li>Realizar el cálculo, simulación y radicación de solicitudes de crédito.</li>
              <li>Gestionar pagos de comisiones y transferencias bancarias a los gestores.</li>
              <li>Enviar notificaciones relacionadas con el estado de los créditos, cambios en las solicitudes y comunicaciones operativas.</li>
              <li>Cumplir con obligaciones legales, regulatorias y contractuales aplicables.</li>
              <li>Realizar análisis estadísticos internos para la mejora de la plataforma.</li>
            </ul>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">3. Datos Recolectados</h2>
            <p>SKALA recolecta los siguientes datos personales:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Datos de identificación:</strong> nombre completo, número de cédula de ciudadanía, correo electrónico, número de celular.</li>
              <li><strong>Datos financieros:</strong> información bancaria (banco, tipo de cuenta, número de cuenta) para el pago de comisiones.</li>
              <li><strong>Documentos:</strong> fotografía de cédula de ciudadanía (frontal y posterior), Registro Único Tributario (RUT), certificación bancaria.</li>
              <li><strong>Datos de ubicación:</strong> ciudad de operación.</li>
              <li><strong>Datos de uso:</strong> registros de actividad dentro de la plataforma, historial de créditos gestionados.</li>
            </ul>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">4. Derechos del Titular</h2>
            <p>De conformidad con la Ley 1581 de 2012, el titular de los datos tiene derecho a:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales.</li>
              <li><strong>Solicitar prueba</strong> de la autorización otorgada.</li>
              <li><strong>Ser informado</strong> sobre el uso que se ha dado a sus datos.</li>
              <li><strong>Revocar</strong> la autorización y/o solicitar la supresión de los datos cuando no se respeten los principios, derechos y garantías constitucionales y legales.</li>
              <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
              <li><strong>Acceder de forma gratuita</strong> a los datos personales que hayan sido objeto de tratamiento.</li>
            </ul>
            <p>Para ejercer estos derechos, el titular podrá enviar su solicitud al correo <strong>datos@skala.co</strong>.</p>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">5. Seguridad de la Información</h2>
            <p>
              SKALA implementa medidas técnicas, humanas y administrativas necesarias para proteger los datos personales contra acceso no autorizado, pérdida, alteración o destrucción. Los datos se almacenan en servidores seguros con cifrado y acceso controlado.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">6. Transferencia y Transmisión de Datos</h2>
            <p>
              Los datos personales podrán ser transmitidos a entidades financieras aliadas únicamente con el propósito de gestionar las solicitudes de crédito radicadas a través de la plataforma. SKALA garantiza que dichas entidades cumplen con estándares adecuados de protección de datos.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">7. Vigencia</h2>
            <p>
              Los datos personales serán tratados durante el tiempo que sea necesario para cumplir con las finalidades descritas y durante el plazo que establezcan las normas aplicables. Una vez cumplida la finalidad, los datos serán suprimidos de las bases de datos de SKALA.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-lg font-black text-slate-800">8. Autorización</h2>
            <p>
              Al registrarse en la plataforma y aceptar la presente política, el titular <strong>autoriza de manera libre, expresa, previa e informada</strong> a SKALA para recolectar, almacenar, usar, circular, suprimir y en general tratar sus datos personales conforme a las finalidades aquí descritas y de acuerdo con la Ley 1581 de 2012.
            </p>
          </section>

          <div className="bg-slate-50 rounded-2xl p-6 text-xs text-slate-500 leading-relaxed border border-slate-100">
            <p className="font-bold text-slate-600 mb-2">Marco Legal Aplicable:</p>
            <ul className="space-y-1">
              <li>• Constitución Política de Colombia, Artículo 15 (Derecho a la intimidad)</li>
              <li>• Ley 1581 de 2012 (Protección de Datos Personales)</li>
              <li>• Decreto 1377 de 2013 (Reglamentación parcial Ley 1581)</li>
              <li>• Ley 1266 de 2008 (Habeas Data Financiero)</li>
            </ul>
            <p className="mt-4">Última actualización: Marzo 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
