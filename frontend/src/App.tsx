import {
  Component,
  Suspense,
  lazy,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";
import TeacherLayout from "./components/TeacherLayout";
import PublicLayout from "./components/PublicLayout";
import { Loading } from "./components/Feedback";
import {
  IntegrationError,
  consumePendingLogout,
  isDemoMode,
  teacherGateway,
} from "./services/teacherGateway";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const RecoverAccessPage = lazy(() => import("./pages/RecoverAccessPage"));
const AssessmentsPage = lazy(() => import("./pages/AssessmentsPage"));
const AssessmentEditorPage = lazy(() => import("./pages/AssessmentEditorPage"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ParticipatePage = lazy(() => import("./pages/ParticipatePage"));
const StudentPage = lazy(() => import("./pages/StudentPage"));

function TeacherAccess() {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );
  const [authError, setAuthError] = useState("");
  useLayoutEffect(() => {
    setState("checking");
    setAuthError("");
    let alive = true;
    teacherGateway
      .verifyTeacherSession()
      .then((teacher) => {
        if (alive) setState(teacher ? "allowed" : "denied");
      })
      .catch((error) => {
        if (alive) {
          setState("denied");
          if (error instanceof IntegrationError) setAuthError(error.message);
          else setAuthError("Não foi possível validar a sessão do professor.");
        }
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);
  if (state === "checking") return <Loading label="Verificando sessão…" />;
  return state === "allowed" ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname, authError }}
    />
  );
}

function IntegrationPending({ feature }: { feature: string }) {
  return (
    <section className="card student-unavailable">
      <FileQuestion size={32} />
      <span className="badge amber">INDISPONÍVEL</span>
      <h1>{feature} está indisponível no momento.</h1>
      <p>
        Não foi possível acessar esta área agora. Tente novamente mais tarde.
      </p>
      <Link className="button primary" to="/">
        Voltar ao painel
      </Link>
    </section>
  );
}

function featurePage(
  element: ReactNode,
  feature: string,
  isPublic = false,
) {
  if (isDemoMode) return page(element);
  const pending = <IntegrationPending feature={feature} />;
  return page(isPublic ? <PublicLayout>{pending}</PublicLayout> : pending);
}
class AppBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <PublicLayout>
        <div className="card student-unavailable">
          <FileQuestion size={32} />
          <h1>Precisamos tentar novamente.</h1>
          <p>
            Não foi possível carregar esta página. Tente novamente.
          </p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      </PublicLayout>
    ) : (
      this.props.children
    );
  }
}
function page(element: ReactNode) {
  return (
    <Suspense fallback={<Loading label="Carregando página…" />}>
      {element}
    </Suspense>
  );
}

function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  useLayoutEffect(() => {
    const state = location.state as { logout?: boolean } | null;
    if (location.pathname !== "/login") return;
    const logoutWasRequested = consumePendingLogout();
    if (isDemoMode) {
      try {
        localStorage.removeItem("ao.teacher.session");
      } catch {
        setLogoutError("O navegador não permitiu encerrar a sessão local.");
      }
      return;
    }
    if (!state?.logout && !logoutWasRequested) return;
    let alive = true;
    setLogoutError("");
    teacherGateway.logout().catch((error: unknown) => {
      if (!alive) return;
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão no servidor.",
      );
      navigate("/login", { replace: true, state: { logoutError: true } });
    });
    return () => {
      alive = false;
    };
  }, [location.key, location.pathname, location.state, navigate]);
  return (
    <AppBoundary>
      <>
        {logoutError && (
          <div className="notice error" role="alert">
            {logoutError}
          </div>
        )}
        <Outlet />
      </>
    </AppBoundary>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/login" element={page(<LoginPage />)} />
      <Route
        path="/cadastro"
        element={featurePage(<SignupPage />, "Cadastro de perfil", true)}
      />
      <Route
        path="/recuperar-acesso"
        element={featurePage(<RecoverAccessPage />, "Recuperação de acesso", true)}
      />
      <Route
        path="/participar"
        element={featurePage(<ParticipatePage />, "Área do aluno", true)}
      />
      <Route
        path="/p/:codigo"
        element={featurePage(<StudentPage />, "Área do aluno", true)}
      />
      <Route element={<TeacherAccess />}>
        <Route element={<TeacherLayout />}>
          <Route index element={page(<DashboardPage />)} />
          <Route path="avaliacoes" element={page(<AssessmentsPage />)} />
          <Route
            path="avaliacoes/nova"
            element={page(<AssessmentEditorPage />)}
          />
          <Route
            path="avaliacoes/:id"
            element={page(<AssessmentEditorPage />)}
          />
          <Route
            path="materiais"
            element={featurePage(<MaterialsPage />, "Materiais")}
          />
          <Route
            path="aplicacoes"
            element={featurePage(<ApplicationsPage />, "Aplicações e turmas")}
          />
          <Route
            path="resultados"
            element={featurePage(<ResultsPage />, "Correção e resultados")}
          />
          <Route
            path="conta"
            element={featurePage(<AccountPage />, "Conta")}
          />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <PublicLayout>
            <div className="card student-unavailable">
              <FileQuestion size={32} />
              <h1>Esta página não foi encontrada.</h1>
              <p>Confira o endereço ou acesse uma atividade com seu código.</p>
              <Link className="button primary" to="/participar">
                <ArrowLeft size={16} /> Acessar uma atividade
              </Link>
            </div>
          </PublicLayout>
        }
      />
    </Route>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
