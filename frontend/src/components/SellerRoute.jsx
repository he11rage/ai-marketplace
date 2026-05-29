import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import { isSeller } from '../utils/roles';

export default function SellerRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  const { data: user, isLoading, isFetching, isError } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiEndpoints.me().then((res) => res.data),
    enabled: !!token,
    refetchOnMount: 'always',
  });

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isLoading || isFetching) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-20 text-center text-text-secondary">
        Проверяем права доступа...
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isSeller(user)) {
    return <Navigate to="/account" replace state={{ sellerOnly: true }} />;
  }

  return children;
}
