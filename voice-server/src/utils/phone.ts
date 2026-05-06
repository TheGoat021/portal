export function normalizePhone(phone?: string | null) {
  if (!phone) return ""

  const digits = String(phone).replace(/\D/g, "")
  if (!digits) return ""

  if (digits.startsWith("55")) {
    return digits
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`
  }

  return digits
}

export function buildPhoneVariants(phone?: string | null) {
  const normalized = normalizePhone(phone)
  if (!normalized) return []

  const variants = new Set<string>()
  variants.add(normalized)

  if (normalized.startsWith("55")) {
    const withoutCountry = normalized.slice(2)
    variants.add(withoutCountry)

    if (withoutCountry.length === 11 && withoutCountry[2] === "9") {
      const withoutMobileNine =
        withoutCountry.slice(0, 2) + withoutCountry.slice(3)
      variants.add(withoutMobileNine)
      variants.add(`55${withoutMobileNine}`)
    }
  } else {
    variants.add(`55${normalized}`)
  }

  return Array.from(variants)
}

export function formatPhone(phone?: string | null) {
  const normalized = normalizePhone(phone)
  if (!normalized) return ""

  const national = normalized.startsWith("55")
    ? normalized.slice(2)
    : normalized

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`
  }

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
  }

  return normalized
}
