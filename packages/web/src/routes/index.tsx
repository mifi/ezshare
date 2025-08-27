import { createFileRoute, redirect } from '@tanstack/react-router';


// eslint-disable-next-line import/prefer-default-export
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/dir/$dirId', params: { dirId: '/' } });
  },
});
