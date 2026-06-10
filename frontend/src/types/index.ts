export interface RutData {
  cedula_consultada: string;
  contenido_confirmado: string;
}

export interface RutResponse {
  status: "success" | "failed";
  rut_exists: boolean | null;
  data: RutData | null;
  message: string;
  duration_ms: number;
}

export interface HistoryItem {
  cedula: string;
  timestamp: string;
  rut_exists: boolean | null;
  message: string;
  data: RutData | null;
}
