// path: apps/frontend/components/tariffs/TariffFAQ.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'Можно ли изменить тариф в любое время?',
    answer: 'Да, вы можете повысить или понизить тариф в любое время. При повышении тарифа доплата рассчитывается пропорционально. При понижении изменения применяются с следующего платёжного периода.'
  },
  {
    question: 'Что происходит при превышении лимитов?',
    answer: 'При приближении к лимитам мы отправляем уведомления. При превышении некоторые функции могут быть временно ограничены. Мы всегда предложим перейти на подходящий тариф.'
  },
  {
    question: 'Есть ли скидки для некоммерческих организаций?',
    answer: 'Да, мы предоставляем специальные условия для образовательных учреждений, некоммерческих организаций и стартапов. Свяжитесь с нами для получения персонального предложения.'
  },
  {
    question: 'Как происходит процесс оплаты?',
    answer: 'Оплата происходит автоматически с привязанной карты или через банковский перевод. Мы поддерживаем все основные платёжные системы и выставляем документы согласно требованиям 54-ФЗ.'
  },
  {
    question: 'Можно ли получить возврат средств?',
    answer: 'Да, мы предоставляем возврат неиспользованной части при отмене подписки. Возврат обрабатывается в течение 5-10 рабочих дней.'
  },
  {
    question: 'Включена ли техническая поддержка во все тарифы?',
    answer: 'Базовая поддержка включена во все тарифы. На тарифах Premium и Enterprise доступна приоритетная поддержка с выделенным менеджером и гарантированным временем ответа.'
  }
]

export function TariffFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <HelpCircle className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Часто задаваемые вопросы</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Ответы на популярные вопросы о тарифах, оплате и возможностях платформы
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <Card key={index} className="glass border-border/30 rounded-2xl overflow-hidden">
            <button
              className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/5 transition-colors"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <h3 className="font-semibold pr-4">{item.question}</h3>
              <ChevronDown 
                className={`w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
                  openIndex === index ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            <div 
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
              `}
            >
              <div className="px-6 pb-6 border-t border-border/20">
                <p className="text-muted-foreground leading-relaxed pt-4">
                  {item.answer}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
