
"use client";

import type { ChangeEvent, FormEvent } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { PlusCircle, Trash2, ArrowRight } from "lucide-react";
import type { CustomFormFieldSchema, FieldType } from '@/types';
import { fieldTypeLabels } from '@/types';

interface TemplateCreatorProps {
  onTemplateCreated: (template: CustomFormFieldSchema[]) => void;
  initialFields?: CustomFormFieldSchema[];
}

export function TemplateCreator({ onTemplateCreated, initialFields = [] }: TemplateCreatorProps) {
  const [fields, setFields] = useState<CustomFormFieldSchema[]>(initialFields);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const generateFieldId = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      // TODO: Add toast notification for error
      alert("O rótulo do campo não pode estar vazio.");
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
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (fields.length === 0) {
      alert("Adicione pelo menos um campo ao modelo.");
      return;
    }
    onTemplateCreated(fields);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Criador de Modelos</CardTitle>
        <CardDescription>Defina os campos para o seu formulário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-lg font-medium mb-2">Adicionar Novo Campo</h3>
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
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Campo ao Modelo
          </Button>
        </div>

        {fields.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Campos do Modelo</h3>
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
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={fields.length === 0} className="w-full sm:w-auto ml-auto">
          Próximo Passo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
