import { FileCheck2, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/student.css";

export default function PublicLayout({
  children,
  code,
}: {
  children: React.ReactNode;
  code?: string;
}) {
  return (
    <div className="public-layout">
      <a className="skip-link" href="#student-main">
        Ir para o conteúdo
      </a>
      <header className="public-header">
        <Link to="/participar" className="brand">
          <span className="brand-icon">
            <FileCheck2 size={23} />
          </span>
          <span>Lousa</span>
        </Link>
        <span className="public-header-label">
          {code ? (
            <>
              <span className="status-dot" /> Acesso do aluno{" "}
              <span className="public-code">{code}</span>
            </>
          ) : (
            <>
              <Leaf size={15} /> Um espaço para aprender
            </>
          )}
        </span>
      </header>
      <main id="student-main" className="student-main">
        {children}
      </main>
      <footer className="public-footer">
        Lousa <span>Feito para aprender.</span>
      </footer>
    </div>
  );
}
