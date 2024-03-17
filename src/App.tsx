import { createRoute, createRouter, createRootRouteWithContext, RouterProvider, redirect } from '@tanstack/react-router';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, type PropsWithChildren } from 'react';

//-------------------------------------
//- Auth
//-------------------------------------
type User = {
  user_id: number;
  username: string;
};

type AuthState = {
  user: User | undefined;
  isAuthRequestFinished: boolean;
};

const initialState = { user: undefined } as AuthState;
const AuthContext = createContext(initialState);

function AuthProvider({ children }: PropsWithChildren) {
  const { isFetched: isAuthRequestFinished, data: user } = useQuery<User>({
    queryKey: ['auth'],
    queryFn: async function () {
      // Simulate a slow network request
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const data = localStorage.getItem('user');
      const user = data ? JSON.parse(data) : null;
      return user;
    },
    staleTime: 0,
    retry: false,
  });

  console.log('AuthProvider', { user, isAuthRequestFinished });

  return <AuthContext.Provider value={{ user, isAuthRequestFinished }}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === initialState) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}

//-------------------------------------
//- Router
//-------------------------------------
type RootContext = {
  queryClient: QueryClient;
  auth: AuthState;
};

const rootRoute = createRootRouteWithContext<RootContext>()({
  beforeLoad: function ({ context }) {
    const { isAuthRequestFinished, user } = context.auth;
    // If we made a request and couldn't find a user, redirect to the login page
    console.log('beforeLoad', { isAuthRequestFinished, user });
    if (isAuthRequestFinished && !user) {
      throw redirect({ to: '/login' });
    }
  },
});

const homeRoute = createRoute({
  path: '/',
  component: () => <h1>Home</h1>,
  getParentRoute: () => rootRoute,
});

const loginRoute = createRoute({
  path: '/login',
  component: () => <h1>Login</h1>,
  getParentRoute: () => rootRoute,
});

const routeTree = rootRoute.addChildren([homeRoute, loginRoute]);

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: { user: undefined, isAuthRequestFinished: false },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

//-------------------------------------
//- App
//-------------------------------------
function InnerApp() {
  const { user, isAuthRequestFinished } = useAuth();
  return <RouterProvider router={router} context={{ queryClient, auth: { user, isAuthRequestFinished } }} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
