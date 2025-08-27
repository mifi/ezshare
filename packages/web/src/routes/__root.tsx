import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';


// eslint-disable-next-line import/prefer-default-export
export const Route = createRootRoute({
  // eslint-disable-next-line no-use-before-define
  component: Root,
});

function Root() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}
