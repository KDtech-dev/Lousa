import { useState } from "react";
import { Download, ExternalLink, FileText, Link2 } from "lucide-react";
import type { Material } from "../types";
import { demoApi } from "../services/demoApi";
import { messageOf } from "../services/format";
import { ErrorNotice } from "./Feedback";

export default function PublicMaterials({
  materials,
}: {
  materials: Material[];
}) {
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function download(material: Material) {
    setBusyId(material.id);
    setError("");
    try {
      const blob = await demoApi.getMaterialBlob(material.id);
      if (!blob)
        throw new Error("Este arquivo não está disponível neste navegador.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = material.fileName ?? "material";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusyId("");
    }
  }
  return (
    <section className="public-materials">
      <h3>Materiais permitidos</h3>
      {materials.length ? (
        <div>
          {materials.map((material) => (
            <div key={material.id} className="public-material-item">
              {material.type === "link" ? (
                <Link2 size={17} />
              ) : (
                <FileText size={17} />
              )}
              <span>
                <strong>{material.title}</strong>
                <small>
                  {material.type === "file"
                    ? "Arquivo neste dispositivo"
                    : "Link de apoio"}
                </small>
              </span>
              {material.type === "link" ? (
                <a
                  className="icon-button"
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${material.title}`}
                >
                  <ExternalLink size={16} />
                </a>
              ) : (
                <button
                  className="icon-button"
                  onClick={() => download(material)}
                  disabled={busyId === material.id}
                  aria-label={`Baixar cópia local de ${material.title}`}
                >
                  <Download size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum material associado a esta atividade.</p>
      )}
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
