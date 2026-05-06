import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Authorization.css';

const REGISTER_API_URL = '/auth/users/';
const LOGIN_API_URL = '/auth/jwt/create/';
const CURRENT_USER_API_URL = '/auth/users/me/';

const getErrorMessage = (error, fallbackMessage) => {
	if (!error?.response?.data) {
		return fallbackMessage;
	}

	const payload = error.response.data;
	if (typeof payload === 'string') {
		return payload;
	}

	if (Array.isArray(payload)) {
		return payload.join(' ');
	}

	if (typeof payload === 'object') {
		const messages = Object.entries(payload).flatMap(([field, value]) => {
			const values = Array.isArray(value) ? value : [value];
			return values.map((item) => `${field}: ${item}`);
		});

		if (messages.length > 0) {
			return messages.join(' ');
		}
	}

	return fallbackMessage;
};

const Authorization = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [mode, setMode] = useState(() =>
		location.pathname === '/registration' ? 'register' : 'login',
	);
	const [registerData, setRegisterData] = useState({
		name: '',
		email: '',
		password: '',
	});
	const [loginData, setLoginData] = useState({
		username: '',
		password: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const handleRegisterChange = (event) => {
		const { name, value } = event.target;
		setRegisterData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleLoginChange = (event) => {
		const { name, value } = event.target;
		setLoginData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	useEffect(() => {
		setMode(location.pathname === '/registration' ? 'register' : 'login');
	}, [location.pathname]);

	const switchMode = (nextMode) => {
		setMode(nextMode);
		setError('');
		setSuccess('');
		navigate(nextMode === 'register' ? '/registration' : '/login');
	};

	const handleRegisterSubmit = async (event) => {
		event.preventDefault();
		setError('');
		setSuccess('');
		setIsSubmitting(true);

		try {
			await axios.post(REGISTER_API_URL, {
				username: registerData.name.trim(),
				first_name: registerData.name.trim(),
				email: registerData.email.trim(),
				password: registerData.password,
			});

			setSuccess('Регистрация прошла успешно. Теперь можно войти в аккаунт.');
			setRegisterData({
				name: '',
				email: '',
				password: '',
			});
			setLoginData((prev) => ({
				...prev,
				username: prev.username || registerData.name.trim(),
			}));
			setMode('login');
		} catch (err) {
			setError(
				getErrorMessage(err, 'Не удалось выполнить регистрацию. Проверьте данные и попробуйте снова.'),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLoginSubmit = async (event) => {
		event.preventDefault();
		setError('');
		setSuccess('');
		setIsSubmitting(true);

		try {
			const response = await axios.post(LOGIN_API_URL, {
				username: loginData.username.trim(),
				password: loginData.password,
			});

			const { access, refresh } = response.data;
			localStorage.setItem('accessToken', access);
			localStorage.setItem('refreshToken', refresh);

			axios.defaults.headers.common.Authorization = `Bearer ${access}`;

			try {
				const meResponse = await axios.get(CURRENT_USER_API_URL);
				localStorage.setItem('currentUser', JSON.stringify(meResponse.data));
			} catch {
				localStorage.removeItem('currentUser');
			}

			setSuccess('Вход выполнен успешно. Перенаправляем на главную...');
			navigate('/');
		} catch (err) {
			setError(
				getErrorMessage(err, 'Не удалось выполнить вход. Проверьте логин и пароль.'),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="auth-page">
			<section className="auth-card" aria-labelledby="registration-title">
				<h1 id="registration-title" className="auth-title">
					{mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
				</h1>
				<p className="auth-subtitle">
					{mode === 'login'
						? 'Войдите, чтобы получить доступ к профилю, корзине и заказам.'
						: 'Создайте аккаунт, чтобы покупать товары и отслеживать заказы.'}
				</p>

				<div className="auth-switcher" role="tablist" aria-label="Переключение формы авторизации">
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'login'}
						className={`auth-switcher__btn ${mode === 'login' ? 'is-active' : ''}`}
						onClick={() => switchMode('login')}
						disabled={isSubmitting}
					>
						Вход
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'register'}
						className={`auth-switcher__btn ${mode === 'register' ? 'is-active' : ''}`}
						onClick={() => switchMode('register')}
						disabled={isSubmitting}
					>
						Регистрация
					</button>
				</div>

				<form
					className="auth-form"
					onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit}
				>
					{error ? (
						<p className="auth-message auth-message--error" role="alert">
							{error}
						</p>
					) : null}
					{success ? (
						<p className="auth-message auth-message--success" role="status">
							{success}
						</p>
					) : null}

					{mode === 'register' ? (
						<>
							<label className="auth-field">
								<span>Имя</span>
								<input
									type="text"
									name="name"
									placeholder="Введите имя"
									autoComplete="name"
									value={registerData.name}
									onChange={handleRegisterChange}
									required
								/>
							</label>

							<label className="auth-field">
								<span>Email</span>
								<input
									type="email"
									name="email"
									placeholder="example@mail.com"
									autoComplete="email"
									value={registerData.email}
									onChange={handleRegisterChange}
									required
								/>
							</label>
						</>
					) : (
						<label className="auth-field">
							<span>Логин</span>
							<input
								type="text"
								name="username"
								placeholder="Введите username"
								autoComplete="username"
								value={loginData.username}
								onChange={handleLoginChange}
								required
							/>
						</label>
					)}

					<label className="auth-field">
						<span>Пароль</span>
						<input
							type="password"
							name="password"
							placeholder={mode === 'login' ? 'Введите пароль' : 'Минимум 8 символов'}
							autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
							value={mode === 'login' ? loginData.password : registerData.password}
							onChange={mode === 'login' ? handleLoginChange : handleRegisterChange}
							minLength={mode === 'register' ? 8 : undefined}
							required
						/>
					</label>

					<div className="auth-actions">
						<button
							type="submit"
							className="auth-btn auth-btn--primary"
							disabled={isSubmitting}
						>
							{isSubmitting
								? mode === 'login'
									? 'Входим...'
									: 'Регистрируем...'
								: mode === 'login'
									? 'Войти'
									: 'Зарегистрироваться'}
						</button>
					</div>
				</form>
			</section>
		</main>
	);
};

export default Authorization;
