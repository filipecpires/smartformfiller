
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, AlertTriangle, Loader2, ExternalLink, FolderPlus, Trash2 } from "lucide-react";
import type { CustomFormFieldSchema, GoogleDriveSaveConfig, SubfolderConfigItem } from '@/types';
import { saveToDriveAction } from '@/app/actions/save-to-drive-action';
import { useToast } from "@/hooks/use-toast";

interface GoogleDriveSaveOptionsProps {
  templateFields: CustomFormFieldSchema[];
  finalFormData: Record<string, string>;
}

const MAX_SUBFOLDER_LEVELS = 3;

export function GoogleDriveSaveOptions({ templateFields, finalFormData }: GoogleDriveSaveOptionsProps) {
  const [accessToken, setAccessToken] = useState('');
  const [baseFolderName, setBaseFolderName] = useState('Formulários Preenchidos IA');
  const [subfolderConfigs, setSubfolderConfigs] = useState<SubfolderConfigItem[]>([]);
  const [fileNameFieldId, setFileNameFieldId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenWarning, setShowTokenWarning] = useState(true);
  const { toast } = useToast();
  const [driveLinks, setDriveLinks] = useState<{file?: string, folder?: string} | null>(null);

  const handleSubfolderConfigChange = (index: number, part: Partial<SubfolderConfigItem>) => {
    const newConfigs = [...subfolderConfigs];
    const currentConfig = newConfigs[index] || { type: 'field', value: '' }; // Default if somehow not existing

    let updatedConfig = { ...currentConfig, ...part };

    // If type changed, reset value to ensure consistency
    if (part.type && part.type !== currentConfig.type) {
      updatedConfig.value = '';
    }
    
    // If type is 'field' and value is effectively "none" or empty, store as empty string
    if (updatedConfig.type === 'field' && (part.value === 'none' || part.value === '')) {
        updatedConfig.value = '';
    }

    newConfigs[index] = updatedConfig;
    setSubfolderConfigs(newConfigs);
  };

  const addSubfolderLevel = () => {
    if (subfolderConfigs.length < MAX_SUBFOLDER_LEVELS) {
      // Default to 'field' type with no specific field selected yet
      setSubfolderConfigs([...subfolderConfigs, { type: 'field', value: '' }]);
    }
  };

  const removeSubfolderLevel = (index: number) => {
    const newConfigs = [...subfolderConfigs];
    newConfigs.splice(index, 1);
    setSubfolderConfigs(newConfigs);
  };

  const handleSaveToDrive = async () => {
    if (!accessToken) {
      toast({ title: "Token de Acesso Necessário", description: "Por favor, insira um token de acesso do Google.", variant: "destructive" });
      return;
    }
    if (!baseFolderName) {
      toast({ title: "Nome da Pasta Base Necessário", description: "Por favor, defina um nome para a pasta base.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setDriveLinks(null);
    toast({ title: "Salvando no Google Drive...", description: "Isso pode levar alguns instantes." });

    const activeSubfolderConfigs = subfolderConfigs.filter(
      config => config.value && config.value.trim() !== ''
    );

    const configForAction: GoogleDriveSaveConfig = {
      accessToken,
      baseFolderName,
      subfolderConfig: activeSubfolderConfigs.length > 0 ? activeSubfolderConfigs : undefined,
      fileNameFieldId: fileNameFieldId,
    };

    try {
      const result = await saveToDriveAction(configForAction, templateFields, finalFormData);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
          variant: "default",
        });
        if(result.driveFileLink || result.driveFolderLink) {
            setDriveLinks({file: result.driveFileLink, folder: result.driveFolderLink});
        }
      } else {
        toast({
          title: "Erro ao Salvar",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro inesperado ao salvar no Drive:", error);
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro de comunicação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-md mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Salvar no Google Drive</CardTitle>
        <CardDescription>
          Configure as opções para salvar o formulário e o arquivo .txt gerado no seu Google Drive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTokenWarning && (
            <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção sobre o Token de Acesso!</AlertTitle>
            <AlertDescription>
                O método de inserção direta do token de acesso é <strong>apenas para demonstração</strong> e <strong>não é seguro para produção</strong>.
                Em um aplicativo real, use um fluxo OAuth 2.0 seguro para obter e gerenciar tokens.
                O token precisa da permissão (scope) `https://www.googleapis.com/auth/drive.file`.
                <Button variant="link" size="sm" className="p-0 h-auto ml-2 text-destructive-foreground/80 hover:text-destructive-foreground" onClick={() => setShowTokenWarning(false)}>Entendi, dispensar</Button>
            </AlertDescription>
            </Alert>
        )}

        <div>
          <Label htmlFor="accessToken">Token de Acesso do Google API</Label>
          <Input
            id="accessToken"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Cole seu token de acesso aqui"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Necessário para interagir com o Google Drive. Não será armazenado permanentemente.</p>
        </div>

        <div>
          <Label htmlFor="baseFolderName">Nome da Pasta Base no Drive</Label>
          <Input
            id="baseFolderName"
            value={baseFolderName}
            onChange={(e) => setBaseFolderName(e.target.value)}
            placeholder="Ex: Meus Contratos"
            className="mt-1"
          />
        </div>

        <div className="space-y-3">
            <Label>Estrutura de Subpastas (Opcional, máx. {MAX_SUBFOLDER_LEVELS} níveis)</Label>
            {subfolderConfigs.map((config, index) => (
                 <div key={`subfolder-level-${index}`} className="p-3 border rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-muted-foreground">Nível de Subpasta {index + 1}</p>
                        <Button variant="ghost" size="icon" onClick={() => removeSubfolderLevel(index)} aria-label={`Remover nível ${index + 1} de subpasta`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <RadioGroup
                        value={config.type}
                        onValueChange={(newType: 'field' | 'static') => handleSubfolderConfigChange(index, { type: newType })}
                        className="flex space-x-4 mb-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="field" id={`subfolderTypeField-${index}`} />
                            <Label htmlFor={`subfolderTypeField-${index}`}>Usar valor do campo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="static" id={`subfolderTypeStatic-${index}`} />
                            <Label htmlFor={`subfolderTypeStatic-${index}`}>Nome personalizado</Label>
                        </div>
                    </RadioGroup>

                    {config.type === 'field' ? (
                        <Select 
                            value={config.value || ''} // Use empty string to show placeholder if no field is selected
                            onValueChange={(fieldId) => handleSubfolderConfigChange(index, { value: fieldId })}
                        >
                            <SelectTrigger id={`subfolderFieldId-${index}`} className="w-full">
                                <SelectValue placeholder={`Selecione um campo para Nível ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                            {templateFields.map(field => (
                                <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            value={config.value}
                            onChange={(e) => handleSubfolderConfigChange(index, { value: e.target.value })}
                            placeholder={`Digite o nome personalizado para Nível ${index + 1}`}
                            className="w-full"
                        />
                    )}
                 </div>
            ))}
            {subfolderConfigs.length < MAX_SUBFOLDER_LEVELS && (
                <Button variant="outline" onClick={addSubfolderLevel} className="w-full sm:w-auto">
                    <FolderPlus className="mr-2 h-4 w-4" /> Adicionar Nível de Subpasta
                </Button>
            )}
            <p className="text-xs text-muted-foreground mt-1">Crie uma hierarquia de pastas. Para cada nível, escolha usar o valor de um campo do formulário ou um nome personalizado. Níveis vazios não serão criados.</p>
        </div>


        <div>
          <Label htmlFor="fileNameFieldId">Usar Campo para Nome do Arquivo (Prefixo - Opcional)</Label>
          <Select value={fileNameFieldId} onValueChange={(value) => setFileNameFieldId(value === "none" ? undefined : value)}>
            <SelectTrigger id="fileNameFieldId" className="w-full mt-1">
              <SelectValue placeholder="Padrão (timestamp)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Padrão (timestamp)</SelectItem>
              {templateFields.map(field => (
                <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">O valor do campo selecionado será usado como prefixo do nome do arquivo, seguido por um timestamp.</p>
        </div>


        <Button onClick={handleSaveToDrive} disabled={isLoading || !accessToken || !baseFolderName} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Salvando..." : "Salvar no Google Drive"}
        </Button>

        {driveLinks && (
            <div className="mt-4 p-3 border rounded-md bg-secondary/30 space-y-2">
                <p className="font-medium text-sm">Acesso rápido aos arquivos no Drive:</p>
                {driveLinks.file && (
                    <Button variant="link" asChild className="p-0 h-auto text-sm">
                        <a href={driveLinks.file} target="_blank" rel="noopener noreferrer">
                            Ver Arquivo TXT <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    </Button>
                )}
                {driveLinks.folder && (
                     <Button variant="link" asChild className="p-0 h-auto text-sm block">
                        <a href={driveLinks.folder} target="_blank" rel="noopener noreferrer">
                            Abrir Pasta no Drive <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    </Button>
                )}
            </div>
        )}

      </CardContent>
    </Card>
  );
}
