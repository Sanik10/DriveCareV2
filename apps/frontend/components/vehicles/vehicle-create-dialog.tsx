// path: apps/frontend/components/vehicles/vehicle-create-dialog.tsx
"use client"

import * as React from "react"
import { Car, Plus, User } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { vehiclesAPI } from "@/lib/api/vehicles"
import { vehiclesCatalogueAPI } from "@/lib/api/vehicles-catalogue"
import { customersAPI } from "@/lib/api/customers"

import type { VehicleResponse, CreateVehicleRequest, EngineType } from "@/lib/types/vehicles"
import type { CatalogueBrand, CatalogueModel, CatalogueType } from "@/lib/types/vehicles-catalogue"
import type { CustomerResponse } from "@/lib/types/customers"
import { cn } from "@/lib/utils"

import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (v: VehicleResponse) => void
}

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: "petrol", label: "Бензин" },
  { value: "diesel", label: "Дизель" },
  { value: "hybrid", label: "Гибрид" },
  { value: "electric", label: "Электро" },
]

function parseSmart(text: string) {
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[0]
  const plateMatch = text.match(/([A-ZА-Я0-9-]{5,12})/i)?.[0]
  const mileageMatch = text.match(/(\d{1,7})\s?(км|km)/i)?.[1]
  const yearMatch = text.match(/\b(19[5-9]\d|20[0-4]\d|2050)\b/)?.[0]
  const volumeCcMatch = text.match(/(\d{3,5})\s?(см3|см³|cc)/i)?.[1]
  const volumeLMatch = text.match(/(\d+(?:[.,]\d)?)\s?л\b/i)?.[1]

  let engineVolumeLiters: string | undefined = undefined
  if (volumeLMatch) {
    const n = parseFloat(volumeLMatch.replace(",", "."))
    if (Number.isFinite(n)) engineVolumeLiters = String(n)
  } else if (volumeCcMatch) {
    const cc = parseInt(volumeCcMatch, 10)
    if (Number.isFinite(cc)) engineVolumeLiters = (cc / 1000).toFixed(1)
  }

  return {
    vin: vinMatch?.toUpperCase() || "",
    licensePlate: plateMatch?.toUpperCase() || "",
    mileage: mileageMatch ? parseInt(mileageMatch, 10) : undefined,
    year: yearMatch ? parseInt(yearMatch, 10) : undefined,
    engineVolumeLiters,
  }
}

type CatalogueItem = { id: string; name: string }

function AutocompleteField<T extends CatalogueItem>({
  label,
  required,
  placeholder,
  value,
  onValueChange,
  matches,
  onSelect,
  createLabel,
  onCreate,
  creating,
  disabled,
  helpText,
}: {
  label: string
  required?: boolean
  placeholder?: string
  value: string
  onValueChange: (v: string) => void
  matches: T[]
  onSelect: (item: T) => void
  createLabel?: string
  onCreate?: () => void | Promise<void>
  creating?: boolean
  disabled?: boolean
  helpText?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="relative">
      <Input
        label={label}
        required={required}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />

      {helpText && <div className="mt-xs text-xs text-muted-foreground">{helpText}</div>}

      {open && !disabled && (matches.length > 0 || (createLabel && value.trim())) && (
        <div
          className={cn(
            "absolute z-50 mt-xs w-full overflow-hidden rounded-md border border-border bg-card",
            "max-h-56 overflow-auto"
          )}
        >
          {createLabel && value.trim() && onCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void onCreate()}
              disabled={creating}
              className={cn(
                "w-full text-left px-md py-sm text-sm",
                "text-primary hover:bg-surface-2 transition-colors",
                creating && "opacity-60"
              )}
            >
              <Plus className="inline h-4 w-4 mr-xs" />
              {creating ? "Создание…" : createLabel}
            </button>
          )}

          {matches.map((it) => (
            <button
              key={it.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(it)}
              className="w-full text-left px-md py-sm text-sm hover:bg-surface-2 transition-colors"
            >
              {it.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function VehicleCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [brands, setBrands] = React.useState<CatalogueBrand[]>([])
  const [models, setModels] = React.useState<CatalogueModel[]>([])
  const [types, setTypes] = React.useState<CatalogueType[]>([])

  // Catalogue selection
  const [brandId, setBrandId] = React.useState("")
  const [modelId, setModelId] = React.useState("")
  const [vehicleTypeId, setVehicleTypeId] = React.useState("")

  const [brandName, setBrandName] = React.useState("")
  const [modelName, setModelName] = React.useState("")
  const [typeName, setTypeName] = React.useState("")

  // Vehicle fields
  const [vin, setVin] = React.useState("")
  const [licensePlate, setLicensePlate] = React.useState("")
  const [mileage, setMileage] = React.useState("")

  const [year, setYear] = React.useState("")
  const [color, setColor] = React.useState("")
  const [engineType, setEngineType] = React.useState<EngineType | "">("")
  const [engineVolume, setEngineVolume] = React.useState("")

  const [lastServiceDate, setLastServiceDate] = React.useState("")
  const [nextServiceDate, setNextServiceDate] = React.useState("")

  const [notes, setNotes] = React.useState("")

  // Customer picker
  const [customerQuery, setCustomerQuery] = React.useState("")
  const [customerResults, setCustomerResults] = React.useState<CustomerResponse[]>([])
  const [customerId, setCustomerId] = React.useState("")
  const [customerLabel, setCustomerLabel] = React.useState("")

  // UI
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [openCustomerCreate, setOpenCustomerCreate] = React.useState(false)

  const [creatingBrand, setCreatingBrand] = React.useState(false)
  const [creatingModel, setCreatingModel] = React.useState(false)
  const [creatingType, setCreatingType] = React.useState(false)

  const [showAdvanced, setShowAdvanced] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      try {
        const [b, m, t] = await Promise.all([
          vehiclesCatalogueAPI.brands({ limit: 500 }),
          vehiclesCatalogueAPI.models({ limit: 1000 }),
          vehiclesCatalogueAPI.types({ limit: 200 }),
        ])

        if (!cancelled) {
          setBrands(b)
          setModels(m)
          setTypes(t)
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  const filteredModels = React.useMemo(() => {
    if (!brandId) return models
    return models.filter((m) => m.brandId === brandId || m.brand?.id === brandId)
  }, [models, brandId])

  // Customer search
  React.useEffect(() => {
    if (!open) return

    const q = customerQuery.trim()
    if (!q) {
      setCustomerResults([])
      return
    }

    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const res = await customersAPI.getCustomers({ search: q, page: 1, limit: 5 })
        if (!cancelled) setCustomerResults(res.items)
      } catch {
        if (!cancelled) setCustomerResults([])
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [customerQuery, open])

  const handlePasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const text = e.clipboardData.getData("text")
    if (!text) return

    const parsed = parseSmart(text)

    if (parsed.vin) setVin((v) => v || parsed.vin)
    if (parsed.licensePlate) setLicensePlate((v) => v || parsed.licensePlate)
    if (parsed.mileage !== undefined) setMileage((v) => v || String(parsed.mileage))
    if (parsed.year !== undefined) setYear((v) => v || String(parsed.year))
    if (parsed.engineVolumeLiters !== undefined) setEngineVolume((v) => v || String(parsed.engineVolumeLiters))
  }

  const afterCreateCustomer = (c: CustomerResponse) => {
    setCustomerId(c.id)
    const label =
      [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.email || c.id
    setCustomerLabel(label)
    setOpenCustomerCreate(false)
  }

  const brandMatches = React.useMemo(() => {
    const q = brandName.trim().toLowerCase()
    const src = brands
    if (!q) return src.slice(0, 20)
    return src.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 20)
  }, [brands, brandName])

  const modelMatches = React.useMemo(() => {
    const q = modelName.trim().toLowerCase()
    const src = filteredModels
    if (!q) return src.slice(0, 20)
    return src.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 20)
  }, [filteredModels, modelName])

  const typeMatches = React.useMemo(() => {
    const q = typeName.trim().toLowerCase()
    const src = types
    if (!q) return src.slice(0, 20)
    return src.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 20)
  }, [types, typeName])

  const createBrandInline = React.useCallback(async () => {
    const name = brandName.trim()
    if (!name) return
    setCreatingBrand(true)
    try {
      const b = await vehiclesCatalogueAPI.ensureBrand(name)
      setBrandId(b.id)
      setBrandName(b.name)
      setModelId("")
      setModelName("")
      if (!brands.find((x) => x.id === b.id)) setBrands((prev) => [...prev, b])
    } finally {
      setCreatingBrand(false)
    }
  }, [brandName, brands])

  const createTypeInline = React.useCallback(async () => {
    const name = typeName.trim()
    if (!name) return
    setCreatingType(true)
    try {
      const t = await vehiclesCatalogueAPI.ensureType(name)
      setVehicleTypeId(t.id)
      setTypeName(t.name)
      if (!types.find((x) => x.id === t.id)) setTypes((prev) => [...prev, t])
    } finally {
      setCreatingType(false)
    }
  }, [typeName, types])

  const createModelInline = React.useCallback(async () => {
    const name = modelName.trim()
    if (!name) return
    if (!brandId) {
      setError("Сначала выберите бренд")
      return
    }

    setCreatingModel(true)
    try {
      const m = await vehiclesCatalogueAPI.ensureModel(name, brandId)
      setModelId(m.id)
      setModelName(m.name)
      if (!models.find((x) => x.id === m.id)) setModels((prev) => [...prev, m])
    } finally {
      setCreatingModel(false)
    }
  }, [modelName, brandId, models])

  const ensureCatalogueIds = React.useCallback(async () => {
    let ensuredBrandId = brandId
    let ensuredModelId = modelId
    let ensuredTypeId = vehicleTypeId

    // brand
    if (!ensuredBrandId && brandName.trim()) {
      const b = await vehiclesCatalogueAPI.ensureBrand(brandName.trim())
      ensuredBrandId = b.id
      setBrandId(b.id)
      setBrandName(b.name)
      setModelId("")
      setModelName("")
      if (!brands.find((x) => x.id === b.id)) setBrands((prev) => [...prev, b])
    }

    // type
    if (!ensuredTypeId && typeName.trim()) {
      const t = await vehiclesCatalogueAPI.ensureType(typeName.trim())
      ensuredTypeId = t.id
      setVehicleTypeId(t.id)
      setTypeName(t.name)
      if (!types.find((x) => x.id === t.id)) setTypes((prev) => [...prev, t])
    }

    // model
    if (!ensuredModelId && modelName.trim()) {
      if (!ensuredBrandId) {
        throw new Error("Сначала выберите бренд")
      }
      const m = await vehiclesCatalogueAPI.ensureModel(modelName.trim(), ensuredBrandId)
      ensuredModelId = m.id
      setModelId(m.id)
      setModelName(m.name)
      if (!models.find((x) => x.id === m.id)) setModels((prev) => [...prev, m])
    }

    return { ensuredBrandId, ensuredModelId, ensuredTypeId }
  }, [brandId, modelId, vehicleTypeId, brandName, modelName, typeName, brands, types, models])

  const resetForm = React.useCallback(() => {
    setBrandId("")
    setModelId("")
    setVehicleTypeId("")
    setBrandName("")
    setModelName("")
    setTypeName("")

    setVin("")
    setLicensePlate("")
    setMileage("")
    setYear("")
    setColor("")
    setEngineType("")
    setEngineVolume("")
    setLastServiceDate("")
    setNextServiceDate("")
    setNotes("")

    setCustomerQuery("")
    setCustomerResults([])
    setCustomerId("")
    setCustomerLabel("")

    setError(null)
    setShowAdvanced(false)
  }, [])

  const submit = React.useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { ensuredBrandId, ensuredModelId, ensuredTypeId } = await ensureCatalogueIds()

      if (!customerId) throw new Error("Укажите владельца (клиента)")
      if (!ensuredBrandId) throw new Error("Выберите или создайте бренд")
      if (!ensuredModelId) throw new Error("Выберите или создайте модель")
      if (!ensuredTypeId) throw new Error("Выберите или создайте тип автомобиля")

      const vinOk = !vin || /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
      if (vin && !vinOk) throw new Error("VIN должен содержать 17 символов (без I, O, Q)")

      const y = year ? parseInt(year, 10) : undefined
      if (y && (y < 1950 || y > 2050)) throw new Error("Год выпуска должен быть в диапазоне 1950–2050")

      const vol = engineVolume?.trim() ? parseFloat(engineVolume.replace(",", ".")) : undefined
      if (engineVolume && (!Number.isFinite(vol!) || (vol ?? 0) <= 0)) {
        throw new Error("Объем двигателя должен быть положительным числом (в литрах)")
      }

      const payload: CreateVehicleRequest = {
        customerId,
        modelId: ensuredModelId,
        vehicleTypeId: ensuredTypeId,
        vin: vin ? vin.toUpperCase() : undefined,
        licensePlate: licensePlate ? licensePlate.toUpperCase() : undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        year: y,
        color: color?.trim() || undefined,
        engineType: engineType || undefined,
        engineVolume: typeof vol === "number" ? vol : undefined,
        notes: notes?.trim() || undefined,
      }

      const created = await vehiclesAPI.createVehicle(payload)

      // даты ТО — отдельным запросом (если заполнены)
      if ((lastServiceDate && lastServiceDate.trim()) || (nextServiceDate && nextServiceDate.trim())) {
        try {
          await vehiclesAPI.updateVehicle(created.id, {
            lastServiceDate: lastServiceDate || undefined,
            nextServiceDate: nextServiceDate || undefined,
          })
        } catch {
          // ignore
        }
      }

      onCreated?.(created)
      onOpenChange(false)
      resetForm()
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка создания автомобиля")
      } catch {
        setError((e as Error).message || "Ошибка создания автомобиля")
      }
    } finally {
      setSubmitting(false)
    }
  }, [
    ensureCatalogueIds,
    customerId,
    vin,
    licensePlate,
    mileage,
    year,
    color,
    engineType,
    engineVolume,
    notes,
    lastServiceDate,
    nextServiceDate,
    onCreated,
    onOpenChange,
    resetForm,
  ])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submit])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" onPaste={handlePasteSmart}>
          <DialogHeader>
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <DialogTitle>Добавить автомобиль</DialogTitle>
                <DialogDescription>
                  Создайте ТС в базе. Можно вставить в форму VIN/номер/год/пробег обычным текстом.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-lg">
            {/* Owner */}
            <div className="grid gap-md">
              <div className="text-sm font-semibold text-foreground">Владелец</div>

              {customerId ? (
                <div className="rounded-md border border-border p-md flex items-center justify-between gap-md">
                  <div className="min-w-0 flex items-center gap-sm">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="text-sm font-medium text-foreground truncate">{customerLabel}</div>
                  </div>

                  <div className="flex items-center gap-sm shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCustomerId("")
                        setCustomerLabel("")
                      }}
                    >
                      Сменить
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenCustomerCreate(true)}>
                      Новый клиент
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-sm">
                  <div className="relative">
                    <Input
                      label="Клиент *"
                      required
                      placeholder="Имя / компания / email / телефон"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />

                    {customerResults.length > 0 && (
                      <div className="absolute z-50 mt-xs w-full overflow-hidden rounded-md border border-border bg-card max-h-56 overflow-auto">
                        {customerResults.map((c) => {
                          const label =
                            [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                            c.companyName ||
                            c.email ||
                            c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCustomerId(c.id)
                                setCustomerLabel(label)
                                setCustomerResults([])
                                setCustomerQuery("")
                              }}
                              className="w-full text-left px-md py-sm text-sm hover:bg-surface-2 transition-colors"
                            >
                              {label}
                            </button>
                          )
                        })}

                        <div className="border-t border-border/50">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setOpenCustomerCreate(true)}
                            className="w-full text-left px-md py-sm text-sm text-primary hover:bg-surface-2 transition-colors"
                          >
                            <Plus className="inline h-4 w-4 mr-xs" />
                            Создать нового клиента
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setOpenCustomerCreate(true)}>
                      <Plus className="w-4 h-4 mr-xs" />
                      Новый клиент
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Catalogue */}
            <div className="grid gap-md">
              <div className="text-sm font-semibold text-foreground">Автомобиль</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <AutocompleteField<CatalogueBrand>
                  label="Бренд"
                  required
                  placeholder="Например: Toyota"
                  value={brandName}
                  onValueChange={(v) => {
                    setBrandName(v)
                    setBrandId("")
                    setModelId("")
                    setModelName("")
                  }}
                  matches={brandMatches}
                  onSelect={(b) => {
                    setBrandId(b.id)
                    setBrandName(b.name)
                    setModelId("")
                    setModelName("")
                  }}
                  createLabel={
                    brandName.trim() &&
                    !brandMatches.some((b) => b.name.toLowerCase() === brandName.trim().toLowerCase())
                      ? `Создать бренд «${brandName.trim()}»`
                      : undefined
                  }
                  onCreate={createBrandInline}
                  creating={creatingBrand}
                />

                <AutocompleteField<CatalogueModel>
                  label="Модель"
                  required
                  placeholder={brandId ? "Например: Camry" : "Сначала выберите бренд"}
                  value={modelName}
                  disabled={!brandId}
                  onValueChange={(v) => {
                    setModelName(v)
                    setModelId("")
                  }}
                  matches={modelMatches}
                  onSelect={(m) => {
                    setModelId(m.id)
                    setModelName(m.name)
                  }}
                  createLabel={
                    brandId &&
                    modelName.trim() &&
                    !modelMatches.some((m) => m.name.toLowerCase() === modelName.trim().toLowerCase())
                      ? `Создать модель «${modelName.trim()}»`
                      : undefined
                  }
                  onCreate={createModelInline}
                  creating={creatingModel}
                />

                <div className="md:col-span-2">
                  <AutocompleteField<CatalogueType>
                    label="Тип автомобиля"
                    required
                    placeholder="Например: Седан"
                    value={typeName}
                    onValueChange={(v) => {
                      setTypeName(v)
                      setVehicleTypeId("")
                    }}
                    matches={typeMatches}
                    onSelect={(t) => {
                      setVehicleTypeId(t.id)
                      setTypeName(t.name)
                    }}
                    createLabel={
                      typeName.trim() &&
                      !typeMatches.some((t) => t.name.toLowerCase() === typeName.trim().toLowerCase())
                        ? `Создать тип «${typeName.trim()}»`
                        : undefined
                    }
                    onCreate={createTypeInline}
                    creating={creatingType}
                  />
                </div>
              </div>
            </div>

            {/* Identification */}
            <div className="grid gap-md">
              <div className="text-sm font-semibold text-foreground">Идентификаторы</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <Input
                  label="VIN"
                  placeholder="17 символов (без I, O, Q)"
                  value={vin}
                  onChange={(e) =>
                    setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "").slice(0, 17))
                  }
                />

                <Input
                  label="Госномер"
                  placeholder="Например: А123ВС77"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                />

                <Input
                  label="Пробег (км)"
                  inputMode="numeric"
                  placeholder="Например: 120000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </div>

            {/* Details */}
            <div className="grid gap-md">
              <div className="flex items-center justify-between gap-md">
                <div className="text-sm font-semibold text-foreground">Характеристики</div>
                <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
                  {showAdvanced ? "Скрыть доп. поля" : "Дополнительно"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <Input
                  label="Год выпуска"
                  inputMode="numeric"
                  placeholder="Например: 2016"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                />

                <Input
                  label="Цвет"
                  placeholder="Например: Белый"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />

                <div className="w-full flex flex-col gap-xs">
                  <label className="text-sm font-medium leading-none text-foreground">Тип двигателя</label>
                  <select
                    value={engineType}
                    onChange={(e) => setEngineType((e.target.value as EngineType) || "")}
                    className={cn(
                      "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                      "text-foreground hover:border-border/80"
                    )}
                  >
                    <option value="">Не указан</option>
                    {ENGINE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Объем двигателя (л)"
                  inputMode="decimal"
                  placeholder="Например: 2.0"
                  value={engineVolume}
                  onChange={(e) => {
                    const val = e.target.value.replace(",", ".")
                    const normalized = val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                    setEngineVolume(normalized)
                  }}
                />

                {showAdvanced && (
                  <>
                    <Input
                      label="Дата последнего ТО"
                      type="date"
                      value={lastServiceDate}
                      onChange={(e) => setLastServiceDate(e.target.value)}
                    />
                    <Input
                      label="Дата следующего ТО"
                      type="date"
                      value={nextServiceDate}
                      onChange={(e) => setNextServiceDate(e.target.value)}
                    />

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium leading-none text-foreground">Примечания</label>
                      <textarea
                        placeholder="Опции, комментарии, особенности"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={cn(
                          "mt-xs w-full rounded-md border border-input bg-background text-sm px-md py-sm",
                          "placeholder:text-muted-foreground hover:border-border/80"
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-lg">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Создание…" : "Создать ТС"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerCreateDialog
        open={openCustomerCreate}
        onOpenChange={setOpenCustomerCreate}
        onCreated={afterCreateCustomer}
      />
    </>
  )
}
