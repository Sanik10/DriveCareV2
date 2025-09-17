// path: apps/frontend/app/tariffs/[id]/page.tsx
import { tariffsAPI } from '@/lib/api/tariffs'
import { TariffsNav } from '@/components/tariffs/TariffsNav'
import { TariffDetailView } from '@/components/tariffs/TariffDetailView'
import { notFound } from 'next/navigation'

export const revalidate = 300

export default async function TariffDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  try {
    const tariff = await tariffsAPI.get(id)
    const allTariffs = await tariffsAPI.active().catch(() => [])
    const popular = await tariffsAPI.popular(3).catch(() => [])
    
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background orbs */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div 
            className="absolute w-96 h-96 top-20 -left-20 flowing-orb-1 rounded-full opacity-40"
            style={{ filter: 'blur(40px)' }}
          />
          <div 
            className="absolute w-80 h-80 bottom-20 right-10 flowing-orb-2 rounded-full opacity-30" 
            style={{ filter: 'blur(35px)' }}
          />
        </div>

        <main className="relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TariffsNav />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <TariffDetailView 
              tariff={tariff} 
              similarTariffs={allTariffs.filter(t => t.id !== tariff.id).slice(0, 3)}
              popularTariffs={popular}
            />
          </div>
        </main>
      </div>
    )
  } catch {
    notFound()
  }
}
