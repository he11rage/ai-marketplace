import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';
import Button from './ui/Button';
import Input from './ui/Input';

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function ProductQuestions({ productId, storeId }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [activeAnswerId, setActiveAnswerId] = useState(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [answerError, setAnswerError] = useState('');

  const { data: questions = [], isLoading, isError, error } = useQuery({
    queryKey: ['product-questions', productId],
    queryFn: () => apiEndpoints.getProductQuestions(productId).then((res) => res.data || []),
    enabled: Boolean(productId),
  });

  const token = localStorage.getItem('access_token');
  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiEndpoints.me().then((res) => res.data),
    enabled: !!token,
  });

  const { data: store } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => apiEndpoints.getStore(storeId).then((res) => res.data),
    enabled: Boolean(storeId),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => apiEndpoints.createProductQuestion(productId, payload).then((res) => res.data),
    onSuccess: () => {
      setQuestion('');
      setSubmitError('');
      queryClient.invalidateQueries({ queryKey: ['product-questions', productId] });
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === 'string' ? e.response.data : null) ||
        'Не удалось отправить вопрос.';
      setSubmitError(msg);
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, payload }) =>
      apiEndpoints.answerProductQuestion(productId, questionId, payload).then((res) => res.data),
    onSuccess: () => {
      setActiveAnswerId(null);
      setAnswerDraft('');
      setAnswerError('');
      queryClient.invalidateQueries({ queryKey: ['product-questions', productId] });
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === 'string' ? e.response.data : null) ||
        'Не удалось отправить ответ.';
      setAnswerError(msg);
    },
  });

  const canSubmit = useMemo(() => {
    const q = question.trim();
    if (!q) return false;
    if (createMutation.isPending) return false;
    return true;
  }, [question, createMutation.isPending]);

  const isOwner = store && currentUser ? store.owner_id === currentUser.id : false;

  const onSubmit = async () => {
    setSubmitError('');
    const payload = {
      question: question.trim(),
    };

    const name = guestName.trim();
    const email = guestEmail.trim();
    if (name) payload.guest_name = name;
    if (email) payload.guest_email = email;

    await createMutation.mutateAsync(payload);
  };

  return (
    <div className="mt-12 bg-white rounded-2xl shadow-subtle p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">Вопросы о товаре</h2>
        <div className="text-sm text-text-secondary">
          {questions.length} шт.
        </div>
      </div>

      <div className="border border-[#F2F2F7] rounded-2xl p-5 mb-8">
        <h3 className="font-semibold mb-4">Задать вопрос</h3>

        {submitError && (
          <div className="mb-4 text-sm text-[#FF3B30]">{submitError}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Ваше имя (для гостей)"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Например, Иван"
          />
          <Input
            label="Email (для гостей)"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="name@example.com"
            type="email"
          />

          <label className="block md:col-span-2">
            <div className="text-sm font-medium text-text-secondary mb-2">Вопрос</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 outline-none resize-none border border-[#E5E5EA] focus:bg-white focus:border-[#007AFF] transition"
              placeholder="Например: Есть ли гарантия? Когда будет доставка?"
            />
            <div className="mt-2 text-xs text-text-secondary">
              Если вы не авторизованы, укажите имя или email — так продавцу проще ответить.
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {createMutation.isPending ? 'Отправляем…' : 'Отправить вопрос'}
          </Button>
          {createMutation.isPending && (
            <span className="text-sm text-text-secondary">Пожалуйста, подождите</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-text-secondary">Загрузка вопросов…</div>
      ) : isError ? (
        <div className="text-sm text-[#FF3B30]">
          Не удалось загрузить вопросы. {error?.message || ''}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-text-secondary">Пока нет вопросов. Будьте первым.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border border-[#F2F2F7] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="font-semibold">
                  {q.guest_name || (q.user ? `Пользователь #${q.user}` : 'Покупатель')}
                </div>
                <div className="text-xs text-text-secondary">
                  {formatDateTime(q.created_at)}
                </div>
              </div>
              <div className="mt-3 text-sm text-text-secondary leading-relaxed">
                {q.question}
              </div>

              {q.answer ? (
                <div className="mt-4 bg-[#F2F2F7] rounded-xl p-4">
                  <div className="text-sm font-semibold mb-1">Ответ продавца</div>
                  <div className="text-sm text-text-secondary leading-relaxed">
                    {q.answer}
                  </div>
                  {q.answered_at && (
                    <div className="mt-2 text-xs text-text-secondary">
                      {formatDateTime(q.answered_at)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="text-xs text-text-secondary">Ожидает ответа</div>

                  {isOwner && (
                    <div className="mt-3">
                      {answerError && activeAnswerId === q.id && (
                        <div className="mb-2 text-sm text-[#FF3B30]">{answerError}</div>
                      )}

                      {activeAnswerId !== q.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAnswerError('');
                            setActiveAnswerId(q.id);
                            setAnswerDraft('');
                          }}
                          className="text-sm text-[#007AFF] hover:underline"
                        >
                          Ответить
                        </button>
                      ) : (
                        <div className="mt-2 space-y-3">
                          <textarea
                            value={answerDraft}
                            onChange={(e) => setAnswerDraft(e.target.value)}
                            rows={3}
                            className="w-full bg-white rounded-xl px-4 py-3 outline-none resize-none border border-[#E5E5EA] focus:border-[#007AFF] transition"
                            placeholder="Введите ответ покупателю"
                          />
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() =>
                                answerMutation.mutate({
                                  questionId: q.id,
                                  payload: { answer: answerDraft.trim() },
                                })
                              }
                              disabled={!answerDraft.trim() || answerMutation.isPending}
                            >
                              {answerMutation.isPending ? 'Отправляем…' : 'Отправить ответ'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setActiveAnswerId(null);
                                setAnswerDraft('');
                                setAnswerError('');
                              }}
                              disabled={answerMutation.isPending}
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

