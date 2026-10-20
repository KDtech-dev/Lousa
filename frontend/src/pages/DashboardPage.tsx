import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  messageOf,
} from "../services/format";
import { ErrorNotice, Loading } from "../components/Feedback";
import { teacherGateway, type TeacherDashboardData } from "../services/teacherGateway";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [error, setError] = useState("");
  function load() {
    setError("");
    teacherGateway
      .getDashboard()
      .then(setData)
      .catch((e) => setError(messageOf(e)));
  }
  useEffect(load, []);
  if (error) return <ErrorNotice message={error} retry={load} />;
  if (!data) return <Loading />;
  const now = Date.now();
  const available = data.applications.filter(
    (a) =>
      a.status === "published" &&
      +new Date(a.startAt) <= now &&
      +new Date(a.endAt) > now,
  );
  const pending = data.attempts.filter(
    (a) =>
      ["submitted", "expired"].includes(a.status) &&
      a.correctionStatus === "pending",
  );
  const completed = data.attempts.filter((a) =>
    ["submitted", "expired"].includes(a.status),
  );
  const upcoming = data.applications
    .filter((a) => a.status === "published" && +new Date(a.startAt) > now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 3);
  const recent = [...data.applications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const stats = [
    {
      label: "Avaliações criadas",
      value: data.assessments.filter((a) => !a.archived).length,
      note: "Prontas para novos aprendizados",
      icon: FileText,
      color: "sage",
      to: "/avaliacoes",
    },
    {
      label: "Aplicações abertas",
      value: available.length,
      note: "Recebendo respostas agora",
      icon: Send,
      color: "olive",
      to: "/aplicacoes",
    },
    {
      label: "Participações recebidas",
      value: completed.length,
      note: "Cada resposta é uma descoberta",
      icon: Users,
      color: "blue",
      to: "/resultados",
    },
    {
      label: "Pendentes de correção",
      value: pending.length,
      note: pending.length
        ? "Seu feedback faz a diferença"
        : "Todas as correções em dia",
      icon: ClipboardCheck,
      color: "sand",
      to: "/resultados",
    },
  ];
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">SEU ENSINO, EM MOVIMENTO</span>
          <h1>
            Olá, {data.teacher.name.split(" ")[0]}{" "}
            <span className="greeting-dot">.</span>
          </h1>
          <p>Um novo dia para acompanhar a aprendizagem.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span className="today-label">
            <CalendarDays size={14} />
            {dateLabel}
          </span>
          <Link className="button primary" to="/avaliacoes/nova">
            <Plus size={17} /> Nova avaliação
          </Link>
        </div>
      </div>
      <section className="welcome-card">
        <div>
          <span className="welcome-eyebrow">
            <span className="status-dot" /> ENSINAR É CRIAR POSSIBILIDADES
          </span>
          <h2>
            Mais organização.
            <br />
            <span>Mais tempo para ensinar.</span>
          </h2>
          <p>
            Da criação da atividade ao último feedback,
            <br className="desktop-break" /> acompanhe cada etapa em um só
            lugar.
          </p>
          <Link to="/aplicacoes" className="welcome-action">
            Preparar uma aplicação <ArrowRight size={16} />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <span className="art-spark">
            <Sparkles size={19} />
          </span>
          <div className="art-sheet">
            <span className="art-sheet-heading">
              <BookOpen size={19} />
              <span>Aprender & descobrir</span>
            </span>
            <div className="art-title-line" />
            <div className="art-short-line" />
            <div className="art-choice">
              <span>
                <Check size={10} />
              </span>
              <i />
            </div>
            <div className="art-choice">
              <span />
              <i />
            </div>
            <div className="art-choice">
              <span />
              <i />
            </div>
            <div className="art-sheet-foot">
              <span>01 / 03</span>
              <ArrowRight size={11} />
            </div>
          </div>
          <span className="art-check">
            <Check size={23} />
          </span>
          <div className="art-caption">
            <span className="status-dot" /> Cada resposta importa.
          </div>
        </div>
      </section>
      <section className="stats-grid" aria-label="Indicadores da plataforma">
        {stats.map((stat) => (
          <Link className="card stat-card" to={stat.to} key={stat.label}>
            <div className="stat-label">
              {stat.label}
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={18} strokeWidth={1.6} />
              </span>
            </div>
            <strong className="stat-value">
              {String(stat.value).padStart(2, "0")}
            </strong>
            <p>{stat.note}</p>
          </Link>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="card recent-applications">
          <div className="section-title">
            <div>
              <h2>Aplicações recentes</h2>
              <p>Suas atividades e provas em um só lugar.</p>
            </div>
            <Link to="/aplicacoes" className="text-link">
              Ver todas <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Atividade</th>
                    <th>Situação</th>
                    <th>Respostas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((application) => {
                    const open = available.some((a) => a.id === application.id);
                    const future =
                      application.status === "published" &&
                      +new Date(application.startAt) > now;
                    const count = data.attempts.filter(
                      (a) =>
                        a.applicationId === application.id &&
                        ["submitted", "expired"].includes(a.status),
                    ).length;
                    return (
                      <tr key={application.id}>
                        <td>
                          <div className="activity-name">
                            <span
                              className={`subject-symbol ${application.snapshot.subject === "Biologia" ? "sage" : application.appRequired ? "sand" : "blue"}`}
                            >
                              <FileText size={17} strokeWidth={1.6} />
                            </span>
                            <span>
                              <strong>{application.snapshot.title}</strong>
                              <small>
                                {application.snapshot.subject} <span>·</span>{" "}
                                {application.code}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${open ? "green" : future ? "blue" : "gray"}`}
                          >
                            <span className="badge-dot" />
                            {open
                              ? "Aberta"
                              : future
                                ? "Agendada"
                                : "Encerrada"}
                          </span>
                        </td>
                        <td>
                          <span className="response-count">
                            <Users size={13} /> {count}
                          </span>
                        </td>
                        <td>
                          <Link
                            to="/aplicacoes"
                            className="icon-button"
                            aria-label={`Ver aplicação ${application.snapshot.title}`}
                          >
                            <ChevronRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Send size={30} />
              <h3>Seu próximo passo começa aqui.</h3>
              <p>Publique uma avaliação para receber respostas.</p>
              <Link className="button primary" to="/aplicacoes">
                Criar aplicação
              </Link>
            </div>
          )}
          <div className="card-bottom-hint">
            <span className="status-dot" /> Links e códigos prontos para
            compartilhar com seus alunos.
          </div>
        </section>
        <section className="card upcoming-card">
          <div className="section-title">
            <div>
              <h2>Próximas provas</h2>
              <p>Prepare-se para o que vem aí.</p>
            </div>
            <CalendarDays size={18} className="muted" />
          </div>
          {upcoming.length ? (
            <div className="upcoming-list">
              {upcoming.map((a) => (
                <Link key={a.id} to="/aplicacoes" className="upcoming-item">
                  <div className="date-tile">
                    <strong>{formatDate(a.startAt, { day: "2-digit" })}</strong>
                    <span>
                      {formatDate(a.startAt, { month: "short" }).replace(
                        ".",
                        "",
                      )}
                    </span>
                  </div>
                  <div>
                    <h3>{a.snapshot.title}</h3>
                    <p>{a.snapshot.subject}</p>
                    <small>
                      <Clock3 size={12} />
                      {formatDate(a.startAt, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      <span>·</span> {a.durationMinutes} min
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="upcoming-empty">
              <CalendarDays size={26} />
              <p>
                Nenhuma prova agendada.
                <br />O calendário está livre para novas ideias.
              </p>
            </div>
          )}
          <div className="upcoming-note">
            <BookOpen size={18} />
            <p>
              Revise as instruções e os materiais antes de compartilhar sua
              próxima avaliação.
            </p>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="card correction-card">
          <div className="section-title">
            <div>
              <h2>Um olhar para cada resposta</h2>
              <p>
                {pending.length
                  ? `${pending.length} ${pending.length === 1 ? "participação aguarda" : "participações aguardam"} sua correção.`
                  : "As correções estão em dia."}
              </p>
            </div>
            <span className="correction-number">{pending.length}</span>
          </div>
          <div className="correction-list">
            {pending.slice(0, 2).map((attempt) => {
              const app = data.applications.find(
                (a) => a.id === attempt.applicationId,
              );
              return (
                <Link
                  to={`/resultados?attempt=${attempt.id}`}
                  className="correction-item"
                  key={attempt.id}
                >
                  <span className="mini-avatar">
                    {attempt.name
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>
                    <strong>{attempt.name}</strong>
                    <small>
                      {app?.snapshot.title} ·{" "}
                      {formatDateTime(attempt.endedAt ?? attempt.startedAt)}
                    </small>
                  </span>
                  <span className="badge amber">Corrigir</span>
                  <ArrowUpRight size={16} />
                </Link>
              );
            })}
            {!pending.length && (
              <p className="all-corrected">
                <Check size={17} /> Tudo certo. Seu feedback já pode inspirar o
                próximo passo.
              </p>
            )}
          </div>
          <Link to="/resultados" className="correction-footer">
            Acompanhar todos os resultados <ArrowRight size={14} />
          </Link>
        </section>
        <section className="resource-card">
          <span className="resource-icon">
            <BookOpen size={21} />
          </span>
          <div>
            <span className="eyebrow">CONTEÚDO QUE CONECTA</span>
            <h2>Conhecimento para compartilhar.</h2>
            <p>
              {data.materials.length} materiais na sua biblioteca. Associe
              arquivos e links às avaliações para apoiar seus alunos.
            </p>
            <Link className="text-link" to="/materiais">
              Explorar materiais <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
