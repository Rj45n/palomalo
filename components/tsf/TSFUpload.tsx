"use client";

import { useState, useCallback } from "react";
import { Upload, File, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { TSFData, TSFDataComplete } from "@/types";

interface TSFUploadProps {
  onUploadSuccess: (data: TSFData) => void;
  onUploadComplete?: (data: TSFDataComplete) => void;
}

export default function TSFUpload({ onUploadSuccess, onUploadComplete }: TSFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const uploadFile = async (file: File) => {
    setError("");
    setSuccess(false);
    setFileName(file.name);

    // Vérifier l'extension
    if (!file.name.endsWith(".tgz") && !file.name.endsWith(".tar.gz")) {
      setError("Format de fichier invalide. Seuls les fichiers .tgz et .tar.gz sont acceptés.");
      return;
    }

    // Vérifier la taille (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Fichier trop volumineux. Taille maximale : 500MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Demander le parsing complet si le callback est fourni
      if (onUploadComplete) {
        formData.append("complete", "true");
      }

      const response = await fetch("/api/tsf/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'upload");
      }

      setSuccess(true);
      
      // Appeler le callback approprié
      if (result.dataComplete && onUploadComplete) {
        onUploadComplete(result.dataComplete);
      }
      onUploadSuccess(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-paloalto-blue" />
        <h3 className="text-lg font-semibold">Upload Tech Support File</h3>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
          isDragging
            ? "border-paloalto-blue bg-paloalto-blue/10"
            : "border-white/20 hover:border-white/40"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".tgz,.tar.gz"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-paloalto-blue animate-spin mb-4" />
              <p className="text-lg font-medium">Upload en cours...</p>
              <p className="text-sm text-muted-foreground mt-2">{fileName}</p>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-500">Upload réussi !</p>
              <p className="text-sm text-muted-foreground mt-2">{fileName}</p>
            </>
          ) : (
            <>
              <File className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                Glissez-déposez votre Tech Support File ici
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                ou cliquez pour sélectionner un fichier
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Formats acceptés : .tgz, .tar.gz (max 500MB)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-500">Erreur</p>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-500">
            Le Tech Support File a été analysé avec succès. Les données sont maintenant disponibles
            pour le diagnostic.
          </p>
        </div>
      )}
    </div>
  );
}
