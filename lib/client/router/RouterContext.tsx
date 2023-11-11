import type { Routes } from "./types";

import {
  ComponentProps,
  ComponentType,
  LazyExoticComponent,
  RefObject,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createBrowserHistory, History, Location } from "history";

interface RouteDefinition {
  Component: LazyExoticComponent<ComponentType<any>>;
  loader: (() => Promise<unknown>) | null;
  path: string;
}

interface RouteProps {
  Component: LazyExoticComponent<ComponentType<any>>;
  path: string;
}

export const Route = (props: RouteProps) => {
  const { Component } = props;
  const { location, routeDataRef, history } = useContext(RouterContext);
  if (location.pathname !== props.path) {
    return null;
  }
  const data = routeDataRef.current?.get(props.path);
  if (data?.redirect) {
    history.push(data.redirect);
    return <></>;
  }
  return <Component data={routeDataRef.current?.get(props.path)} />;
};

export const Layout = (props: RouteProps) => {
  const { Component } = props;
  const { location, routeDataRef, history } = useContext(RouterContext);
  if (location.pathname !== props.path) {
    return null;
  }
  const data = routeDataRef.current?.get(props.path);
  if (data?.redirect) {
    history.push(data.redirect);
    return <></>;
  }
  return <Component data={routeDataRef.current?.get(props.path)} />;
};

interface RouterContextValue {
  location: Location;
  history: History;
  routes: RouteDefinition[];
  routeDataRef: RefObject<Map<string, Readonly<any>>>;
}
const RouterContext = createContext({} as RouterContextValue);

let history: History;

if (!import.meta.env.SSR) {
  history = createBrowserHistory();
}

interface RouterProviderProps {
  initialPath: string;
  routes: RouteDefinition[];
  layouts: Record<string, LazyExoticComponent<ComponentType<any>>>;
  initialRouteData: Readonly<any>;
}

export const RouterProvider = (props: RouterProviderProps) => {
  const { initialPath, routes } = props;
  const routeDataRef = useRef(
    (() => {
      const map = new Map<string, Readonly<any>>();
      map.set(initialPath, props.initialRouteData);
      return map;
    })(),
  );

  const [location, setLocation] = useState<Location>({
    hash: "",
    key: "",
    pathname: initialPath,
    search: "",
    state: {},
  });

  useEffect(() => {
    history.listen((update) => {
      setLocation({ ...update.location });
    });
  }, []);

  return (
    <RouterContext.Provider
      value={{ location, history, routes, layouts, routeDataRef }}
    >
      {routes.map(({ Component, path }) => (
        <Route path={path} Component={Component} key={path} />
      ))}
    </RouterContext.Provider>
  );
};

const routeManifest = {
  "/": {
    layout: "PublicLayout",
    routes: {
      "/": {
        view: "Home",
        hasLoader: true,
      },
      "/about": {
        view: "About",
        hasLoader: true,
      },
    },
  },
};

interface LinkProps extends Omit<ComponentProps<"a">, "href"> {
  href: keyof Routes;
}

export const Link = (props: LinkProps) => {
  const { href, onClick = () => {}, ...rest } = props;
  const { history, routes, routeDataRef } = useContext(RouterContext);
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
        let loader = () => Promise.resolve({} as unknown);
        const route = routes.find((route) => route.path === href);
        if (route && typeof route.loader === "function") {
          loader = route.loader;
        }
        loader()
          .then((data) => {
            if (data.redirect) {
              history.push(data.redirect);
            } else {
              routeDataRef.current?.set(route?.path!, data as any);
              history.push(href);
            }
          })
          .catch(console.log);
      }}
      {...rest}
    >
      {props.children}
    </a>
  );
};
