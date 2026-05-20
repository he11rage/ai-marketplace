import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function EmptyState({ 
  title, 
  description, 
  actionLabel = "Перейти в каталог", 
  icon = "cart",
  onAction, // Optional custom action callback.
}) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate('/catalog');
    }
  };

  const icons = {
    cart: (
      <svg className="w-16 h-16 text-text-placeholder mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    ),
    box: (
      <svg className="w-16 h-16 text-text-placeholder mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
    heart: (
      <svg className="w-16 h-16 text-text-placeholder mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
    )
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade">
      {icons[icon]}
      <h3 className="text-xl font-bold mb-2 text-text-primary">{title}</h3>
      <p className="text-text-secondary mb-6 max-w-sm">{description}</p>
      <Button onClick={handleAction}>{actionLabel}</Button>
    </div>
  );
}