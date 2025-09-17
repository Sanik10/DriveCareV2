// path: apps/frontend/app/tariffs/page.tsx
import { tariffsAPI } from '@/lib/api/tariffs'
import { TariffHero } from '@/components/tariffs/TariffHero'
import { TariffsNav } from '@/components/tariffs/TariffsNav'
import { TariffShowcase } from '@/components/tariffs/TariffShowcase'
import { TariffFAQ } from '@/components/tariffs/TariffFAQ'
import { TariffCTA } from '@/components/tariffs/TariffCTA'

export const revalidate = 300

export default async function TariffsPage() {
  const [tariffs, popular] = await Promise.all([
    tariffsAPI.active().catch(() => []),
    tariffsAPI.popular(6).catch(() => []),
  ])
  
  const popularIds = new Set(popular.map((t) => t.id))

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Flowing background orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div 
          className="absolute w-96 h-96 top-20 -left-20 flowing-orb-1 rounded-full opacity-60"
          style={{ filter: 'blur(40px)' }}
        />
        <div 
          className="absolute w-80 h-80 top-40 right-10 flowing-orb-2 rounded-full opacity-50" 
          style={{ filter: 'blur(35px)' }}
        />
        <div 
          className="absolute w-72 h-72 bottom-20 left-1/3 flowing-orb-3 rounded-full opacity-40"
          style={{ filter: 'blur(30px)' }}
        />
        <div 
          className="absolute w-64 h-64 bottom-40 -right-16 flowing-orb-4 rounded-full opacity-30"
          style={{ filter: 'blur(25px)' }}
        />
      </div>

      <main className="relative z-10">
        {/* Navigation */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TariffsNav />
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <TariffHero />
        </section>

        {/* Main Tariffs Showcase - КАТАЛОГ ВСЕХ ТАРИФОВ */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <TariffShowcase tariffs={tariffs} popularIds={[...popularIds]} />
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <TariffFAQ />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <TariffCTA />
          </div>
        </section>
      </main>
    </div>
  )
}
