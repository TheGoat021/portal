export default function OrigemBadge({ origem }: { origem: string }) {
  const colors: any = {
    Google: 'bg-green-100 text-green-700',
    Meta: 'bg-blue-100 text-blue-700',
    Indicação: 'bg-gray-100 text-gray-700'
  }

  return (
    <span className={`px-2 py-1 rounded text-sm ${colors[origem]}`}>
      {origem}
    </span>
  )
}
