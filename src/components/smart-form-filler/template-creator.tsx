
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { PlusCircle, Trash2, ArrowRight, Save, UploadCloud, FolderOpen, FilePlus2 } from "lucide-react";
import type { CustomFormFieldSchema, FieldType } from '@/types';
import { fieldTypeLabels } from '@/types';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';

const LOCAL_STORAGE_KEY = 'smartFormFillerTemplates';

interface TemplateCreatorProps {
  onTemplateCreated: (template: CustomFormFieldSchema[]) => void;
  initialFields?: CustomFormFieldSchema[];
}

interface SavedTemplate {
  name: string;
  fields: CustomFormFieldSchema[];
}

export function TemplateCreator({ onTemplateCreated, initialFields = [] }: TemplateCreatorProps) {
  const [fields, setFields] = useState<CustomFormFieldSchema[]>(initialFields);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | undefined>(undefined);
  const [templateNameToSave, setTemplateNameToSave] = useState('');

  const [isOverwriteDialogVisible, setIsOverwriteDialogVisible] = useState(false);
  const [overwriteConfirmAction, setOverwriteConfirmAction] = useState<(() => void) | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTemplates) {
      try {
        const parsedTemplates = JSON.parse(storedTemplates) as SavedTemplate[];
        setSavedTemplates(parsedTemplates);
      } catch (error) {
        console.error("Error parsing saved templates from localStorage:", error);
        toast({ title: "Erro", description: "Não foi possível carregar modelos salvos.", variant: "destructive" });
      }
    }
  }, [toast]);

  const persistTemplates = (templates: SavedTemplate[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
    setSavedTemplates(templates);
  };

  const generateFieldId = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast({ title: "Erro", description: "O rótulo do campo não pode estar vazio.", variant: "destructive" });
      return;
    }
    const fieldId = generateFieldId(newFieldLabel);
    const fieldToAdd: CustomFormFieldSchema = {
      id: fieldId,
      label: newFieldLabel,
      type: newFieldType,
      options: newFieldType === 'dropdown' ? newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt) : undefined,
    };
    setFields([...fields, fieldToAdd]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    toast({ title: "Campo Adicionado", description: `"${newFieldLabel}" foi adicionado ao modelo atual.` });
  };

  const handleRemoveField = (id: string) => {
    const fieldToRemove = fields.find(f => f.id === id);
    setFields(fields.filter(field => field.id !== id));
    if (fieldToRemove) {
        toast({ title: "Campo Removido", description: `"${fieldToRemove.label}" foi removido do modelo atual.`, variant: "default" });
    }
  };

  const performSaveOrUpdateTemplate = (isOverwrite: boolean) => {
    let newSavedTemplatesList;
    if (isOverwrite) {
      const existingTemplateIndex = savedTemplates.findIndex(t => t.name === templateNameToSave);
      newSavedTemplatesList = [...savedTemplates];
      newSavedTemplatesList[existingTemplateIndex] = { name: templateNameToSave, fields };
      toast({ title: "Modelo Atualizado", description: `O modelo "${templateNameToSave}" foi atualizado com sucesso.` });
    } else {
      newSavedTemplatesList = [...savedTemplates, { name: templateNameToSave, fields }];
      toast({ title: "Modelo Salvo", description: `Modelo "${templateNameToSave}" salvo com sucesso.` });
    }
    persistTemplates(newSavedTemplatesList);
    setSelectedTemplateName(templateNameToSave); // Keep current saved/updated template selected
    // setTemplateNameToSave(templateNameToSave); // Keep name in input for further edits or re-save
  };

  const handleSaveTemplate = () => {
    if (!templateNameToSave.trim()) {
      toast({ title: "Erro ao Salvar", description: "Por favor, insira um nome para o modelo.", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Erro ao Salvar", description: "Adicione pelo menos um campo ao modelo antes de salvar.", variant: "destructive" });
      return;
    }

    const isExistingName = savedTemplates.some(t => t.name === templateNameToSave);

    if (isExistingName) {
      setOverwriteConfirmAction(() => () => performSaveOrUpdateTemplate(true));
      setIsOverwriteDialogVisible(true);
    } else {
      performSaveOrUpdateTemplate(false);
    }
  };


  const handleLoadTemplate = () => {
    if (!selectedTemplateName) {
      toast({ title: "Nenhum Modelo Selecionado", description: "Por favor, selecione um modelo para carregar.", variant: "destructive" });
      return;
    }
    const templateToLoad = savedTemplates.find(t => t.name === selectedTemplateName);
    if (templateToLoad) {
      setFields(templateToLoad.fields);
      setTemplateNameToSave(templateToLoad.name); 
      toast({ title: "Modelo Carregado", description: `Modelo "${templateToLoad.name}" carregado com sucesso.` });
    } else {
      toast({ title: "Erro ao Carregar", description: "Modelo não encontrado.", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplateName) {
      toast({ title: "Nenhum Modelo Selecionado", description: "Por favor, selecione um modelo para excluir.", variant: "destructive" });
      return;
    }
    const newSavedTemplates = savedTemplates.filter(t => t.name !== selectedTemplateName);
    persistTemplates(newSavedTemplates);
    toast({ title: "Modelo Excluído", description: `Modelo "${selectedTemplateName}" excluído com sucesso.` });
    
    const currentFieldsBelongToDeleted = fields.length > 0 && templateNameToSave === selectedTemplateName;

    setSelectedTemplateName(newSavedTemplates.length > 0 ? newSavedTemplates[0].name : undefined);
    if (newSavedTemplates.length === 0 || currentFieldsBelongToDeleted) {
        setFields(initialFields); 
        setTemplateNameToSave('');
    } else if (newSavedTemplates.length > 0) {
        // If current fields are not from the deleted one, keep them, but clear save name if it matched deleted.
        if (templateNameToSave === selectedTemplateName) {
            setTemplateNameToSave(newSavedTemplates[0].name); // Or clear it: setTemplateNameToSave('');
        }
    }
  };

  const handleNewTemplate = () => {
    setFields(initialFields); // Reset to initial (usually empty)
    setTemplateNameToSave('');
    setSelectedTemplateName(undefined);
    toast({ title: "Novo Modelo", description: "Campos limpos. Comece a criar seu novo modelo." });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (fields.length === 0) {
      toast({ title: "Modelo Vazio", description: "Adicione pelo menos um campo ao modelo antes de prosseguir.", variant: "destructive" });
      return;
    }
    onTemplateCreated(fields);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Criador de Modelos</CardTitle>
        <CardDescription>Defina os campos para o seu formulário. Você também pode salvar e carregar modelos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Field Section */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20 shadow-sm">
          <h3 className="text-lg font-medium">Adicionar Novo Campo</h3>
          <div>
            <Label htmlFor="newFieldLabel">Rótulo do Campo</Label>
            <Input
              id="newFieldLabel"
              value={newFieldLabel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFieldLabel(e.target.value)}
              placeholder="Ex: Nome Completo"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="newFieldType">Tipo do Campo</Label>
            <Select value={newFieldType} onValueChange={(value: FieldType) => setNewFieldType(value)}>
              <SelectTrigger id="newFieldType" className="w-full mt-1">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(fieldTypeLabels) as FieldType[]).map(key => (
                  <SelectItem key={key} value={key}>{fieldTypeLabels[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {newFieldType === 'dropdown' && (
            <div>
              <Label htmlFor="newFieldOptions">Opções (separadas por vírgula)</Label>
              <Textarea
                id="newFieldOptions"
                value={newFieldOptions}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewFieldOptions(e.target.value)}
                placeholder="Ex: Opção 1, Opção 2, Opção 3"
                className="mt-1"
              />
            </div>
          )}
          <Button onClick={handleAddField} className="w-full sm:w-auto" variant="outline">
            <PlusCircle className="mr-2" />
            Adicionar Campo ao Modelo Atual
          </Button>
        </div>

        <Separator />

        {/* Manage Saved Templates Section */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20 shadow-sm">
          <h3 className="text-lg font-medium">Gerenciar Modelos Salvos</h3>
          {savedTemplates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="selectTemplate">Carregar Modelo Existente</Label>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                  <SelectTrigger id="selectTemplate" className="flex-grow">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedTemplates.map(template => (
                      <SelectItem key={template.name} value={template.name}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={handleLoadTemplate} variant="outline" disabled={!selectedTemplateName} className="flex-grow sm:flex-grow-0">
                        <FolderOpen className="mr-2" /> Carregar
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!selectedTemplateName} className="flex-grow sm:flex-grow-0">
                            <Trash2 className="mr-2" /> Excluir
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                            Tem certeza que deseja excluir o modelo "{selectedTemplateName}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTemplate}>Confirmar Exclusão</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            </div>
          )}
           {savedTemplates.length === 0 && (
             <p className="text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
           )}

          <div className="space-y-2">
            <Label htmlFor="templateNameToSave">Nome do Modelo para Salvar/Atualizar</Label>
            <Input
              id="templateNameToSave"
              value={templateNameToSave}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTemplateNameToSave(e.target.value)}
              placeholder="Ex: Contrato Padrão"
              className="mt-1"
            />
             <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button onClick={handleSaveTemplate} disabled={fields.length === 0 || !templateNameToSave.trim()} className="flex-grow sm:flex-grow-0">
                <Save className="mr-2" />
                {savedTemplates.some(t => t.name === templateNameToSave && templateNameToSave.trim() !== '') ? "Atualizar Modelo" : "Salvar Novo Modelo"}
                </Button>
                <Button onClick={handleNewTemplate} variant="outline" className="flex-grow sm:flex-grow-0">
                    <FilePlus2 className="mr-2" /> Novo (Limpar Campos)
                </Button>
            </div>
          </div>
        </div>
        
        <Separator />

        {/* Current Fields Section */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Campos do Modelo Atual {templateNameToSave ? `(${templateNameToSave})` : ''}</h3>
            <ul className="space-y-2">
              {fields.map(field => (
                <li key={field.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:shadow-md transition-shadow">
                  <div>
                    <span className="font-medium">{field.label}</span>
                    <span className="text-sm text-muted-foreground ml-2">({fieldTypeLabels[field.type as FieldType]})</span>
                    {field.type === 'dropdown' && field.options && (
                       <p className="text-xs text-muted-foreground mt-1">Opções: {field.options.join(', ')}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveField(field.id)} aria-label="Remover campo">
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
         {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo adicionado ao modelo atual.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={fields.length === 0} className="w-full sm:w-auto ml-auto">
          Próximo Passo <ArrowRight className="ml-2" />
        </Button>
      </CardFooter>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog open={isOverwriteDialogVisible} onOpenChange={setIsOverwriteDialogVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Sobrescrita</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um modelo chamado "{templateNameToSave}". Deseja sobrescrevê-lo com as alterações atuais?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setOverwriteConfirmAction(null);
              // setIsOverwriteDialogVisible(false); // onOpenChange handles this
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (overwriteConfirmAction) {
                  overwriteConfirmAction();
                }
                setOverwriteConfirmAction(null);
                // setIsOverwriteDialogVisible(false); // onOpenChange handles this
              }}
            >
              Sobrescrever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}

