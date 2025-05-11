"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { UploadCloud, FileText, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploaderProps {
  onDocumentUploaded: (file: File) => void;
  isLoading: boolean;
  // onBack?: () => void; // Removed as this is the first step
}

export function DocumentUploader({ onDocumentUploaded, isLoading }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // Max 10MB
        toast({
          title: "Erro",
          description: "O arquivo é muito grande. Máximo de 10MB.",
          variant: "destructive",
        });
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onDocumentUploaded(selectedFile);
    } else {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um documento para enviar.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">1. Carregar Documento</CardTitle>
        <CardDescription>Envie o documento base. A IA irá analisá-lo e sugerir campos para o seu modelo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="documentUpload" className="block text-sm font-medium text-gray-700 mb-1">
            Selecione o arquivo
          </Label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-primary transition-colors">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="flex text-sm text-muted-foreground">
                <Label
                  htmlFor="documentUpload"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                >
                  <span>Clique para enviar um arquivo</span>
                  <Input id="documentUpload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} accept=".pdf,.png,.jpg,.jpeg,.txt,.md" />
                </Label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-muted-foreground">PDF, PNG, JPG, TXT, MD até 10MB</p>
            </div>
          </div>
        </div>

        {selectedFile && (
          <div className="p-3 border rounded-md bg-secondary/30 flex items-center space-x-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {/* {onBack && ( // Conditional rendering if onBack is ever re-introduced
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        )} */}
        <Button onClick={handleSubmit} disabled={!selectedFile || isLoading} className="min-w-[220px]">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Analisando..." : "Analisar e Sugerir Campos"}
        </Button>
      </CardFooter>
    </Card>
  );
}
