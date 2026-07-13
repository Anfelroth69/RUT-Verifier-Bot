import * as XLSX from "xlsx";
import type { RutResponse } from "../types";

export interface CedulaRecord {
  cedula: string;
  row: number;
}

export interface BatchResult {
  cedula: string;
  row: number;
  rut_exists: boolean | null;
  message: string;
  duration_ms: number;
}

const NIT_REGEX = /^\d{6,10}$/;
const MAX_RECORDS = 200;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

export function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `El archivo excede el tamaño máximo de 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
    throw new FileValidationError(
      "Formato no soportado. Use archivos CSV, XLSX o XLS."
    );
  }
}

export function parseFile(file: File): Promise<CedulaRecord[]> {
  return new Promise((resolve, reject) => {
    validateFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: (string | number | boolean | null | undefined)[][] =
          XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

        const cedulas: CedulaRecord[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const firstValue = String(row[0] ?? "").trim();
          if (NIT_REGEX.test(firstValue)) {
            cedulas.push({ cedula: firstValue, row: i + 1 });
          }
        }

        if (cedulas.length === 0) {
          reject(
            new FileValidationError(
              "No se encontraron cédulas válidas en el archivo (números de 6 a 10 dígitos)."
            )
          );
          return;
        }

        if (cedulas.length > MAX_RECORDS) {
          reject(
            new FileValidationError(
              `El archivo contiene ${cedulas.length} cédulas. Máximo permitido: ${MAX_RECORDS}.`
            )
          );
          return;
        }

        resolve(cedulas);
      } catch (err) {
        reject(
          err instanceof FileValidationError
            ? err
            : new FileValidationError("Error al procesar el archivo. Verifique el formato.")
        );
      }
    };
    reader.onerror = () =>
      reject(new FileValidationError("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

export interface ProgressCallback {
  (current: number, total: number, result: BatchResult): void;
}

export interface CompleteCallback {
  (summary: BatchSummary): void;
}

export interface ErrorCallback {
  (error: Error): void;
}

export interface BatchSummary {
  results: BatchResult[];
  total: number;
  with_rut: number;
  without_rut: number;
  errors: number;
  duration_ms: number;
}

export class VerificationQueue {
  private aborted = false;
  private controller: AbortController | null = null;

  abort(): void {
    this.aborted = true;
    this.controller?.abort();
  }

  async process(
    cedulas: CedulaRecord[],
    apiUrl: string,
    onProgress: ProgressCallback,
    onComplete: CompleteCallback,
    onError: ErrorCallback
  ): Promise<void> {
    this.aborted = false;
    const startTime = performance.now();
    const results: BatchResult[] = [];
    let withRut = 0;
    let withoutRut = 0;
    let errorCount = 0;

    for (let i = 0; i < cedulas.length; i++) {
      if (this.aborted) {
        onError(new Error("Verificación cancelada por el usuario."));
        return;
      }

      const record = cedulas[i];
      this.controller = new AbortController();
      const fetchTimeout = setTimeout(() => this.controller!.abort(), 90000);

      try {
        const response = await fetch(`${apiUrl}/api/v1/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cedula: record.cedula }),
          signal: this.controller.signal,
        });

        clearTimeout(fetchTimeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${response.status}`);
        }

        const data: RutResponse = await response.json();
        const result: BatchResult = {
          cedula: record.cedula,
          row: record.row,
          rut_exists: data.rut_exists,
          message: data.message,
          duration_ms: data.duration_ms,
        };

        results.push(result);
        if (data.rut_exists === true) withRut++;
        else if (data.rut_exists === false) withoutRut++;
        else errorCount++;

        onProgress(i + 1, cedulas.length, result);
      } catch (err: unknown) {
        clearTimeout(fetchTimeout);
        const message =
          err instanceof Error
            ? err.name === "AbortError"
              ? "Timeout (90s)"
              : err.message
            : "Error desconocido";

        const result: BatchResult = {
          cedula: record.cedula,
          row: record.row,
          rut_exists: null,
          message,
          duration_ms: 0,
        };

        results.push(result);
        errorCount++;
        onProgress(i + 1, cedulas.length, result);
      }

      if (i < cedulas.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const endTime = performance.now();
    onComplete({
      results,
      total: cedulas.length,
      with_rut: withRut,
      without_rut: withoutRut,
      errors: errorCount,
      duration_ms: Math.round(endTime - startTime),
    });
  }
}

export function downloadCSV(results: BatchResult[]): void {
  const header = "Cédula,Fila,Estado RUT,Mensaje,Duración (ms)\n";
  const rows = results
    .map((r) => {
      const status =
        r.rut_exists === true
          ? "Activo"
          : r.rut_exists === false
            ? "Sin RUT"
            : "Error";
      return `${r.cedula},${r.row},${status},"${r.message.replace(/"/g, '""')}",${r.duration_ms}`;
    })
    .join("\n");

  const csv = header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rut-resultados-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}