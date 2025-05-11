
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { TemplateCreator } from '@/components/smart-form-filler/template-creator';
import { DocumentUploader } from '@/components/smart-form-filler/document-uploader';
import { FilledFormDisplay } from '@/components/smart-form-filler/filled-form-display';
import { PWAInstallButton } from '@/components/smart-form-filler/pwa-install-button';
import { GoogleDriveSaveOptions } from '@/components/smart-form-filler/google-drive-save-options';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, FileText, ListChecks, UploadCloud, Wand2, Edit3, History } from 'lucide-react';
import { fillFormFields } from '@/ai/flows/fill-form-fields';
import type { FillFormFieldsInput, FillFormFieldsOutput as AIResponseType } from '@/ai/flows/fill-form-fields'; 
import type { FormFieldSchema as AIFormFieldSchema } from '@/ai/flows/fill-form-fields';

import { suggestFormFieldsFromDocument } from '@/ai/flows/suggest-form-fields-from-document';
import type { SuggestFormFieldsInput, SuggestFormFieldsOutput, SuggestedField as AISuggestedField } from '@/ai/flows/suggest-form-fields-from-document';

import type { CustomFormFieldSchema, FieldType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

type AppStep = 'documentUpload' | 'templateCreation' | 'formDisplay' | 'finalReview';

const DOCUMENT_TEMPLATE_ASSOCIATIONS_KEY = 'smartFormFillerDocTemplateAssoc';
const TEMPLATE_CREATOR_LOCAL_STORAGE_KEY = 'smartFormFillerTemplates'; // Used by TemplateCreator as well

interface DocumentTemplateAssociation {
  documentName: string;
  templateName: string;
  timestamp: number;
}
interface SavedTemplate { // Mirrored from TemplateCreator for use in page.tsx
    name: string;
    fields: CustomFormFieldSchema[];
}


const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const generateFieldId = (label: string): string => {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
};


export default function SmartFormFillerPage() {
  const [currentStep, setCurrentStep] = useState<AppStep>('documentUpload');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentDataUriForAI, setDocumentDataUriForAI] = useState<string | null>(null);
  
  const [templateFields, setTemplateFields] = useState<CustomFormFieldSchema[]>([]);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | undefined>(undefined);
  
  const [filledData, setFilledData] = useState<Record<string, string> | null>(null);
  const [finalFormData, setFinalFormData] = useState<Record<string, string> | null>(null);
  
  const [isLoadingDocumentProcessing, setIsLoadingDocumentProcessing] = useState(false); 
  const [isLoadingFormFilling, setIsLoadingFormFilling] = useState(false); 

  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStep === 'documentUpload') setProgress(0);
    else if (currentStep === 'templateCreation') setProgress(40);
    else if (currentStep === 'formDisplay') setProgress(70);
    else if (currentStep === 'finalReview') setProgress(100);
  }, [currentStep]);


  const handleDocumentUploaded = async (file: File) => {
    setIsLoadingDocumentProcessing(true);
    setProgress(10); 
    toast({ title: "Processando Documento...", description: "Carregando arquivo e verificando histórico..." });
    
    try {
      const dataUri = await fileToDataUri(file);
      setUploadedFile(file);
      setDocumentDataUriForAI(dataUri);

      // Check for existing association
      const associationsJson = localStorage.getItem(DOCUMENT_TEMPLATE_ASSOCIATIONS_KEY);
      let associations: DocumentTemplateAssociation[] = associationsJson ? JSON.parse(associationsJson) : [];
      const existingAssociation = associations.find(assoc => assoc.documentName === file.name);

      let templateAutoLoaded = false;
      if (existingAssociation) {
          const savedTemplatesJson = localStorage.getItem(TEMPLATE_CREATOR_LOCAL_STORAGE_KEY);
          const savedTemplates: SavedTemplate[] = savedTemplatesJson ? JSON.parse(savedTemplatesJson) : [];
          const matchedTemplate = savedTemplates.find(t => t.name === existingAssociation.templateName);

          if (matchedTemplate) {
              setTemplateFields(matchedTemplate.fields);
              setLoadedTemplateName(matchedTemplate.name);
              toast({
                  title: "Modelo Sugerido Carregado!",
                  description: (
                    <div className="flex items-start">
                      <History className="mr-2 h-5 w-5 text-blue-500 mt-1" />
                      <div>
                        O documento "{file.name}" foi usado anteriormente com o modelo <strong className="text-primary">"{matchedTemplate.name}"</strong>. O modelo foi carregado.
                      </div>
                    </div>
                  ),
                  duration: 8000
              });
              setCurrentStep('templateCreation');
              setIsLoadingDocumentProcessing(false);
              setProgress(40); 
              templateAutoLoaded = true;
          }
      }

      if (templateAutoLoaded) return;

      // If no association or template not found, proceed with AI suggestion
      setLoadedTemplateName(undefined); // Ensure no previous loaded name carries over for AI suggestion
      toast({ title: "Analisando com IA...", description: "Buscando sugestões de campos. Aguarde." });
      setProgress(25);

      const suggestionInput: SuggestFormFieldsInput = { documentDataUri: dataUri };
      const suggestionOutput: SuggestFormFieldsOutput = await suggestFormFieldsFromDocument(suggestionInput);
      
      let aiSuggestedFieldsMapped: CustomFormFieldSchema[] = [];
      if (suggestionOutput.suggestedFields && suggestionOutput.suggestedFields.length > 0) {
        aiSuggestedFieldsMapped = suggestionOutput.suggestedFields.map((sField: AISuggestedField) => ({
          id: generateFieldId(sField.label),
          label: sField.label,
          type: ['text', 'date', 'dropdown'].includes(sField.type) ? sField.type as FieldType : (sField.type === 'dropdown_candidate' ? 'dropdown' : 'text'),
        }));
        toast({ title: "Sugestões Prontas!", description: `${aiSuggestedFieldsMapped.length} campos foram sugeridos pela IA. Revise ou crie seu modelo.`, duration: 6000 });
      } else {
        toast({ title: "Documento Carregado", description: "Não foram encontradas sugestões automáticas pela IA. Crie seu modelo manualmente.", variant: "default" });
      }
      
      setTemplateFields(aiSuggestedFieldsMapped); 
      setCurrentStep('templateCreation');

    } catch (error) {
      console.error("Erro ao processar documento e sugerir campos:", error);
       let errorMessage = "Houve um problema ao analisar o documento. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = error.message.includes("GEMINI_API_KEY") || error.message.includes("GOOGLE_API_KEY")
          ? "Chave de API não configurada. Verifique as variáveis de ambiente."
          : error.message.includes("Quota exceeded") 
          ? "Cota da API excedida. Por favor, tente novamente mais tarde ou verifique sua cota."
          : error.message;
      }
      toast({
        title: "Erro no Processamento Inicial",
        description: errorMessage,
        variant: "destructive",
      });
      setUploadedFile(null);
      setDocumentDataUriForAI(null);
      setTemplateFields([]);
      setLoadedTemplateName(undefined);
      setCurrentStep('documentUpload'); 
    } finally {
      setIsLoadingDocumentProcessing(false);
    }
  };
  
  const handleTemplateFinalized = async (finalizedTemplate: CustomFormFieldSchema[], templateNameFromCreator?: string) => {
    setTemplateFields(finalizedTemplate);
    setLoadedTemplateName(templateNameFromCreator); // Keep track of the name of the template being used
    
    // Save/Update document-template association if a file was uploaded and a template name is available
    if (uploadedFile && templateNameFromCreator) {
      const associationsJson = localStorage.getItem(DOCUMENT_TEMPLATE_ASSOCIATIONS_KEY);
      let associations: DocumentTemplateAssociation[] = associationsJson ? JSON.parse(associationsJson) : [];
      
      associations = associations.filter(assoc => assoc.documentName !== uploadedFile.name); // Remove old entry for this doc
      associations.push({
        documentName: uploadedFile.name,
        templateName: templateNameFromCreator,
        timestamp: Date.now(),
      });
      // Optional: Limit the number of associations and sort by most recent
      associations.sort((a, b) => b.timestamp - a.timestamp);
      // associations = associations.slice(0, 50); // Example limit
      localStorage.setItem(DOCUMENT_TEMPLATE_ASSOCIATIONS_KEY, JSON.stringify(associations));
      console.log(`Associated document "${uploadedFile.name}" with template "${templateNameFromCreator}"`);
    }
    
    if (!documentDataUriForAI) {
      toast({ title: "Erro", description: "Documento não encontrado para preenchimento.", variant: "destructive" });
      setCurrentStep('documentUpload');
      return;
    }

    setIsLoadingFormFilling(true);
    setProgress(60);
    toast({ title: "Preenchendo Formulário...", description: "A IA está preenchendo os campos. Isso pode levar alguns instantes." });

    try {
      const aiTemplateForFilling: AIFormFieldSchema[] = finalizedTemplate.map(({ options, ...rest }) => rest);
      const fillInput: FillFormFieldsInput = {
        documentDataUri: documentDataUriForAI,
        formTemplate: aiTemplateForFilling,
      };
      
      const aiOutput: AIResponseType = await fillFormFields(fillInput);
      
      const filledFieldsRecord: Record<string, string> = {};
      if (aiOutput && aiOutput.filledFields && Array.isArray(aiOutput.filledFields)) {
        aiOutput.filledFields.forEach(field => {
          filledFieldsRecord[field.fieldId] = field.value;
        });
      } else {
        console.error("AI output.filledFields is not an array or is missing:", aiOutput);
        finalizedTemplate.forEach(tf => {
          filledFieldsRecord[tf.id] = "Erro ao processar campo";
        });
      }
      
      setFilledData(filledFieldsRecord);
      setCurrentStep('formDisplay');
      toast({ title: "Formulário Preenchido!", description: "Revise e edite os campos.", variant: "default" });

    } catch (error) {
      console.error("Erro ao preencher formulário com IA:", error);
      let errorMessage = "Falha ao preencher o formulário com IA.";
       if (error instanceof Error) {
        errorMessage = error.message.includes("Quota exceeded") 
          ? "Cota da API excedida durante o preenchimento. Por favor, tente novamente mais tarde ou verifique sua cota."
          : error.message;
      }
      toast({ title: "Erro no Preenchimento IA", description: errorMessage, variant: "destructive" });
      setCurrentStep('templateCreation'); 
    } finally {
      setIsLoadingFormFilling(false);
    }
  };


  const handleFormSubmitEdited = (data: Record<string, string>) => {
    setFinalFormData(data);
    setCurrentStep('finalReview');
    toast({ title: "Revisão Final", description: "Confira os dados e salve no Google Drive, se desejar."})
  };
  
  const resetApp = () => {
    setCurrentStep('documentUpload');
    setUploadedFile(null);
    setDocumentDataUriForAI(null);
    setTemplateFields([]);
    setLoadedTemplateName(undefined);
    setFilledData(null);
    setFinalFormData(null);
    setIsLoadingDocumentProcessing(false);
    setIsLoadingFormFilling(false);
    setProgress(0);
    toast({ title: "Pronto para um Novo Documento!", description: "Carregue um documento para começar." });
  };

  const goBack = () => {
    if (currentStep === 'templateCreation') {
      resetApp(); 
    }
    else if (currentStep === 'formDisplay') setCurrentStep('templateCreation');
    else if (currentStep === 'finalReview') setCurrentStep('formDisplay');
  };

  const StepIndicator = () => (
    <div className="w-full mb-8">
        <Progress value={progress} className="w-full h-3 rounded-full" />
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-center">
            <div className={currentStep === 'documentUpload' || progress >=0 ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                <UploadCloud className="inline-block mr-1 h-4 w-4" />1. Carregar Doc
            </div>
            <div className={currentStep === 'templateCreation' || progress >=40 ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                <Edit3 className="inline-block mr-1 h-4 w-4" />2. Criar Modelo
            </div>
            <div className={currentStep === 'formDisplay' || progress >=70 ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                <Wand2 className="inline-block mr-1 h-4 w-4" />3. Preencher IA
            </div>
            <div className={currentStep === 'finalReview' || progress >=100 ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                <CheckCircle2 className="inline-block mr-1 h-4 w-4" />4. Revisar
            </div>
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
          Transforme documentos em formulários preenchidos com o poder da IA. Economize tempo e automatize seu trabalho.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <StepIndicator />

        {currentStep === 'documentUpload' && (
          <DocumentUploader 
            onDocumentUploaded={handleDocumentUploaded} 
            isLoading={isLoadingDocumentProcessing}
          />
        )}

        {currentStep === 'templateCreation' && (
          <TemplateCreator 
            onTemplateCreated={handleTemplateFinalized} 
            currentFields={templateFields} 
            initialTemplateName={loadedTemplateName}
            onBack={goBack}
          />
        )}

        {currentStep === 'formDisplay' && templateFields.length > 0 && filledData && (
          <FilledFormDisplay
            template={templateFields}
            filledData={filledData}
            onFormSubmit={handleFormSubmitEdited}
            onBack={goBack}
            onStartOver={resetApp} 
            isLoading={isLoadingFormFilling}
          />
        )}
        {currentStep === 'finalReview' && finalFormData && templateFields.length > 0 && (
          <div className="space-y-6">
            <Card className="w-full shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold flex items-center">
                  <CheckCircle2 className="mr-2 h-7 w-7 text-green-500" />
                  Revisão Final do Formulário
                </CardTitle>
                <CardDescription>Confira os dados preenchidos. Você pode voltar para editar ou salvar no Google Drive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateFields.map(field => (
                  <div key={field.id} className="p-3 border rounded-md bg-card/50">
                    <p className="text-sm font-medium text-muted-foreground">{field.label}:</p>
                    <p className="text-md font-semibold">{finalFormData[field.id] || "Não preenchido"}</p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <Button variant="outline" onClick={goBack}>Voltar para Editar</Button>
                <Button onClick={resetApp} className="min-w-[180px]">
                  <ListChecks className="mr-2 h-4 w-4" /> Começar Novo Formulário
                </Button>
              </CardFooter>
            </Card>
            
            <GoogleDriveSaveOptions 
              templateFields={templateFields}
              finalFormData={finalFormData}
            />
          </div>
        )}
      </main>
      <PWAInstallButton />
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Smart Form Filler. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

