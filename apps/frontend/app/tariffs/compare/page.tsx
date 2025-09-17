// path: apps/frontend/app/tariffs/compare/page.tsx
import { tariffsAPI } from '@/lib/api/tariffs'
import { TariffsNav } from '@/components/tariffs/TariffsNav'
import { TariffCompareView } from '@/components/tariffs/TariffCompareView'

export const revalidate = 300

export default async function TariffsComparePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ ids?: string }> 
}) {
  const { ids } = await searchParams
  
  const idsList = (ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const [selectedTariffs, allTariffs, popular] = await Promise.all([
    idsList.length > 0 
      ? tariffsAPI.compare(idsList).catch(() => [])
      : Promise.resolve([]),
    tariffsAPI.active().catch(() => []),
    tariffsAPI.popular(3).catch(() => [])
  ])

  // Если нет выбранных тарифов, берем популярные
  const tariffsToCompare = selectedTariffs.length > 0 ? selectedTariffs : popular

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div 
          className="absolute w-96 h-96 top-20 left-1/4 flowing-orb-1 rounded-full opacity-30"
          style={{ filter: 'blur(40px)' }}
        />
        <div 
          className="absolute w-80 h-80 bottom-20 right-1/4 flowing-orb-3 rounded-full opacity-25" 
          style={{ filter: 'blur(35px)' }}
        />
      </div>

      <main className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TariffsNav />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <TariffCompareView 
            initialTariffs={tariffsToCompare}
            allTariffs={allTariffs}
            popularTariffs={popular}
          />
        </div>
      </main>
    </div>
  )
}
