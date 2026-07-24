import { Suspense, lazy, useEffect, useRef } from "react";
import { ClerkProvider, SignIn, useClerk, useAuth } from '@clerk/react';


import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Loader2 } from "lucide-react";

import { useGetIdentityMe } from "@workspace/api-client-react";

const Home = lazy(() => import("@/pages/home"));
const Portal = lazy(() => import("@/pages/portal"));
const CharacterEdit = lazy(() => import("@/pages/character"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Schools = lazy(() => import("@/pages/schools"));
const About = lazy(() => import("@/pages/about"));
const Features = lazy(() => import("@/pages/features"));
const Contact = lazy(() => import("@/pages/contact"));
const FAQ = lazy(() => import("@/pages/faq"));
const Admin = lazy(() => import("@/pages/admin"));
const Teacher = lazy(() => import("@/pages/teacher"));
const Games = lazy(() => import("@/pages/games"));
const GamePlay = lazy(() => import("@/pages/game-play"));
const OnboardingName = lazy(() => import("@/pages/onboarding-name"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ChatPage = lazy(() => import("@/pages/chat"));
const AIAssistant = lazy(() => import("@/pages/ai-assistant"));
const AIStory = lazy(() => import("@/pages/ai-story"));
const ReadingCoach = lazy(() => import("@/pages/reading-coach"));
const Settings = lazy(() => import("@/pages/settings"));
const Achievements = lazy(() => import("@/pages/achievements"));
const Friends = lazy(() => import("@/pages/friends"));
const Library = lazy(() => import("@/pages/library"));
const LibraryList = lazy(() => import("@/pages/library-list"));
const LibraryItem = lazy(() => import("@/pages/library-item"));
const TeacherLibrary = lazy(() => import("@/pages/teacher-library"));
const TeacherLibraryReviews = lazy(() => import("@/pages/teacher-library-reviews"));
const TeacherAIGenerator = lazy(() => import("@/pages/teacher-ai-questions"));


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(15 85% 55%)",
    colorForeground: "hsl(200 40% 15%)",
    colorMutedForeground: "hsl(180 20% 45%)",
    colorDanger: "hsl(350 80% 55%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(40 20% 90%)",
    colorInputForeground: "hsl(200 40% 15%)",
    colorNeutral: "hsl(40 20% 90%)",
    fontFamily: "'Tajawal', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[hsl(40,20%,90%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-[hsl(200,40%,15%)]",
    headerSubtitle: "text-[hsl(180,20%,45%)]",
    socialButtonsBlockButtonText: "font-semibold text-[hsl(200,40%,15%)]",
    formFieldLabel: "text-sm font-bold text-[hsl(200,40%,15%)]",
    footerActionLink: "text-[hsl(15,85%,55%)] font-bold hover:text-[hsl(15,85%,45%)]",
    footerActionText: "text-[hsl(180,20%,45%)] font-medium bg-white",
    dividerText: "text-[hsl(180,20%,45%)] font-medium bg-white",
    identityPreviewEditButton: "text-[hsl(15,85%,55%)]",
    formFieldSuccessText: "text-[hsl(180,60%,45%)]",
    logoBox: "h-16 mb-4 flex items-center justify-center",
    logoImage: "h-full w-auto",
    socialButtonsBlockButton: "border border-[hsl(40,20%,90%)] hover:bg-[hsl(40,33%,98%)] rounded-xl h-12 transition-colors",
    formButtonPrimary: "bg-[hsl(15,85%,55%)] hover:bg-[hsl(15,85%,45%)] text-white font-bold rounded-xl h-12 text-lg shadow-sm transition-all",
    formFieldInput: "bg-[hsl(40,33%,98%)] border border-[hsl(40,20%,90%)] rounded-xl h-12 text-[hsl(200,40%,15%)] focus:ring-2 focus:ring-[hsl(15,85%,55%)] px-4",
    footerAction: "hidden",
    dividerLine: "bg-[hsl(40,20%,90%)]",
    alert: "bg-[hsl(350,80%,95%)] border border-[hsl(350,80%,55%)] text-[hsl(350,80%,55%)]",
    otpCodeFieldInput: "border border-[hsl(40,20%,90%)] rounded-xl text-[hsl(200,40%,15%)]",
    formFieldRow: "mb-4",
    main: "gap-6",
  },
};

function PageLoader() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background" dir="rtl">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}

function RoleRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const isGuest = localStorage.getItem("antuq-guest") === "true";
  const { data: identity, isLoading } = useGetIdentityMe({
    query: { enabled: !!isSignedIn } as never,
  });

  if (!isLoaded || (isSignedIn && isLoading)) return null;

  if (isGuest) return <Redirect to="/portal" />;
  if (!isSignedIn) return <Home />;
  if (!identity?.nameConfirmed) return <Redirect to="/onboarding-name" />;
  if (identity.isAdmin || identity.isTeacher) return <Redirect to="/teacher" />;
  return <Redirect to="/portal" />;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 w-full max-w-[440px]">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClientInstance = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClientInstance.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientInstance]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
<ClerkProvider
  publishableKey={clerkPubKey}
  appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "مرحباً بك في إنطق",
            subtitle: "سجّل دخولك للمتابعة — سيتم إنشاء حسابك تلقائياً في أول مرة",
          },
        },
        socialButtonsBlockButton: "تسجيل الدخول باستخدام {{provider|titleize}}",
        dividerText: "أو",
        formFieldLabel__emailAddress: "البريد الإلكتروني",
        formFieldLabel__password: "كلمة المرور",
        formButtonPrimary: "المتابعة",
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/" component={RoleRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/onboarding-name" component={OnboardingName} />
              <Route path="/portal" component={Portal} />
              <Route path="/character" component={CharacterEdit} />
              <Route path="/admin" component={Admin} />
              <Route path="/teacher" component={Teacher} />
              <Route path="/games" component={Games} />
              <Route path="/games/:id" component={GamePlay} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/ai-assistant" component={AIAssistant} />
              <Route path="/ai-story" component={AIStory} />
              <Route path="/reading-coach" component={ReadingCoach} />
              <Route path="/settings" component={Settings} />
              <Route path="/achievements" component={Achievements} />
              <Route path="/friends" component={Friends} />
              <Route path="/library" component={Library} />
              <Route path="/library/:type" component={LibraryList} />
              <Route path="/library-item/:id" component={LibraryItem} />
              <Route path="/teacher/library" component={TeacherLibrary} />
              <Route path="/teacher/library/reviews" component={TeacherLibraryReviews} />
              <Route path="/teacher/ai-questions" component={TeacherAIGenerator} />
              <Route path="/terms" component={Terms} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/schools" component={Schools} />
              <Route path="/about" component={About} />
              <Route path="/features" component={Features} />
              <Route path="/contact" component={Contact} />
              <Route path="/faq" component={FAQ} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
