import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FacturacionView: React.FC = () => {
  const generarFactura = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Factura', 14, 20);
    autoTable(doc, {
      head: [['SKU', 'Cantidad', 'Precio']],
      body: [
        ['PROD1', '1', '$100'],
        ['PROD2', '2', '$200']
      ],
      startY: 30
    });
    doc.save('factura.pdf');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Facturación</h2>
      <button
        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
        onClick={generarFactura}
      >
        Generar PDF
      </button>
    </div>
  );
};

export default FacturacionView;
