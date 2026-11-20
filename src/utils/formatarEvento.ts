export function parseData(data: string): Date {
  return new Date(`${data}T00:00:00`);
}

export function formatarMes(data: Date): string {
  return data
    .toLocaleDateString('pt-BR', { month: 'short' })
    .toUpperCase()
    .replace('.', '');
}

export function formatarHora(hora?: string | null): string {
  if (!hora) return '';
  const [horas, minutos] = hora.split(':');
  return minutos === '00' ? `${parseInt(horas, 10)}h` : `${horas}:${minutos}`;
}

export function formatarDataCompleta(data: Date): string {
  const texto = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1); // "Sexta-feira, 12 de junho de 2026"
}

/** "20" → "R$ 20,00"; vazio ou 0 → "Gratuita"; texto livre passa direto. */
export function formatarEntrada(entrada?: string | null): string {
  const valor = entrada?.trim();
  if (!valor) return 'Gratuita';

  const numero = Number(valor.replace(',', '.'));
  if (Number.isNaN(numero)) return valor;
  if (numero === 0) return 'Gratuita';

  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}