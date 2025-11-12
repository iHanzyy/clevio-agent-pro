import NotFound404 from '@/components/NotFound404';

export const metadata = {
  title: '404 - Page Not Found',
  description: "The page you're looking for doesn't exist",
};

export default function NotFound() {
  return <NotFound404 />;
}
