
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      // Check if running in standalone mode (already installed)
      if (!window.matchMedia('(display-mode: standalone)').matches) {
         setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: "Aplicativo Instalado!", description: "Obrigado por instalar nosso app." });
        setIsVisible(false); // Hide button after successful install prompt
      } else {
        // User dismissed the prompt, can show again later if needed or log
      }
      setInstallPrompt(null); // Clear the prompt
    } catch (error) {
      console.error('Erro ao tentar instalar o PWA:', error);
      toast({ title: "Erro na Instalação", description: "Não foi possível iniciar a instalação.", variant: "destructive" });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      className="fixed bottom-4 right-4 z-50 shadow-lg bg-background hover:bg-accent"
      aria-label="Instalar Aplicativo"
    >
      <Download className="mr-2 h-4 w-4" />
      Instalar App
    </Button>
  );
}
