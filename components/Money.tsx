export default function Money({ value }: { value: number }) {
  return (
    <span>
      {value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}
    </span>
  )
}
