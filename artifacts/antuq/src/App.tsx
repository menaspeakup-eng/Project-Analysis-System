import { useEffect, useRef } from "react";
import { ReplitAuthProvider, useAuth } from "@workspace/replit-auth-web";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

import Home from "@/pages/home";
import Portal from "@/pages/portal";
import CharacterEdit from "@/pages/character";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Schools from "@/pages/schools";
import About from "@/pages/about";
import Features from "@/pages/features";
import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import Admin from "@/pages/admin";
import Teacher from "@/pages/teacher";
import Games from "@/pages/games";
import GamePlay from "@/pages/game-play";
import OnboardingName from "@/pages/onboarding-name";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/chat";
import AIAssistant from "@/pages/ai-assistant";
import AIStory from "@/pages/ai-story";
import ReadingCoach from "@/pages/reading-coach";
import Settings from "@/pages/settings";
import Achievements from "@/pages/achievements";
import Friends from "@/pages/friends";
import Library from "@/pages/library";
import LibraryList from "@/pages/library-list";
import LibraryItem from "@/pages/library-item";
import TeacherLibrary from "@/pages/teacher-library";
import TeacherLibraryReviews from "@/pages/teacher-library-reviews";
import { useGetIdentityMe } from "@workspace/api-client-react";

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const isGuest = localStorage.getItem("antuq-guest") === "true";
  const { data: identity, isLoading: isIdentityLoading } = useGetIdentityMe({
    query: { enabled: isAuthenticated } as never,
  });

  if (isLoading || (isAuthenticated && isIdentityLoading)) return null;

  if (isGuest) return <Redirect to="/portal" />;

  if (!isAuthenticated) return <Home />;

  if (!identity?.nameConfirmed) return <Redirect to="/onboarding-name" />;

  if (identity.isAdmin || identity.isTeacher) return <Redirect to="/teacher" />;
  return <Redirect to="/portal" />;
}

function SignInPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl border border-[hsl(40,20%,90%)] shadow-xl p-8 flex flex-col items-center gap-6">
        <img
          src={`${window.location.origin}${basePath}/logo.svg`}
          alt="انطق"
          className="h-16 w-auto"
        />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[hsl(200,40%,15%)]">مرحباً بك في انطق</h1>
          <p className="text-[hsl(180,20%,45%)]">
            سجّل دخولك باستخدام حساب Replit للمتابعة.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full h-12 rounded-xl text-lg font-bold bg-[hsl(15,85%,55%)] hover:bg-[hsl(15,85%,45%)] text-white"
          onClick={login}
        >
          <LogIn className="w-5 h-5 ml-2" />
          تسجيل الدخول
        </Button>
      </div>
    </div>
  );
}

function AuthQueryClientCacheInvalidator() {
  const { user } = useAuth();
  const queryClientInstance = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (
      prevUserIdRef.current !== undefined &&
      prevUserIdRef.current !== userId
    ) {
      queryClientInstance.clear();
    }
    prevUserIdRef.current = userId;
  }, [user, queryClientInstance]);

  return null;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WouterRouter base={basePath}>
        <ReplitAuthProvider basePath={basePath}>
          <QueryClientProvider client={queryClient}>
            <AuthQueryClientCacheInvalidator />
            <TooltipProvider>
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
              <Route path="/terms" component={Terms} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/schools" component={Schools} />
              <Route path="/about" component={About} />
              <Route path="/features" component={Features} />
              <Route path="/contact" component={Contact} />
              <Route path="/faq" component={FAQ} />
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ReplitAuthProvider>
    </WouterRouter>
  </ThemeProvider>
  );
}

export default App;
