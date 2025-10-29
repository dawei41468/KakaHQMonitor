import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';

interface ContractPreviewProps {
  pdfBase64?: string | null;
  htmlString?: string | null;
  height?: number;
}

export function ContractPreview({ pdfBase64, htmlString, height = 500 }: ContractPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shadowRef = useRef<any>(null);

  useEffect(() => {
    if (shadowRef.current && htmlString) {
      const shadow = shadowRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = htmlString;
      const style = document.createElement('style');
      style.textContent = `
        html {
          transform: scale(0.8);
          transform-origin: top left;
        }
      `;
      shadow.appendChild(style);
    }
  }, [htmlString]);

  if (!htmlString && !pdfBase64) {
    return <div className="text-muted-foreground">No preview available</div>;
  }

  // Prefer HTML if available
  if (htmlString) {
    return (
      <div className={`w-full h-[${height}px] overflow-auto border p-0`}>
        <div ref={shadowRef} />
      </div>
    );
  }

  // Fallback to PDF
  if (!pdfBase64) {
    return <div className="text-muted-foreground">No PDF available</div>;
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