import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
// Conditional imports for Node.js libraries - only available in Electron main process
let WordExtractor: any = null;
let MSGReader: any = null;

// Try to import Node.js libraries, fallback gracefully if not available
try {
  if (typeof window !== 'undefined' && window.require) {
    // @ts-ignore - word-extractor doesn't have types
    WordExtractor = window.require('word-extractor');
    // @ts-ignore - msgreader doesn't have complete types  
    MSGReader = window.require('@kenjiuno/msgreader');
  }
} catch (error) {
  console.warn('Node.js file processing libraries not available in renderer process:', error);
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content?: string;
  base64?: string;
}

export interface ViewingFile {
  name: string;
  content: string;
  path: string;
}

export const useFileHandling = () => {
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modelSupportsImages, setModelSupportsImages] = useState(false);
  const [viewingFile, setViewingFile] = useState<ViewingFile | null>(null);

  // Handle Escape key to close file viewer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && viewingFile) {
        setViewingFile(null);
      }
    };

    if (viewingFile) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.addEventListener('keydown', handleKeyDown);
    }
  }, [viewingFile]);

  const formatFileSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  };

  const checkModelSupportsImages = (modelName: string) => {
    const imageModels = ['llava', 'minicpm', 'moondream', 'bakllava', 'vision', 'visual', 'qwen2-vl', 'qwen2.5-vision', 'qwen-vl', 'gemma2-vision', 'gemma-vision', 'pixtral', 'internvl', 'cogvlm'];
    const supportsImages = imageModels.some(model => modelName.toLowerCase().includes(model));
    setModelSupportsImages(supportsImages);
    return supportsImages;
  };

  const handleFileRead = async (file: File): Promise<FileAttachment> => {
    try {
      const fileName = file.name.toLowerCase();
      const fileType = file.type;
      
      // Handle different file types
      if (fileType.startsWith('text/') || fileName.endsWith('.md') || fileName.endsWith('.txt') || fileName.endsWith('.json') || fileName.endsWith('.csv') || fileName.endsWith('.mmd')) {
        // Text-based files
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve({
              name: file.name,
              type: fileType || 'text/plain',
              size: file.size,
              content: content
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsText(file);
        });
      } else if (fileType.startsWith('image/')) {
        // Image files - convert to base64
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Image ${file.name} is too large. Maximum size is 10MB.`);
        }
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            resolve({
              name: file.name,
              type: fileType,
              size: file.size,
              base64: base64
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read image ${file.name}`));
          reader.readAsDataURL(file);
        });
      } else if (fileName.endsWith('.pdf')) {
        // PDF files - extract text content using main process
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await window.electron.invoke('pdf:extract-text', arrayBuffer);
          
          if (result.success) {
            return {
              name: file.name,
              type: 'application/pdf',
              size: file.size,
              content: result.text.trim() || `[PDF Document: ${file.name}]\n\nNo extractable text found in this PDF.`
            };
          } else {
            return {
              name: file.name,
              type: 'application/pdf',
              size: file.size,
              content: `[PDF Document: ${file.name}]\n\nError extracting text: ${result.error}`
            };
          }
        } catch (error) {
          return {
            name: file.name,
            type: 'application/pdf',
            size: file.size,
            content: `[PDF Document: ${file.name}]\n\nError processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      } else if (fileName.endsWith('.docx')) {
        // Word DOCX documents - extract text content
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          
          return {
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: file.size,
            content: result.value.trim() || `[Word Document: ${file.name}]\n\nNo extractable text found in this document.`
          };
        } catch (error) {
          return {
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: file.size,
            content: `[Word Document: ${file.name}]\n\nError extracting text: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      } else if (fileName.endsWith('.doc')) {
        // Legacy DOC files - extract text content
        if (!WordExtractor) {
          return {
            name: file.name,
            type: 'application/msword',
            size: file.size,
            content: `[Word Document: ${file.name}]\n\nLegacy .doc format processing not available in current environment. Please convert to .docx format for text extraction.`
          };
        }
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const extractor = new WordExtractor();
          const extracted = await extractor.extract(arrayBuffer);
          
          return {
            name: file.name,
            type: 'application/msword',
            size: file.size,
            content: extracted.getBody().trim() || `[Word Document: ${file.name}]\n\nNo extractable text found in this legacy Word document.`
          };
        } catch (error) {
          return {
            name: file.name,
            type: 'application/msword',
            size: file.size,
            content: `[Word Document: ${file.name}]\n\nError extracting text from legacy .doc file: ${error instanceof Error ? error.message : 'Unknown error'}. Consider converting to .docx format.`
          };
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel files - extract sheet data
        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let content = '';
          
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            
            if (csvData.trim()) {
              content += `Sheet ${index + 1}: ${sheetName}\n${'='.repeat(sheetName.length + 10)}\n${csvData}\n\n`;
            }
          });
          
          return {
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: file.size,
            content: content.trim() || `[Excel Spreadsheet: ${file.name}]\n\nNo extractable data found in this spreadsheet.`
          };
        } catch (error) {
          return {
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: file.size,
            content: `[Excel Spreadsheet: ${file.name}]\n\nError extracting data: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
        // PowerPoint files - basic extraction for PPTX
        if (fileName.endsWith('.pptx')) {
          return {
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            size: file.size,
            content: `[PowerPoint Presentation: ${file.name}]\n\nPowerPoint PPTX file detected. Basic text extraction is limited. Consider exporting slides as text or PDF for better content extraction.`
          };
        } else {
          // Legacy PPT files
          return {
            name: file.name,
            type: 'application/vnd.ms-powerpoint',
            size: file.size,
            content: `[PowerPoint Presentation: ${file.name}]\n\nLegacy .ppt format is not supported. Please convert to .pptx format for better compatibility.`
          };
        }
      } else if (fileName.endsWith('.eml')) {
        // EML email files - parse email content
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const emailContent = e.target?.result as string;
            
            // Basic EML parsing - extract headers and body
            const lines = emailContent.split('\n');
            let headers = '';
            let body = '';
            let inHeaders = true;
            
            for (const line of lines) {
              if (inHeaders && line.trim() === '') {
                inHeaders = false;
                continue;
              }
              
              if (inHeaders) {
                if (line.startsWith('From:') || line.startsWith('To:') || 
                    line.startsWith('Subject:') || line.startsWith('Date:')) {
                  headers += line + '\n';
                }
              } else {
                body += line + '\n';
              }
            }
            
            const content = `[Email: ${file.name}]\n\nHeaders:\n${headers}\nContent:\n${body.trim()}`;
            
            resolve({
              name: file.name,
              type: 'message/rfc822',
              size: file.size,
              content: content
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read email ${file.name}`));
          reader.readAsText(file);
        });
      } else if (fileName.endsWith('.msg')) {
        // MSG email files - parse Outlook message
        if (!MSGReader) {
          return {
            name: file.name,
            type: 'application/vnd.ms-outlook',
            size: file.size,
            content: `[Outlook Email: ${file.name}]\n\nMicrosoft Outlook .msg format processing not available in current environment. Consider exporting as .eml format for better parsing.`
          };
        }
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const msgReader = new MSGReader(arrayBuffer);
          const msgData = msgReader.getFileData();
          
          // Extract email components
          const headers = [];
          if (msgData.senderName) headers.push(`From: ${msgData.senderName} <${msgData.senderEmail || 'unknown'}>`); 
          if (msgData.recipients) {
            const toList = msgData.recipients.filter((r: any) => r.recipientType === 1).map((r: any) => `${r.name || ''} <${r.email || ''}>`).join(', ');
            if (toList) headers.push(`To: ${toList}`);
          }
          if (msgData.subject) headers.push(`Subject: ${msgData.subject}`);
          if (msgData.creationTime) headers.push(`Date: ${new Date(msgData.creationTime).toISOString()}`);
          
          const headerText = headers.join('\n');
          const bodyText = msgData.body || msgData.bodyHtml || '';
          
          return {
            name: file.name,
            type: 'application/vnd.ms-outlook',
            size: file.size,
            content: `[Outlook Email: ${file.name}]\n\nHeaders:\n${headerText}\n\nContent:\n${bodyText.trim()}`
          };
        } catch (error) {
          return {
            name: file.name,
            type: 'application/vnd.ms-outlook',
            size: file.size,
            content: `[Outlook Email: ${file.name}]\n\nError parsing .msg file: ${error instanceof Error ? error.message : 'Unknown error'}. Consider exporting as .eml format for better compatibility.`
          };
        }
      } else {
        // Unsupported file type
        throw new Error(`Unsupported file type: ${file.name}. Supported formats: Text, Markdown, JSON, CSV, MMD, Images (PNG, JPG, GIF), PDF, Word (DOC, DOCX), Excel, PowerPoint (PPTX), Email (EML, MSG).`);
      }
    } catch (error) {
      throw new Error(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const newAttachments: FileAttachment[] = [];
    
    for (const file of files) {
      try {
        const attachment = await handleFileRead(file);
        newAttachments.push(attachment);
      } catch (error) {
        console.error('Error reading file:', error);
        alert(error instanceof Error ? error.message : `Failed to read ${file.name}`);
      }
    }
    
    setAttachedFiles(prev => [...prev, ...newAttachments]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const viewFileContent = (filePath: string) => {
    // For now, open the directory containing the file
    if (window.require) {
      const { shell } = window.require('electron');
      const path = window.require('path');
      shell.showItemInFolder(path.resolve(filePath));
    } else {
      // In browser, we would need a different approach
      console.log('Would view file:', filePath);
    }
  };

  const addFileToChat = (fileName: string, content: string, onAddToInput: (text: string) => void) => {
    const fileContent = `[File: ${fileName}]\n\n${content}`;
    onAddToInput(fileContent);
    
    // Also close the file viewer if open
    setViewingFile(null);
  };

  const clearAttachments = () => {
    setAttachedFiles([]);
  };

  const getAttachedFilesForSubmission = () => {
    return attachedFiles.map(att => ({
      name: att.name,
      type: att.type,
      size: att.size,
      content: att.content,
      base64: att.base64
    }));
  };

  return {
    // State
    attachedFiles,
    isDragging,
    modelSupportsImages,
    viewingFile,
    
    // Actions
    handleFileDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachment,
    viewFileContent,
    addFileToChat,
    clearAttachments,
    checkModelSupportsImages,
    getAttachedFilesForSubmission,
    setViewingFile,
    
    // Utilities
    formatFileSize,
  };
};