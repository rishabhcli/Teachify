import * as pdfjsModule from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Handle ES module default export behavior from CDN
const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export async function parseFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
      return await parseTxt(file);
    case 'pdf':
      return await parsePdf(file);
    case 'docx':
      return await parseDocx(file);
    case 'pptx':
      return await parsePptx(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
}

async function parseTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (e) => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

async function parsePdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: true 
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // OPTIMIZATION: Limit to first 30 pages. 
    // Most educational content has key info at the start. 
    // This prevents browser crashes on large textbooks.
    const maxPages = Math.min(pdf.numPages, 30);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF Parsing Error Details:", error);
    if (error instanceof Error) {
        throw new Error(`PDF Error: ${error.message}`);
    }
    throw new Error("Could not parse PDF. Please ensure it is a valid PDF file.");
  }
}

async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("DOCX Parsing Error:", error);
    throw new Error("Could not parse DOCX file.");
  }
}

async function parsePptx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const slideFiles = Object.keys(zip.files).filter(fileName => 
      fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
    );

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)![1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)![1] || '0');
      return numA - numB;
    });

    let fullText = '';
    
    // OPTIMIZATION: Limit to first 30 slides
    const maxSlides = Math.min(slideFiles.length, 30);
    const slidesToProcess = slideFiles.slice(0, maxSlides);

    for (const slideFile of slidesToProcess) {
      const xmlContent = await zip.files[slideFile].async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      let slideText = '';
      
      for (let i = 0; i < textNodes.length; i++) {
        slideText += textNodes[i].textContent + ' ';
      }
      
      if (slideText.trim()) {
        fullText += `[Slide ${slideFiles.indexOf(slideFile) + 1}]\n${slideText}\n\n`;
      }
    }

    return fullText;
  } catch (error) {
    console.error("PPTX Parsing Error:", error);
    throw new Error("Could not parse PowerPoint file.");
  }
}