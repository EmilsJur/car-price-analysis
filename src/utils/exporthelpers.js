export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  
  // Get all keys from the first object
  const keys = Object.keys(data[0]);
  
  // Create CSV header
  const csvHeader = keys.join(',');
  
  // Create CSV rows
  const csvRows = data.map(item => 
    keys.map(key => {
      const value = item[key];
      // Handle values with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',')
  );
  
  // Combine header and rows
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async (data, filename, title) => {
  // Note: You'll need to install jsPDF: npm install jspdf
  // Uncomment and use when needed
  
  /*
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(title, 20, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  // Add data
  let yPosition = 50;
  
  data.forEach((item) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.text(`${item.brand} ${item.model} (${item.year})`, 20, yPosition);
    doc.text(`€${item.price.toLocaleString()}`, 150, yPosition);
    yPosition += 10;
  });
  
  // Save the PDF
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  */
};