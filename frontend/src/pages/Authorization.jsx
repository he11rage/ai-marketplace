import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { USER_ROLES } from '../utils/roles';

export default function Authorization() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirm_password: '',
    role: USER_ROLES.BUYER,
  });
  const { login, register, isLoading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login(formData.username, formData.password);
    } else {
      if (formData.password !== formData.confirm_password) {
        alert('Пароли не совпадают');
        return;
      }
      await register({
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Добро пожаловать</h1>
          <p className="text-text-secondary mt-1">Ваш AI-маркетплейс</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="flex gap-1 p-1 bg-[#F2F2F7] rounded-xl mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${isLogin ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'}`}>Вход</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${!isLogin ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'}`}>Регистрация</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="text" placeholder="Логин" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
            <Input type="password" placeholder="Пароль" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            
            {!isLogin && (
              <>
                <Input type="password" placeholder="Подтвердите пароль" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} required />
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Роль на платформе</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: USER_ROLES.BUYER })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                        formData.role === USER_ROLES.BUYER
                          ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                          : 'bg-[#F2F2F7] border-transparent text-text-secondary'
                      }`}
                    >
                      Покупатель
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: USER_ROLES.SELLER })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                        formData.role === USER_ROLES.SELLER
                          ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                          : 'bg-[#F2F2F7] border-transparent text-text-secondary'
                      }`}
                    >
                      Продавец
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-[#FF3B30] text-center">{error?.message || 'Ошибка'}</p>}

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}