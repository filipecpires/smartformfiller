
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { TemplateCreator } from '@/components/smart-form-filler/template-creator';
import { DocumentUploader } from '@/components/smart-form-filler/document-uploader';
import { FilledFormDisplay } from '@/components/smart-form-filler/filled-form-display';
import { PWAInstallButton } from '@/components/smart-form-filler/pwa-install-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, FileText, ListChecks, UploadCloud } from 'lucide-react';
import { fillFormFields } from '@/ai/flows/fill-form-fields';
import type { FillFormFieldsInput, FillFormFieldsOutput as AIResponseType } from '@/ai/flows/fill-form-fields'; 
import type { FormFieldSchema as AIFormFieldSchema } from '@/ai/flows/fill-form-fields';
import type { CustomFormFieldSchema } from '@/types';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

type AppStep = 'templateCreation' | 'documentUpload' | 'formDisplay' | 'finalReview';

// The AI flow now returns AIResponseType: { filledFields: { fieldId: string, value: string }[] }
// The frontend state `filledData` and `finalFormData` will remain Record<string, string>


const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function SmartFormFillerPage() {
  const [currentStep, setCurrentStep] = useState<AppStep>('templateCreation');
  const [templateFields, setTemplateFields] = useState<CustomFormFieldSchema[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filledData, setFilledData] = useState<Record<string, string> | null>(null);
  const [finalFormData, setFinalFormData] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStep === 'templateCreation') setProgress(25);
    else if (currentStep === 'documentUpload') setProgress(50);
    else if (currentStep === 'formDisplay') setProgress(75);
    else if (currentStep === 'finalReview') setProgress(100);
  }, [currentStep]);


  const handleTemplateCreated = (template: CustomFormFieldSchema[]) => {
    setTemplateFields(template);
    setCurrentStep('documentUpload');
    toast({ title: "Modelo Criado!", description: "Agora, carregue seu documento." });
  };

  const handleDocumentUploaded = async (file: File) => {
    setUploadedFile(file);
    setIsLoading(true);
    toast({ title: "Processando Documento...", description: "A IA está analisando seu arquivo. Isso pode levar alguns instantes." });
    try {
      const documentDataUri = await fileToDataUri(file);
      
      const aiTemplate: AIFormFieldSchema[] = templateFields.map(({ options, ...rest }) => rest);

      const input: FillFormFieldsInput = {
        documentDataUri,
        formTemplate: aiTemplate,
      };
      
      const aiOutput: AIResponseType = await fillFormFields(input); 
      
      const filledFieldsRecord: Record<string, string> = {};
      if (aiOutput && aiOutput.filledFields && Array.isArray(aiOutput.filledFields)) {
        aiOutput.filledFields.forEach(field => {
          filledFieldsRecord[field.fieldId] = field.value;
        });
      } else {
        // Handle cases where aiOutput.filledFields is not as expected, though the flow aims to prevent this.
        console.error("AI output.filledFields is not an array or is missing:", aiOutput);
        templateFields.forEach(tf => {
          filledFieldsRecord[tf.id] = "Erro ao processar campo";
        });
      }
      
      setFilledData(filledFieldsRecord);
      setCurrentStep('formDisplay');
      toast({ title: "Documento Processado!", description: "Revise e edite os campos preenchidos.", variant: "default" });
    } catch (error) {
      console.error("Erro ao processar documento:", error);
      let errorMessage = "Houve um problema ao analisar o documento. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = error.message.includes("GEMINI_API_KEY") || error.message.includes("GOOGLE_API_KEY")
          ? "Chave de API não configurada. Verifique as variáveis de ambiente."
          : error.message;
      }
      toast({
        title: "Erro no Processamento",
        description: errorMessage,
        variant: "destructive",
      });
      setCurrentStep('documentUpload'); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (data: Record<string, string>) => {
    setFinalFormData(data);
    setCurrentStep('finalReview');
    console.log("Formulário final submetido:", data);
  };
  
  const resetApp = () => {
    setCurrentStep('templateCreation');
    setTemplateFields([]);
    setUploadedFile(null);
    setFilledData(null);
    setFinalFormData(null);
    setIsLoading(false);
    setProgress(0);
    toast({ title: "Pronto para um Novo Formulário!", description: "Crie um novo modelo para começar." });
  };

  const goBack = () => {
    if (currentStep === 'documentUpload') setCurrentStep('templateCreation');
    else if (currentStep === 'formDisplay') setCurrentStep('documentUpload');
    else if (currentStep === 'finalReview') setCurrentStep('formDisplay');
  };

  const StepIndicator = () => (
    <div className="w-full mb-8">
        <Progress value={progress} className="w-full h-3 rounded-full" />
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-center">
            <div className={currentStep === 'templateCreation' || progress >=25 ? 'text-primary font-semibold' : 'text-muted-foreground'}>1. Criar Modelo</div>
            <div className={currentStep === 'documentUpload' || progress >=50 ? 'text-primary font-semibold' : 'text-muted-foreground'}>2. Carregar Doc</div>
            <div className={currentStep === 'formDisplay' || progress >=75 ? 'text-primary font-semibold' : 'text-muted-foreground'}>3. Preencher</div>
            <div className={currentStep === 'finalReview' || progress >=100 ? 'text-primary font-semibold' : 'text-muted-foreground'}>4. Revisar</div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-5xl mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary mr-3">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-4xl font-bold text-foreground">Preenchedor Inteligente de Formulários</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Transforme documentos em formulários preenchidos com o poder da IA.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <StepIndicator />
        {currentStep === 'templateCreation' && (
          <TemplateCreator onTemplateCreated={handleTemplateCreated} />
        )}
        {currentStep === 'documentUpload' && (
          <DocumentUploader 
            onDocumentUploaded={handleDocumentUploaded} 
            isLoading={isLoading}
            onBack={goBack}
          />
        )}
        {currentStep === 'formDisplay' && templateFields.length > 0 && filledData && (
          <FilledFormDisplay
            template={templateFields}
            filledData={filledData}
            onFormSubmit={handleFormSubmit}
            onBack={goBack}
            onStartOver={resetApp}
          />
        )}
        {currentStep === 'finalReview' && finalFormData && (
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center">
                <CheckCircle2 className="mr-2 h-7 w-7 text-green-500" />
                Formulário Concluído!
              </CardTitle>
              <CardDescription>Aqui está o resumo do seu formulário preenchido e revisado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateFields.map(field => (
                <div key={field.id} className="p-3 border rounded-md bg-card/50">
                  <p className="text-sm font-medium text-muted-foreground">{field.label}:</p>
                  <p className="text-md font-semibold">{finalFormData[field.id] || "Não preenchido"}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={resetApp} className="min-w-[180px]">
                <ListChecks className="mr-2 h-4 w-4" /> Começar Novo Formulário
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <PWAInstallButton />
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Smart Form Filler. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

