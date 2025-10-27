import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';

interface PDFPreviewProps {
  pdfBase64: string | null;
  height?: number;
}

export function PDFPreview({ pdfBase64, height = 800 }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);

  if (!pdfBase64) {
    return <div className="text-muted-foreground">No preview available</div>;
  }

  const pdfData = (() => {
    const binaryString = window.atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  })();

  return (
    <div className={`w-full h-[${height}px] overflow-auto border p-4`}>
      <div className="max-w-[210mm] mx-auto">
        <Document
          file={{ data: pdfData }}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div></div>}
          error={<div className="text-destructive">Failed to load PDF</div>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div key={index + 1} className="flex justify-center py-4">
              <Page pageNumber={index + 1} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}