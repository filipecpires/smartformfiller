
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, RotateCcw, ArrowLeft, Loader2 } from "lucide-react";
import type { CustomFormFieldSchema, FieldType } from '@/types';
import { fieldTypeLabels } from '@/types';
import { useToast } from "@/hooks/use-toast";

interface FilledFormDisplayProps {
  template: CustomFormFieldSchema[];
  filledData: Record<string, string>;
  onFormSubmit: (data: Record<string, string>) => void;
  onBack: () => void;
  onStartOver: () => void;
  isLoading?: boolean; // Added isLoading prop
}

export function FilledFormDisplay({ template, filledData, onFormSubmit, onBack, onStartOver, isLoading = false }: FilledFormDisplayProps) {
  const form = useForm<Record<string, string>>({
    defaultValues: filledData,
  });
  const { toast } = useToast();

  useEffect(() => {
    form.reset(filledData);
  }, [filledData, form]);

  const onSubmit = (data: Record<string, string>) => {
    onFormSubmit(data);
    toast({
      title: "Formulário Salvo!",
      description: "Suas alterações foram salvas com sucesso.",
    });
  };

  const renderField = (field: CustomFormFieldSchema) => {
    const commonProps = {
      control: form.control,
      name: field.id,
      disabled: isLoading, // Disable fields while loading
    };

    return (
      <FormField
        {...commonProps}
        key={field.id}
        render={({ field: formField }) => (
          <FormItem className="mb-4 p-4 border rounded-md bg-card/50 shadow-sm">
            <FormLabel className="text-base font-medium">{field.label}</FormLabel>
            <FormControl>
              {/* Wrap conditional inputs in a div to receive the id from FormControl */}
              <div>
                {field.type === 'text' && (
                  <Input {...formField} placeholder={`Digite ${field.label.toLowerCase()}`} className="mt-1" disabled={isLoading} />
                )}
                {field.type === 'date' && (
                  <Input type="date" {...formField} className="mt-1" disabled={isLoading} />
                )}
                {field.type === 'number' && (
                  <Input type="number" {...formField} placeholder={`Digite ${field.label.toLowerCase()}`} className="mt-1" disabled={isLoading} />
                )}
                {field.type === 'email' && (
                  <Input type="email" {...formField} placeholder={`Digite ${field.label.toLowerCase()}`} className="mt-1" disabled={isLoading} />
                )}
                {field.type === 'dropdown' && field.options && (
                  <Select onValueChange={formField.onChange} defaultValue={formField.value} disabled={isLoading}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {/* Fallback for any other types or if dropdown has no options (should ideally not happen for dropdown) */}
                {!(field.type === 'text' || field.type === 'date' || field.type === 'number' || field.type === 'email' || (field.type === 'dropdown' && field.options)) && (
                     <Input {...formField} placeholder={`Valor para ${field.label.toLowerCase()}`} className="mt-1" disabled={isLoading} />
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">3. Formulário Preenchido</CardTitle>
        <CardDescription>
            {isLoading ? "Aguarde, a IA está preenchendo..." : "Revise e edite os campos preenchidos pela IA."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Preenchendo formulário...</p>
          </div>
        )}
        {!isLoading && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {template.map(renderField)}
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 p-0 pt-6">
                <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar (Editar Modelo)
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                   <Button type="button" variant="secondary" onClick={onStartOver} disabled={isLoading}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Novo Documento
                  </Button>
                  <Button type="submit" className="min-w-[120px]" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" /> Salvar e Revisar
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

