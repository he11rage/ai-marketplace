import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold text-text-primary mb-3">Страница не найдена</h1>
      <p className="text-text-secondary mb-6">
        Возможно, страница была удалена или вы перешли по неверной ссылке.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Назад
        </Button>
        <Button onClick={() => navigate('/')}>На главную</Button>
      </div>
    </div>
  );
}

